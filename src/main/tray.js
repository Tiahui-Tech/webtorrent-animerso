module.exports = {
  hasTray,
  init,
  setWindowFocus,
  destroy
}

const { app, Tray, Menu } = require('electron')

const config = require('../config')
const windows = require('./windows')

let tray

function init () {
  if (process.platform === 'linux') {
    initLinux()
  }
  if (process.platform === 'win32') {
    initWin32()
  }
  // Mac apps generally do not have menu bar icons
}

/**
 * Returns true if there a tray icon is active.
 */
function hasTray () {
  return !!tray
}

function setWindowFocus (flag) {
  if (!tray) return
  updateTrayMenu()
}

function initLinux () {
  checkLinuxTraySupport(err => {
    if (!err) createTray()
  })
}

function initWin32 () {
  createTray()
}

/**
 * Check for libappindicator support before creating tray icon.
 */
function checkLinuxTraySupport (cb) {
  const cp = require('child_process')

  // Check that libappindicator libraries are installed in system.
  cp.exec('ldconfig -p | grep libappindicator', (err, stdout) => {
    if (err) return cb(err)
    cb(null)
  })
}

function createTray () {
  tray = new Tray(getIconPath())

  // On Windows, left click opens the app, right click opens the context menu.
  // On Linux, any click (left or right) opens the context menu.
  tray.on('click', () => windows.main.show())

  // Show the tray context menu, and keep the available commands up to date
  updateTrayMenu()
}

function updateTrayMenu () {
  const contextMenu = Menu.buildFromTemplate(getMenuTemplate())
  tray.setContextMenu(contextMenu)
}

function destroy () {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

function getMenuTemplate () {
  return [
    getToggleItem(),
    {
      label: 'Salir',
      click: () => app.quit()
    }
  ]

  function getToggleItem () {
    if (windows.main.win.isVisible()) {
      return {
        label: 'Ocultar',
        click: () => windows.main.hide()
      }
    } else {
      return {
        label: 'Mostrar Animeton',
        click: () => windows.main.show()
      }
    }
  }
}

function getIconPath () {
  return process.platform === 'win32'
    ? config.APP_ICON + '.ico'
    : config.APP_ICON + '.png'
}
