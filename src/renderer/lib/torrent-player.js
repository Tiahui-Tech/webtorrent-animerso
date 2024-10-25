module.exports = {
  isPlayable,
  isVideo,
  isAudio,
  isTorrent,
  isMagnetLink,
  isPlayableTorrentSummary,
  playTorrent
}

const path = require('path')
const { dispatch } = require('./dispatcher');
const mediaExtensions = require('./media-extensions')
const { sendNotification } = require('./errors')

// Checks whether a fileSummary or file path is audio/video that we can play,
// based on the file extension
function isPlayable(file) {
  return isVideo(file) || isAudio(file)
}

// Checks whether a fileSummary or file path is playable video
function isVideo(file) {
  return mediaExtensions.video.includes(getFileExtension(file))
}

// Checks whether a fileSummary or file path is playable audio
function isAudio(file) {
  return mediaExtensions.audio.includes(getFileExtension(file))
}

// Checks if the argument is either:
// - a string that's a valid filename ending in .torrent
// - a file object where obj.name is ends in .torrent
// - a string that's a magnet link (magnet://...)
function isTorrent(file) {
  return isTorrentFile(file) || isMagnetLink(file)
}

function isTorrentFile(file) {
  return getFileExtension(file) === '.torrent'
}

function isMagnetLink(link) {
  return typeof link === 'string' && /^(stream-)?magnet:/.test(link)
}

function getFileExtension(file) {
  const name = typeof file === 'string' ? file : file?.name || 'Anime Name'
  return path.extname(name).toLowerCase()
}

function isPlayableTorrentSummary(torrentSummary) {
  return torrentSummary.files && torrentSummary.files.some(isPlayable)
}

function playTorrent(anime, state, setIsLoading) {
  const torrentData = anime?.torrent;

  try {
    const hash = torrentData?.infoHash || torrentData?.infohash || torrentData?.hash;
    const torrent = state.saved.torrents.find(
      (torrent) => torrent.infoHash === hash
    );
    const torrentUrl = torrentData?.torrentUrl || torrentData?.magnetUrl || torrentData?.link;

    const playQuery = { infoHash: hash, animeData: anime };

    if (!torrentUrl || !hash) {
      throw new Error('Episodio no disponible.');
    }

    if (!torrent) {
      dispatch('addTorrent', torrentUrl);

      // Wait 5 seconds to avoid errors and allow backend to prepare the torrent
      setTimeout(() => {
        dispatch('playFile', playQuery);
        setIsLoading(null);
      }, 5000);

      return;
    }

    const file = torrent.files.at(0);
    const isTorrentPlayable = isPlayable(file);

    if (isTorrentPlayable) {
      dispatch('toggleSelectTorrent', torrent.infoHash);
      dispatch('playFile', playQuery);

      setIsLoading(null);
    } else {
      // Check if the torrent is playable every second
      const checkPlayableInterval = setInterval(() => {
        const updatedTorrent = state.saved.torrents.find(
          (t) => t.infoHash === hash
        );
        if (updatedTorrent && updatedTorrent.files.some(isPlayable)) {
          clearInterval(checkPlayableInterval);
          dispatch('toggleSelectTorrent', updatedTorrent.infoHash);
          dispatch('playFile', playQuery);
          setIsLoading(null);
        }
      }, 1000);

      // Set a timeout to stop checking after 60 seconds (1 minute)
      setTimeout(() => {
        clearInterval(checkPlayableInterval);
        setIsLoading(null);
        console.log('Timeout: Torrent not playable after 1 minute');
      }, 60000);
    }

  } catch (error) {
    sendNotification(state, { message: error.message, title: 'Error al reproducir' });
    setIsLoading(null);
  }
};
