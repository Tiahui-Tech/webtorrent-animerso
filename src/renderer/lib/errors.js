const ExtendableError = require('es6-error')

/* Generic errors */

class CastingError extends ExtendableError { }
class PlaybackError extends ExtendableError { }
class SoundError extends ExtendableError { }
class TorrentError extends ExtendableError { }

/* Playback */

class UnplayableTorrentError extends PlaybackError {
  constructor() { super('No se pudo reproducir ningún archivo en el torrent') }
}

class UnplayableFileError extends PlaybackError {
  constructor() { super('No se pudo reproducir el episodio') }
}

/* Sound */

class InvalidSoundNameError extends SoundError {
  constructor(name) { super(`Nombre de sonido inválido: ${name}`) }
}

/* Torrent */

class TorrentKeyNotFoundError extends TorrentError {
  constructor(torrentKey) { super(`No se pudo resolver la clave del torrent ${torrentKey}`) }
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
