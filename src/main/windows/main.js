const main = module.exports = {
  dispatch,
  hide,
  init,
  send,
  setAspectRatio,
  setBounds,
  setProgress,
  setTitle,
  show,
  toggleAlwaysOnTop,
  toggleDevTools,
  toggleFullScreen,
  win: null,
  initDiscordRPC,
  updateDiscordRPC
}

const { app, BrowserWindow, screen, ipcMain, autoUpdater } = require('electron')
const debounce = require('debounce')
const DiscordRPC = require('discord-rpc')

const config = require('../../config')
const log = require('../log')
const menu = require('../menu')

const discordClientId = '1297080240736309348'
let rpc

const initialTimestamp = new Date().getTime()

function init(state, options) {
  if (main.win) {
    return main.win.show()
  }

  const initialBounds = Object.assign(config.WINDOW_INITIAL_BOUNDS, state.saved.bounds)

  const win = main.win = new BrowserWindow({
    backgroundColor: '#282828',
    darkTheme: true, // Forces dark theme (GTK+3)
    height: initialBounds.height,
    icon: getIconPath(), // Window icon (Windows, Linux)
    minHeight: config.WINDOW_MIN_HEIGHT,
    minWidth: config.WINDOW_MIN_WIDTH,
    show: false,
    title: config.APP_WINDOW_TITLE,
    titleBarStyle: 'hiddenInset', // Hide title bar (Mac)
    useContentSize: true, // Specify web page size without OS chrome
    width: initialBounds.width,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableBlinkFeatures: 'AudioVideoTracks',
      enableRemoteModule: true,
      backgroundThrottling: false
    },
    x: initialBounds.x,
    y: initialBounds.y
  })
  // Extra validation to ensure the window is not smaller than the minimum size
  win.setMinimumSize(config.WINDOW_MIN_WIDTH, config.WINDOW_MIN_HEIGHT)
  require('@electron/remote/main').enable(win.webContents)

  win.loadURL(config.WINDOW_MAIN)

  win.once('ready-to-show', () => {
    if (!options.hidden) win.show()
  })

  if (win.setSheetOffset) {
    win.setSheetOffset(config.UI_HEADER_HEIGHT)
  }

  win.webContents.on('dom-ready', () => {
    menu.onToggleFullScreen(main.win.isFullScreen())
  })

  win.webContents.on('will-navigate', (e) => {
    // Prevent drag-and-drop from navigating the Electron window, which can happen
    // before our drag-and-drop handlers have been initialized.
    e.preventDefault()
  })

  win.on('blur', onWindowBlur)
  win.on('focus', onWindowFocus)

  win.on('hide', onWindowBlur)
  win.on('show', onWindowFocus)

  win.on('enter-full-screen', () => {
    menu.onToggleFullScreen(true)
    send('fullscreenChanged', true)
    win.setMenuBarVisibility(false)
  })

  win.on('leave-full-screen', () => {
    menu.onToggleFullScreen(false)
    send('fullscreenChanged', false)
    win.setMenuBarVisibility(true)
  })

  win.on('move', debounce(e => {
    send('windowBoundsChanged', main.win.getBounds())
  }, 1000))

  win.on('resize', debounce(e => {
    const bounds = main.win.getBounds()
    if (bounds.height < config.WINDOW_MIN_HEIGHT || bounds.width < config.WINDOW_MIN_WIDTH) {
      main.win.setMinimumSize(config.WINDOW_MIN_WIDTH, config.WINDOW_MIN_HEIGHT)
      main.win.setBounds({
        width: Math.max(bounds.width, config.WINDOW_MIN_WIDTH),
        height: Math.max(bounds.height, config.WINDOW_MIN_HEIGHT),
        x: bounds.x,
        y: bounds.y
      })
    }
    send('windowBoundsChanged', main.win.getBounds())
  }, 1000))

  win.on('close', e => {
    if (process.platform !== 'darwin') {
      if (rpc) rpc.destroy()
      return app.quit()
    }
    if (!app.isQuitting) {
      e.preventDefault()
      hide()
    }
  })

  // Initialize Discord RPC
  initDiscordRPC()

  // Add IPC handler for quit and install
  ipcMain.on('quitAndInstall', () => {
    app.isQuitting = true
    autoUpdater.quitAndInstall()
  })
}

function dispatch(...args) {
  send('dispatch', ...args)
}

function hide() {
  if (!main.win) return
  dispatch('backToList')
  main.win.hide()
}

function send(...args) {
  if (!main.win) return
  main.win.send(...args)
}

/**
 * Enforce window aspect ratio. Remove with 0. (Mac)
 */
function setAspectRatio(aspectRatio) {
  if (!main.win) return
  main.win.setAspectRatio(aspectRatio)
}

