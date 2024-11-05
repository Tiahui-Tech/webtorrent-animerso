console.time('init')

require('@electron/remote/main').initialize()
const { app, webContents, ipcMain } = require('electron')
const { autoUpdater } = require('electron-updater')
const eLog = require('electron-log')

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
const tray = require('./tray')

const WEBTORRENT_VERSION = require('webtorrent/package.json').version

let shouldQuit = false
let argv = sliceArgv(process.argv)
eLog.initialize()

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

    // Report uncaught exceptions and restart app
    process.on('uncaughtException', (err) => {
      console.error(err)
      const error = { message: err.message, stack: err.stack }
      eLog.error('Uncaught exception:', error)
      
      // Notify main window before restarting
      try {
        windows.main.dispatch('uncaughtError', 'main', error)
      } catch (e) {
        eLog.error('Failed to dispatch error to window:', e)
      }

      // Wait a bit to ensure logs are written
      setTimeout(() => {
        eLog.info('Restarting app after uncaught exception...')
        app.relaunch()
        app.exit(1)
      }, 1000)
    })

    // Handle promise rejections similarly
    process.on('unhandledRejection', (reason, promise) => {
      eLog.error('Unhandled rejection at:', promise, 'reason:', reason)
      
      setTimeout(() => {
        eLog.info('Restarting app after unhandled rejection...')
        app.relaunch()
        app.exit(1)
      }, 1000)
    })

    // Handle uncaught errors from renderer
    ipcMain.on('uncaughtError', (event, error) => {
      eLog.error('Uncaught error from renderer:', error);
      
      // Notify main window before restarting
      try {
        windows.main.dispatch('uncaughtError', 'renderer', error);
      } catch (e) {
        eLog.error('Failed to dispatch error to window:', e);
      }

      // Wait a bit to ensure logs are written
      setTimeout(() => {
        eLog.info('Restarting app after uncaught error...');
        app.relaunch();
        app.exit(1);
      }, 1000);
    });
  }

  // Enable app logging into default directory, i.e. /Library/Logs/WebTorrent
  // on Mac, %APPDATA% on Windows, $XDG_CONFIG_HOME or ~/.config on Linux.
  app.setAppLogsPath()

  app.userAgentFallback = `WebTorrent/${WEBTORRENT_VERSION} (https://webtorrent.io)`

  app.on('open-file', onOpen)
  app.on('open-url', onOpen)

  ipc.init()

  app.once('ipcReady', () => {
    eLog.info('App ipc ready')
    log('Command line args:', argv)
    processArgv(argv)
    console.timeEnd('init')
  })

  app.on('before-quit', async (e) => {
    if (app.isQuitting) return

    e.preventDefault()
    eLog.info('App before quit')
    app.isQuitting = true

    if (windows.main.rpc) {
      eLog.info('Destroying Discord RPC')
      windows.main.rpc.destroy()
    }

    eLog.info('Stopping auto updater')
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false

    try {
      autoUpdater.quitAndInstall(false, true)
    } catch (e) {
      eLog.info('No updates pending installation')
    }

    eLog.info('App destroying tray')
    tray.destroy()

    setTimeout(() => {
      webContents.getAllWebContents().forEach(wc => {
        wc.close()
        wc.delete()
      })
    }, 2000)
  })

  app.on('activate', () => {
    eLog.info('App activate')
    if (isReady) windows.main.show()
  })

  // Add crash handler
  app.on('render-process-gone', (event, webContents, details) => {
    eLog.error('App crashed:', details.reason)
    
    // Force restart app on crash
    if (details.reason === 'crashed' || details.reason === 'killed') {
      eLog.info('Restarting app after crash...')
      app.relaunch()
      app.exit(0)
    }
  })

  // Handle unresponsive window
  app.on('window-all-closed', () => {
    eLog.info('App window all closed')
    app.quit()
  })
}

function delayedInit(state) {
  if (app.isQuitting) return

  const announcement = require('./announcement')
  const dock = require('./dock')
  const updater = require('./updater')
  const FolderWatcher = require('./folder-watcher')
  const folderWatcher = new FolderWatcher({ window: windows.main, state })

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
