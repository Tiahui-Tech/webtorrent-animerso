module.exports = {
  init
}

const { autoUpdater } = require('electron-updater')

const log = require('./log')
const windows = require('./windows')

// TODO: Implement auto-updater
function init() {
  initDarwinWin32()
}

function initDarwinWin32() {
  autoUpdater.on(
    'error',
    (err) => log.error(`Update error: ${err.message}`)
  )

  autoUpdater.on(
    'checking-for-update',
    () => log('Checking for update')
  )

  autoUpdater.on(
    'update-available',
    () => {
      log('Update available')
    }
  )

  autoUpdater.on(
    'update-not-available',
    () => log('No update available')
  )

  autoUpdater.on(
    'update-downloaded',
    (e) => {
      log('Update downloaded:', e)
      windows.main.dispatch('updateDownloaded')
    }
  )

  autoUpdater.checkForUpdates()
}
