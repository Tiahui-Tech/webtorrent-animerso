const appConfig = require('application-config')('WebTorrent')
const path = require('path')
const { app } = require('electron')
const arch = require('arch')

const APP_NAME = 'Animeton'
const APP_TEAM = 'Tiahui Tech'
const APP_VERSION = require('../package.json').version

const IS_TEST = isTest()
const PORTABLE_PATH = IS_TEST
  ? path.join(process.platform === 'win32' ? 'C:\\Windows\\Temp' : '/tmp', 'WebTorrentTest')
  : path.join(path.dirname(process.execPath), 'Portable Settings')
const IS_PRODUCTION = isProduction()
const IS_PORTABLE = isPortable()

const UI_HEADER_HEIGHT = 38
const UI_TORRENT_HEIGHT = 100

module.exports = {
  AUTO_UPDATE_URL: `https://updates.animeton.com/update/${process.platform}/${APP_VERSION}`,

  APP_COPYRIGHT: `Copyright © 2024-${new Date().getFullYear()} ${APP_TEAM}`,
  APP_FILE_ICON: path.join(__dirname, '..', 'static', 'assets', 'animeton_file'),
  APP_ICON: path.join(__dirname, '..', 'static', 'assets', 'animeton'),
  APP_NAME,
  APP_TEAM,
  APP_VERSION,
  APP_WINDOW_TITLE: APP_NAME,

  CONFIG_PATH: getConfigPath(),

  DEFAULT_TORRENTS: [],

  DELAYED_INIT: 3000 /* 3 seconds */,

  DEFAULT_DOWNLOAD_PATH: getDefaultDownloadPath(),

  GITHUB_URL: 'https://github.com/webtorrent/webtorrent-desktop',
  GITHUB_URL_ISSUES: 'https://github.com/webtorrent/webtorrent-desktop/issues',
  GITHUB_URL_RAW: 'https://raw.githubusercontent.com/webtorrent/webtorrent-desktop/master',
  GITHUB_URL_RELEASES: 'https://github.com/webtorrent/webtorrent-desktop/releases',

  HOME_PAGE_URL: 'https://webtorrent.io',
  TWITTER_PAGE_URL: 'https://twitter.com/WebTorrentApp',

  IS_PORTABLE,
  IS_PRODUCTION,
  IS_TEST,

  OS_SYSARCH: arch() === 'x64' ? 'x64' : 'ia32',

  POSTER_PATH: path.join(getConfigPath(), 'Posters'),
  ROOT_PATH: path.join(__dirname, '..'),
  STATIC_PATH: path.join(__dirname, '..', 'static'),
  TORRENT_PATH: path.join(getConfigPath(), 'Torrents'),

  WINDOW_ABOUT: 'file://' + path.join(__dirname, '..', 'static', 'about.html'),
  WINDOW_MAIN: 'file://' + path.join(__dirname, '..', 'static', 'main.html'),
  WINDOW_WEBTORRENT: 'file://' + path.join(__dirname, '..', 'static', 'webtorrent.html'),

  WINDOW_INITIAL_BOUNDS: {
    width: 1600,
    height: 900
  },
  WINDOW_MIN_HEIGHT: 500,
  WINDOW_MIN_WIDTH: 1260,

  UI_HEADER_HEIGHT,
  UI_TORRENT_HEIGHT
}

function getConfigPath() {
  if (IS_PORTABLE) {
    return PORTABLE_PATH
  } else {
    return path.dirname(appConfig.filePath)
  }
}

function getDefaultDownloadPath() {
  if (IS_PORTABLE) {
    return path.join(getConfigPath(), 'Downloads')
  } else {
    return getPath('downloads')
  }
}

function getPath(key) {
  if (!process.versions.electron) {
    // Node.js process
    return ''
  } else if (process.type === 'renderer') {
    // Electron renderer process
    return require('@electron/remote').app.getPath(key)
  } else {
    // Electron main process
    return app.getPath(key)
  }
}

function isTest() {
  return process.env.NODE_ENV === 'test'
}

function isPortable() {
  if (IS_TEST) {
    return true
  }

  if (process.platform !== 'win32' || !IS_PRODUCTION) {
    // Fast path: Non-Windows platforms should not check for path on disk
    return false
  }

  const fs = require('fs')

  try {
    // This line throws if the "Portable Settings" folder does not exist, and does
    // nothing otherwise.
    fs.accessSync(PORTABLE_PATH, fs.constants.R_OK | fs.constants.W_OK)
    return true
  } catch (err) {
    return false
  }
}

function isProduction() {
  if (!process.versions.electron) {
    // Node.js process
    return false
  }
  if (process.platform === 'darwin') {
    return !/\/Electron\.app\//.test(process.execPath)
  }
  if (process.platform === 'win32') {
    return !/\\electron\.exe$/.test(process.execPath)
  }
  if (process.platform === 'linux') {
    return !/\/electron$/.test(process.execPath)
  }
}
