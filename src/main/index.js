console.time('init')

require('@electron/remote/main').initialize()
const { app, ipcMain, webContents } = require('electron')
const { autoUpdater } = require('electron-updater')

// Start crash reporter early, so it takes effect for child processes
const crashReporter = require('../crash-reporter')
crashReporter.init()

const parallel = require('run-parallel')

const config = require('../config')
const ipc = require('./ipc')
const log = require('./log')
const menu = require('./menu')
const State = require('../renderer/lib/state')
const windows = require('./windows')

const WEBTORRENT_VERSION = require('webtorrent/package.json').version

let shouldQuit = false
let argv = sliceArgv(process.argv)

app.setAppUserModelId(config.APP_ID)

// allow electron/chromium to play startup sounds (without user interaction)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

// Start the app without showing the main window when auto launching on login
// (On Windows and Linux, we get a flag. On MacOS, we get special API.)
const hidden = argv.includes('--hidden') ||
  (process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden)

if (config.IS_PRODUCTION) {
  // When Electron is running in production mode (packaged app), then run React
  // in production mode too.
  process.env.NODE_ENV = 'production'
}

if (process.platform === 'win32') {
  const squirrelWin32 = require('./squirrel-win32')
  shouldQuit = squirrelWin32.handleEvent(argv[0])
  argv = argv.filter((arg) => !arg.includes('--squirrel'))
}

if (!shouldQuit && !config.IS_PORTABLE) {
  // Prevent multiple instances of app from running at same time. New instances
  // signal this instance and quit. Note: This feature creates a lock file in
  // %APPDATA%\Roaming\WebTorrent so we do not do it for the Portable App since
  // we want to be "silent" as well as "portable".
  if (!app.requestSingleInstanceLock()) {
    shouldQuit = true
  }
}

if (shouldQuit) {
  app.quit()
} else {
  init()
}

function init() {
  app.on('second-instance', (event, commandLine, workingDirectory) => onAppOpen(commandLine))
  if (config.IS_PORTABLE) {
    const path = require('path')
    app.setPath('userData', config.CONFIG_PATH)
    app.setPath('temp', path.join(config.CONFIG_PATH, 'Temp'))
  }

  let isReady = false // app ready, windows can be created
  app.ipcReady = false // main window has finished loading and IPC is ready
  app.isQuitting = false

  parallel({
    appReady: (cb) => app.on('ready', () => cb(null)),
    state: (cb) => State.load(cb)
  }, onReady)

  function onReady(err, results) {
    if (err) throw err

    isReady = true
    const state = results.state

    menu.init()
    windows.main.init(state, { hidden })
    windows.webtorrent.init()

    // windows.main.toggleDevTools()

    // To keep app startup fast, some code is delayed.
    setTimeout(() => {
      delayedInit(state)
    }, config.DELAYED_INIT)

    // Report uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error(err)
      const error = { message: err.message, stack: err.stack }
      windows.main.dispatch('uncaughtError', 'main', error)
    })
  }

  // Enable app logging into default directory, i.e. /Library/Logs/WebTorrent
  // on Mac, %APPDATA% on Windows, $XDG_CONFIG_HOME or ~/.config on Linux.
  app.setAppLogsPath()

  app.userAgentFallback = `WebTorrent/${WEBTORRENT_VERSION} (https://webtorrent.io)`

  app.on('open-file', onOpen)
  app.on('open-url', onOpen)

  ipc.init()

  app.once('ipcReady', () => {
    log('Command line args:', argv)
    processArgv(argv)
    console.timeEnd('init')
  })

  app.on('before-quit', e => {
    app.isQuitting = true
    tray.destroy()

    autoUpdater.removeAllListeners()
    autoUpdater.off('error', log)
    autoUpdater.off('checking-for-update', log)
    autoUpdater.off('update-available', log)
    autoUpdater.off('update-not-available', log)
    autoUpdater.off('update-downloaded', log)

    windows.main.dispatch('stateSaveImmediate')
    ipcMain.once('stateSaved', () => app.exit())
    setTimeout(() => {
      webContents.getAllWebContents().forEach(wc => {
        wc.close()
        wc.delete()
      })
    }, 2000)
  })

  app.on('will-quit', () => {
    app.exit()
    process.disconnect()
    process.exit()
  })

  app.on('window-all-closed', () => {
    app.isQuitting = true
    app.quit()
  })

  app.on('activate', () => {
    if (isReady) windows.main.show()
  })
}

function delayedInit(state) {
  if (app.isQuitting) return

  const announcement = require('./announcement')
  const dock = require('./dock')
  const updater = require('./updater')
  const FolderWatcher = require('./folder-watcher')
  const folderWatcher = new FolderWatcher({ window: windows.main, state })
  const tray = require('./tray')

  announcement.init()
  dock.init()
  updater.init()
  tray.init()

  ipc.setModule('folderWatcher', folderWatcher)
  if (folderWatcher.isEnabled()) {
    folderWatcher.start()
  }
}

function onOpen(e, torrentId) {
  e.preventDefault()

  if (app.ipcReady) {
    // Magnet links opened from Chrome won't focus the app without a setTimeout.
    // The confirmation dialog Chrome shows causes Chrome to steal back the focus.
    // Electron issue: https://github.com/atom/electron/issues/4338
    setTimeout(() => windows.main.show(), 100)

    processArgv([torrentId])
  } else {
    argv.push(torrentId)
  }
}

function onAppOpen(newArgv) {
  newArgv = sliceArgv(newArgv)

  if (app.ipcReady) {
    log('Second app instance opened, but was prevented:', newArgv)
    windows.main.show()

    processArgv(newArgv)
  } else {
    argv.push(...newArgv)
  }
}

// Remove leading args.
// Production: 1 arg, eg: /Applications/WebTorrent.app/Contents/MacOS/WebTorrent
// Development: 2 args, eg: electron .
// Test: 4 args, eg: electron -r .../mocks.js .
function sliceArgv(argv) {
  return argv.slice(
    config.IS_PRODUCTION
      ? 1
      : config.IS_TEST
        ? 4
        : 2
  )
}

function processArgv(argv) {
  const torrentIds = []
  argv.forEach(arg => {
    if (arg === '-n' || arg === '-o' || arg === '-u') {
      const dialog = require('./dialog')
      if (arg === '-n') {
        dialog.openSeedDirectory()
      } else if (arg === '-o') {
        dialog.openTorrentFile()
      } else if (arg === '-u') {
        dialog.openTorrentAddress()
      }
    } else if (arg === '--hidden') {
      // Ignore hidden argument, already being handled
    } else if (arg.startsWith('-psn')) {
      // Ignore Mac launchd "process serial number" argument
      // Issue: https://github.com/webtorrent/webtorrent-desktop/issues/214
    } else if (arg.startsWith('--')) {
      // Ignore Spectron flags
    } else if (arg === 'data:,') {
      // Ignore weird Spectron argument
    } else if (arg !== '.') {
      // Ignore '.' argument, which gets misinterpreted as a torrent id, when a
      // development copy of WebTorrent is started while a production version is
      // running.
      torrentIds.push(arg)
    }
  })
  if (torrentIds.length > 0) {
    windows.main.dispatch('onOpen', torrentIds)
  }
}
