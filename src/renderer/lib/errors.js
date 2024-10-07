const ExtendableError = require('es6-error')

/* Generic errors */

class CastingError extends ExtendableError { }
class PlaybackError extends ExtendableError { }
class SoundError extends ExtendableError { }
class TorrentError extends ExtendableError { }

/* Playback */

class UnplayableTorrentError extends PlaybackError {
  constructor() { super('Can\'t play any files in torrent') }
}

class UnplayableFileError extends PlaybackError {
  constructor() { super('Can\'t play that file') }
}

/* Sound */

class InvalidSoundNameError extends SoundError {
  constructor(name) { super(`Invalid sound name: ${name}`) }
}

/* Torrent */

class TorrentKeyNotFoundError extends TorrentError {
  constructor(torrentKey) { super(`Can't resolve torrent key ${torrentKey}`) }
}

/* Global */

const sendNotification = (state, { message, title = 'Ha ocurrido un error...', type = 'error' }) => {
  state.errors.push({
    time: new Date().getTime(),
    message,
    title,
    type
  });
}

module.exports = {
  CastingError,
  PlaybackError,
  SoundError,
  TorrentError,
  UnplayableTorrentError,
  UnplayableFileError,
  InvalidSoundNameError,
  TorrentKeyNotFoundError,
  sendNotification
}