/**
 * Change the size of the window.
 * TODO: Clean this up? Seems overly complicated.
 */
function setBounds(bounds, maximize) {
  // Do nothing in fullscreen
  if (!main.win || main.win.isFullScreen()) {
    log('setBounds: not setting bounds because already in full screen mode')
    return
  }

  // Maximize or minimize, if the second argument is present
  if (maximize === true && !main.win.isMaximized()) {
    log('setBounds: maximizing')
    main.win.maximize()
  } else if (maximize === false && main.win.isMaximized()) {
    log('setBounds: minimizing')
    main.win.unmaximize()
  }

  const willBeMaximized = typeof maximize === 'boolean' ? maximize : main.win.isMaximized()
  // Assuming we're not maximized or maximizing, set the window size
  if (!willBeMaximized) {
    log(`setBounds: setting bounds to ${JSON.stringify(bounds)}`)
    if (bounds.x === null && bounds.y === null) {
      // X and Y not specified? By default, center on current screen
      const scr = screen.getDisplayMatching(main.win.getBounds())
      bounds.x = Math.round(scr.bounds.x + (scr.bounds.width / 2) - (bounds.width / 2))
      bounds.y = Math.round(scr.bounds.y + (scr.bounds.height / 2) - (bounds.height / 2))
      log(`setBounds: centered to ${JSON.stringify(bounds)}`)
    }
    // Resize the window's content area (so window border doesn't need to be taken
    // into account)
    if (bounds.contentBounds) {
      main.win.setContentBounds(bounds, true)
    } else {
      main.win.setBounds(bounds, true)
    }
  } else {
    log('setBounds: not setting bounds because of window maximization')
  }
}

/**
 * Set progress bar to [0, 1]. Indeterminate when > 1. Remove with < 0.
 */
function setProgress(progress) {
  if (!main.win) return
  main.win.setProgressBar(progress)
}

function setTitle(title) {
  if (!main.win) return
  main.win.setTitle(title)
}

function show() {
  if (!main.win) return
  main.win.show()
}

// Sets whether the window should always show on top of other windows
function toggleAlwaysOnTop(flag) {
  if (!main.win) return
  if (flag == null) {
    flag = !main.win.isAlwaysOnTop()
  }
  log(`toggleAlwaysOnTop ${flag}`)
  main.win.setAlwaysOnTop(flag)
  menu.onToggleAlwaysOnTop(flag)
}

function toggleDevTools() {
  if (!main.win) return
  log('toggleDevTools')
  if (main.win.webContents.isDevToolsOpened()) {
    main.win.webContents.closeDevTools()
  } else {
    main.win.webContents.openDevTools({ mode: 'detach' })
  }
}

function toggleFullScreen() {
  if (!main.win || !main.win.isVisible()) {
    return
  }

  const newFullScreenState = !main.win.isFullScreen()

  if (newFullScreenState) {
    // Fullscreen and aspect ratio do not play well together. (Mac)
    main.win.setAspectRatio(0)
  }

  main.win.setFullScreen(newFullScreenState)
}

function onWindowBlur() {
  menu.setWindowFocus(false)

  if (process.platform !== 'darwin') {
    const tray = require('../tray')
    tray.setWindowFocus(false)
  }
}

function onWindowFocus() {
  menu.setWindowFocus(true)

  if (process.platform !== 'darwin') {
    const tray = require('../tray')
    tray.setWindowFocus(true)
  }
}

function getIconPath() {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}

const defaultStatus = {
  activity: {
    details: 'En el inicio',
    instance: true,
    type: 3
  }
}

function initDiscordRPC() {
  rpc = new DiscordRPC.Client({ transport: 'ipc' })

  rpc.on('ready', () => {
    updateDiscordRPC(defaultStatus)
  })

  loginRPC()
}

function loginRPC() {
  rpc.login({ clientId: discordClientId }).catch(() => {
    setTimeout(() => loginRPC(), 5000).unref()
  })
}

function updateDiscordRPC(params = {}) {
  debounce(setDiscordRPC, 1500)(params)
}

function setDiscordRPC(params = {}) {
  if (!rpc) return

  const defaultActivityData = {
    instance: true,
    type: 3,
    timestamps: {
      start: initialTimestamp
    },
    buttons: [
      {
        label: 'Descarga la App',
        url: 'https://www.animeton.com/'
      }
    ],
    assets: {
      large_image: 'animeton'
    }
  };

  const activityData = {
    ...defaultActivityData,
    ...params,
    timestamps: { ...defaultActivityData.timestamps, ...params.timestamps },
    buttons: params.buttons || defaultActivityData.buttons,
    assets: { ...defaultActivityData.assets, ...params.assets }
  };

  rpc.request('SET_ACTIVITY', { activity: activityData, pid: process.pid })
}
