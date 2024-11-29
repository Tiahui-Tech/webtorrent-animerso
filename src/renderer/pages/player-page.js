/* globals MediaMetadata */

const React = require('react');
const { useEffect, useState, useRef, useCallback } = React;
const { useLocation } = require('react-router-dom');
const { AnimatePresence, motion } = require('framer-motion');
const { Icon } = require('@iconify/react');

const remote = require('@electron/remote')
const BitField = require('bitfield').default;
const prettyBytes = require('prettier-bytes');

const useCanvasRpcFrame = require('../hooks/useCanvasRpcFrame');
const useApiSubtitles = require('../hooks/useApiSubtitles');

const TorrentSummary = require('../lib/torrent-summary');
const Playlist = require('../lib/playlist');
const { dispatch, dispatcher } = require('../lib/dispatcher');
const config = require('../../config');
const eventBus = require('../lib/event-bus');
const { sendNotification } = require('../lib/errors');

const Spinner = require('../components/common/spinner');
const VideoSpinner = require('../components/common/video-spinner');
const SubtitleSelector = require('../components/common/video/subtitle-selector');

const anitomyscript = require('anitomyscript');

// Shows a streaming video player. Standard features + Chromecast + Airplay
function Player({ state, currentTorrent }) {
  const location = useLocation();
  const { fetchSubtitles, subtitles: apiSubtitles, isLoading: isFetchingSubtitles } = useApiSubtitles(currentTorrent?.infoHash);
  const [isMouseMoving, setIsMouseMoving] = useState(true);
  const [localSubtitles, setLocalSubtitles] = useState({ infoHash: null, tracks: [] });
  const [lastAction, setLastAction] = useState(null);
  const [forceStopSubtitles, setForceStopSubtitles] = useState(false);
  const [subtitlesFound, setSubtitlesFound] = useState(false);
  const [allSubtitlesFound, setAllSubtitlesFound] = useState(false);
  const { setup, destroy } = location.state || {};
  const playerRef = useRef(null);
  const mouseTimerRef = useRef(null);

  const isTorrentReady = state.server && state.playing.isReady;

  const subtitlesExist = localSubtitles.tracks.length;
  const maxSubLength = subtitlesExist
    ? localSubtitles.tracks.reduce((max, track) =>
      track.buffer && track.buffer.length > (max?.buffer?.length || 0) ? track : max, null)?.buffer?.length || null
    : null;
  const tracksAreFromActualTorrent = subtitlesExist
    ? localSubtitles.tracks.every(track => track.infoHash === currentTorrent.infoHash)
    : false;

  const animeData = currentTorrent.animeData
  const animeImage = animeData?.coverImage?.extraLarge || animeData?.bannerImage

  const rpcFrame = useCanvasRpcFrame({ imageUrl: animeImage });

  const handleMouseMove = () => {
    setIsMouseMoving(true);
    clearTimeout(mouseTimerRef.current);
    mouseTimerRef.current = setTimeout(() => {
      setIsMouseMoving(false);
    }, 3000); // Set to 0 after 3 seconds of inactivity
  };

  useEffect(() => {
    const fetchAndSetSubtitles = async () => {
      if (!currentTorrent || subtitlesFound) return;

      await fetchSubtitles();
    };

    fetchAndSetSubtitles();
  }, [currentTorrent]);

  useEffect(() => {
    if (!apiSubtitles || isFetchingSubtitles || subtitlesFound) return;

    const filteredSubtitles = localSubtitles.tracks.filter(track =>
      track.label !== 'Español Latino'
    );

    sendNotification(state, {
      title: 'Subtítulos',
      message: 'Se encontraron subtítulos de la API, agregando...',
      type: 'debug'
    });

    console.log('apiSubtitles', apiSubtitles);

    setLocalSubtitles({
      infoHash: currentTorrent.infoHash,
      tracks: [apiSubtitles, ...filteredSubtitles]
    });
    setSubtitlesFound(true);
  }, [apiSubtitles, isFetchingSubtitles]);

  // Discord RPC and header title
  useEffect(() => {
    const getAnimeInfo = async () => {
      const anitomyData = await anitomyscript(currentTorrent.name);
      return {
        animeName: anitomyData.anime_title,
        episodeNumber: Number(anitomyData.episode_number) || null
      };
    };

    const updateDiscordRPC = async (animeInfo) => {
      const isPaused = state.playing.isPaused;
      const { animeName, episodeNumber } = animeInfo;

      dispatch('updateDiscordRPC', {
        details: animeName,
        state: episodeNumber ? `Episodio ${episodeNumber}` : '',
        assets: {
          small_image: isPaused ? 'pause' : 'play',
          small_text: isPaused ? 'Pausado' : 'Reproduciendo',
          large_image: rpcFrame,
        },
      });
    };

    const updateHeaderTitle = (animeInfo) => {
      const { animeName, episodeNumber } = animeInfo;
      let title = animeName.replace(' - Movie', '');

      if (episodeNumber) {
        title = `${title} - E${episodeNumber}`;
      }

      eventBus.emit('headerTitle', title);
    };

    const updatePlayerInfo = async () => {
      const animeInfo = await getAnimeInfo();
      updateHeaderTitle(animeInfo);

      if (currentTorrent && isTorrentReady && rpcFrame) {
        console.log('rpcAndTitle: Updating Discord RPC with state:', {
          currentTorrent,
          isPaused: state.playing.isPaused,
          isTorrentReady,
          rpcFrame
        });
        updateDiscordRPC(animeInfo);
      } else {
        console.log('rpcAndTitle: Skipping Discord RPC update, missing requirements:', {
          hasTorrent: !!currentTorrent,
          isTorrentReady,
          hasRpcFrame: !!rpcFrame
        });
      }
    };

    updatePlayerInfo();
  }, [currentTorrent, state.playing.isPaused, isTorrentReady, rpcFrame]);

  useEffect(() => {
    return () => {
      clearTimeout(mouseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setLastAction(state.playing.isPaused ? 'pause' : 'play');
  }, [state.playing.isPaused]);

  useEffect(() => {
    if (setup) {
      setup((err) => {
        if (err) dispatch('error', err);
      });
    }

    return () => {
      if (destroy) {
        destroy();
      }
      // Unload the media element so that Chromium stops trying to fetch data
      const tag = document.querySelector('audio,video');
      if (tag) {
        tag.pause();
        tag.src = '';
        tag.load();
        navigator.mediaSession.metadata = null;
      }
    };
  }, [setup, destroy]);

  // References for managing subtitle state
  const subtitlesRef = useRef({
    exist: subtitlesExist,
    maxLength: maxSubLength,
    matchCurrentTorrent: tracksAreFromActualTorrent,
    currentTorrent
  });
  const hasCheckedSubtitles = useRef(false);
  const subtitleCheckRef = useRef({ infoHash: null, attempts: 0, lastThreeLengths: [] });

  useEffect(() => {
    // Update subtitles reference with current values
    subtitlesRef.current = {
      exist: subtitlesExist,
      maxLength: maxSubLength,
      matchCurrentTorrent: tracksAreFromActualTorrent,
      currentTorrent
    };

    // Reset local subtitles if invalid
    if (!tracksAreFromActualTorrent || !subtitlesExist) {
      setLocalSubtitles({ infoHash: currentTorrent.infoHash, tracks: [] });
    }

    // Subtitle update handler
    const handleSubtitlesUpdate = ({ infoHash, tracks, forceStop }) => {

      if (forceStop) {
        console.log('Forced stop of subtitle checks');
        sendNotification(state, { title: 'Subtítulos', message: 'Se ha detenido la búsqueda.', type: 'debug' })
        setForceStopSubtitles(true);
        subtitleCheckRef.current.attempts = Infinity; // Prevent further checks
        return;
      }

      const subsLength = tracks.reduce((max, track) =>
        track.buffer && track.buffer.length > (max?.buffer?.length || 0) ? track : max, null)?.buffer?.length || null

      if (subsLength) {
        console.log('Subtitles updated:', infoHash);
        if (!allSubtitlesFound) {
          sendNotification(state, { title: 'Subtítulos', message: `Se han encontrado subtítulos con un tamaño total de ${subsLength}.`, type: 'debug' })
        }
        setSubtitlesFound(true);

        console.log('tracks', tracks)

        const filteredTracks = apiSubtitles ? tracks.filter(track => track.label !== 'Español Latino') : tracks
        const apiSubtitlesTrack = apiSubtitles ? [apiSubtitles] : []

        setLocalSubtitles({ infoHash, tracks: [...apiSubtitlesTrack, ...filteredTracks] });
      } else {
        sendNotification(state, { title: 'Subtítulos', message: `No se han encontrado subtítulos.`, type: 'debug' })
      }
    };

    // Subscribe to subtitle update event
    eventBus.on('subtitlesUpdate', handleSubtitlesUpdate);
  }, [
    subtitlesExist,
    maxSubLength,
    tracksAreFromActualTorrent,
    currentTorrent,
    allSubtitlesFound
  ]);

  // Function to check subtitle availability
  const checkForSubtitles = useCallback(() => {
    if (forceStopSubtitles) {
      console.log('Subtitle checks forcibly stopped');
      return;
    }

    const { currentTorrent, exist, maxLength, matchCurrentTorrent } = subtitlesRef.current;
    if (!currentTorrent) return;

    const infoHash = currentTorrent.infoHash;
    const { attempts, lastThreeLengths } = subtitleCheckRef.current;

    // Reset attempts for new torrent
    if (subtitleCheckRef.current.infoHash !== infoHash) {
      subtitleCheckRef.current = {
        infoHash,
        attempts: 0,
        lastThreeLengths: []
      };
    }

    const MAX_ATTEMPTS = 30;
    if (attempts < MAX_ATTEMPTS) {
      console.log(`Checking subtitles (attempt ${attempts + 1} of ${MAX_ATTEMPTS})`);

      dispatch('checkForSubtitles', currentTorrent);
      subtitleCheckRef.current.attempts++;

      // Update length history
      if (maxLength > 0) {
        lastThreeLengths.push(maxLength);
        if (lastThreeLengths.length > 3) {
          lastThreeLengths.shift();
        }
      }

      const hasThreeEqualLengths = lastThreeLengths.length === 3 &&
        lastThreeLengths.every(length => length === lastThreeLengths[0]);

      const needsMoreChecks = attempts >= 8
        ? (!exist || maxLength < 300 || !matchCurrentTorrent || !hasThreeEqualLengths)
        : true;

      sendNotification(state, { title: `Subtítulos`, message: `Buscando... Intento: ${attempts + 1}/${MAX_ATTEMPTS}`, type: 'debug' })

      if (needsMoreChecks) {
        // Dynamic timeout based on attempt number
        const timeout = attempts <= 5 ? 10000 : // First 5 attempts: 10 seconds
          attempts <= 10 ? 30000 : // Attempts 6-10: 30 seconds 
            60000; // Attempts 11-16: 60 seconds

        const timeoutId = setTimeout(checkForSubtitles, timeout);
        subtitleCheckRef.current.timeoutId = timeoutId;
      } else {
        setAllSubtitlesFound(true);
        sendNotification(state, {
          title: 'Subtítulos',
          message: `Se encontraron subtítulos válidos y estables, deteniendo búsqueda...`,
          type: 'debug'
        })
        console.log('Valid subtitles found with 3 consistent lengths, stopping checks');
      }
    } else {
      sendNotification(state, { title: 'Subtítulos', message: `Se han alcanzado el máximo de intentos de búsqueda para este torrent.`, type: 'debug' })
      console.log('Maximum subtitle check attempts reached for this torrent');
    }
  }, [dispatch, forceStopSubtitles]);

  // Effect to initiate subtitle check
  useEffect(() => {
    if (!hasCheckedSubtitles.current && !forceStopSubtitles) {
      console.log('Initial subtitle check');
      checkForSubtitles();
      hasCheckedSubtitles.current = true;
    }

    // Cleanup function to cancel any pending subtitle checks
    return () => {
      if (subtitleCheckRef.current.timeoutId) {
        clearTimeout(subtitleCheckRef.current.timeoutId);
      }
    };
  }, [checkForSubtitles, forceStopSubtitles]);

  useEffect(() => {
    eventBus.on('jumpToTime', (time) => {
      state.playing.jumpToTime = time;
    });

    state.playing.isPaused = false;
  }, []);

  // Show the video as large as will fit in the window, play immediately
  // If the video is on Chromecast or Airplay, show a title screen instead
  const showVideo = state.playing.location === 'local';
  const showControls = state.playing.location !== 'external';

  if (!isTorrentReady || !subtitlesFound) {
    return <Spinner />
  }

  return (
    <div
      className="player relative h-screen overflow-hidden"
      onWheel={handleVolumeWheel}
      ref={playerRef}
    >
      <div
        className="absolute inset-0"
        style={{ zIndex: 1000, cursor: isMouseMoving ? 'auto' : 'none' }}
        onClick={dispatcher('playPause')}
        onMouseMove={handleMouseMove}
      />
      <AnimatePresence>
        {(lastAction === 'pause' && state.playing.isPaused) || (lastAction === 'play' && !state.playing.isPaused) ? (
          <motion.div
            key={lastAction}
            className="absolute inset-0 flex items-center justify-center z-50"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1] }}
            exit={{ opacity: 0, scale: 1.5 }}
            transition={{ duration: 1, times: [0, 0.5, 1] }}
          >
            <div
              className="bg-black bg-opacity-50 rounded-full p-5 w-32 h-32 flex items-center justify-center"
            >
              <i className="icon text-white text-8xl flex items-center justify-center w-full h-full">
                {lastAction === 'pause' ? 'pause' : 'play_arrow'}
              </i>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {showVideo ? renderMedia(state, localSubtitles) : renderCastScreen(state)}
      {showControls && renderPlayerControls(state, isMouseMoving, handleMouseMove, localSubtitles)}
    </div>
  );
}

module.exports = Player;

function handleVolumeWheel(e) {
  dispatch('changeVolume', (-e.deltaY | e.deltaX) / 500);
}

function renderMedia(state, currentSubtitles) {
  if (!state.server) return;

  // Unfortunately, play/pause can't be done just by modifying HTML.
  // Instead, grab the DOM node and play/pause it if necessary
  // Get the <video> or <audio> tag
  const mediaElement = document.querySelector(state.playing.type);
  if (mediaElement !== null) {
    if (
      navigator.mediaSession.metadata === null &&
      mediaElement.played.length !== 0
    ) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: state.playing.fileName
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        dispatch('playPause');
      });
      navigator.mediaSession.setActionHandler('play', () => {
        dispatch('playPause');
      });
      if (Playlist.hasNext(state)) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          dispatch('nextTrack');
        });
      }
      if (Playlist.hasPrevious(state)) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          dispatch('previousTrack');
        });
      }
    }

    if (state.playing.isPaused && !mediaElement.paused) {
      mediaElement.pause();
    } else if (!state.playing.isPaused && mediaElement.paused) {
      mediaElement.play();
    }
    // When the user clicks or drags on the progress bar, jump to that position
    if (state.playing.jumpToTime != null) {
      mediaElement.currentTime = state.playing.jumpToTime;
      state.playing.jumpToTime = null;
    }
    if (state.playing.playbackRate !== mediaElement.playbackRate) {
      mediaElement.playbackRate = state.playing.playbackRate;
    }
    // Recover previous volume
    if (state.previousVolume !== null && isFinite(state.previousVolume)) {
      mediaElement.volume = state.previousVolume;
      state.previousVolume = null;
    }

    // Set volume
    if (state.playing.setVolume !== null && isFinite(state.playing.setVolume)) {
      mediaElement.volume = state.playing.setVolume;
      state.playing.setVolume = null;
    }

    // Switch to the newly added subtitle track, if available
    const tracks = mediaElement.textTracks || [];
    for (let j = 0; j < tracks.length; j++) {
      const isSelectedTrack = j === state.playing.subtitles.selectedIndex;
      tracks[j].mode = isSelectedTrack ? 'showing' : 'hidden';
    }

    // Save video position
    const file = state.getPlayingFileSummary();
    if (file) {
      file.currentTime = state.playing.currentTime = mediaElement.currentTime;
      file.duration = state.playing.duration = mediaElement.duration;
    } else {
      state.playing.currentTime = mediaElement.currentTime;
      state.playing.duration = mediaElement.duration;
    }

    // Save selected subtitle
    if (state.playing.subtitles.selectedIndex !== -1 && file) {
      const index = state.playing.subtitles.selectedIndex;
      file.selectedSubtitle = currentSubtitles.tracks[index]?.filePath;
    } else if (file && file.selectedSubtitle != null) {
      delete file.selectedSubtitle;
    }

    // Switch to selected audio track
    const audioTracks = mediaElement.audioTracks || [];
    for (let j = 0; j < audioTracks.length; j++) {
      const isSelectedTrack = j === state.playing.audioTracks.selectedIndex;
      audioTracks[j].enabled = isSelectedTrack;
    }

    state.playing.volume = mediaElement.volume;
  }

  // Add subtitles to the <video> tag
  const trackTags = [];
  if (state.playing.subtitles.selectedIndex >= 0) {
    currentSubtitles.tracks.forEach((track, i) => {
      const isSelected = state.playing.subtitles.selectedIndex === i;
      trackTags.push(
        <track
          key={i}
          default={isSelected}
          label={track.label}
          kind="subtitles"
          src={track.buffer}
        />
      );
    });
  }

  // Create the <audio> or <video> tag
  const MediaTagName = state.playing.type;
  const mediaTag = (
    <MediaTagName
      src={Playlist.getCurrentLocalURL(state)}
      onClick={dispatcher('playPause')}
      onLoadedMetadata={onLoadedMetadata}
      onEnded={onEnded}
      onStalled={dispatcher('mediaStalled')}
      onError={dispatcher('mediaError')}
      onTimeUpdate={dispatcher('mediaTimeUpdate')}
      onEncrypted={dispatcher('mediaEncrypted')}
      crossOrigin="anonymous"
    >
      {trackTags}
    </MediaTagName>
  );

  // Show the media.
  return (
    <div
      key="letterbox"
      className="letterbox"
      onMouseMove={dispatcher('mediaMouseMoved')}
    >
      {mediaTag}
      {renderOverlay(state)}
    </div>
  );

  function onLoadedMetadata(e) {
    const mediaElement = e.target;

    // check if we can decode video and audio track
    console.log('onLoadedMetadata state.playing', state.playing);
    console.log('onLoadedMetadata currentSubtitles', currentSubtitles);

    console.log('state.server', state.server);
    if (state.playing.type === 'video') {
      if (mediaElement.videoTracks.length === 0) {
        dispatch('mediaError', 'Video codec unsupported');
      }

      if (mediaElement.audioTracks.length === 0) {
        dispatch('mediaError', 'Audio codec unsupported');
      }

      dispatch('mediaSuccess');

      const dimensions = {
        width: mediaElement.videoWidth,
        height: mediaElement.videoHeight
      };

      // As soon as we know the video dimensions, resize the window
      dispatch('setDimensions', dimensions);

      // set audioTracks
      const tracks = [];
      for (let i = 0; i < mediaElement.audioTracks.length; i++) {
        tracks.push({
          label: mediaElement.audioTracks[i].label || `Track ${i + 1}`,
          language: mediaElement.audioTracks[i].language
        });
      }

      state.playing.audioTracks.tracks = tracks;
      state.playing.audioTracks.selectedIndex = 0;
    }

    // check if we can decode audio track
    if (state.playing.type === 'audio') {
      if (mediaElement.audioTracks.length === 0) {
        dispatch('mediaError', 'Audio codec unsupported');
      }

      dispatch('mediaSuccess');
    }
  }

  function onEnded() {
    if (Playlist.hasNext(state)) {
      dispatch('nextTrack');
    } else {
      // When the last video completes, pause the video instead of looping
      state.playing.isPaused = true;
      if (state.window.isFullScreen) dispatch('toggleFullScreen');
    }
  }
}

// WIP: will be used in the future once it works properly
function renderOverlay(state) {
  const elems = [];
  const spinnerElem = renderLoadingSpinner(state);
  if (spinnerElem) elems.push(spinnerElem);

  // Video fills the window, centered with black bars if necessary
  // Audio gets a static poster image and a summary of the file metadata.
  let style;
  if (state.playing.type === 'audio') {
    style = { backgroundImage: cssBackgroundImagePoster(state) };
  } else if (elems.length !== 0) {
    style = { backgroundImage: cssBackgroundImageDarkGradient() };
  } else {
    // Video playing, so no spinner. No overlay needed
    return;
  }

  return (
    <div key="overlay" className="media-overlay-background" style={style}>
      <div className="media-overlay">{elems}</div>
    </div>
  );
}

function renderLoadingSpinner(state) {
  if (state.playing.isPaused) return;
  const isProbablyStalled =
    state.playing.isStalled ||
    new Date().getTime() - state.playing.lastTimeUpdate > 2000;
  if (!isProbablyStalled) return;

  const prog = state.getPlayingTorrentSummary()?.progress || {};
  let fileProgress = 0;
  if (prog.files) {
    const file = prog.files[state.playing.fileIndex];
    fileProgress = Math.floor((100 * file.numPiecesPresent) / file.numPieces);
  }

  if (fileProgress === 100) return;

  return (
    <VideoSpinner
      progress={fileProgress}
      downloadSpeed={prog.downloadSpeed}
      uploadSpeed={prog.uploadSpeed}
    />
  );
}

function renderPlayerControls(state, isMouseMoving, handleMouseMove, currentSubtitles) {
  const controlsStyle = {
    zIndex: 9000,
    opacity: isMouseMoving ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    pointerEvents: isMouseMoving ? 'auto' : 'none',
  };

  const positionPercent = (100 * state.playing.currentTime) / state.playing.duration;
  const playbackCursorStyle = { left: `calc(${positionPercent}% - 3px)` };

  const captionsClass = currentSubtitles.tracks.length === 0
    ? 'opacity-30 cursor-not-allowed'  // disabled
    : state.playing.subtitles.selectedIndex >= 0
      ? 'text-blue-400' // active
      : 'hover:text-white/100';

  const multiAudioClass = state.playing.audioTracks.tracks.length > 1
    ? 'hover:text-white/100'
    : 'opacity-30 cursor-not-allowed';

  const elements = [
    renderPreview(state),

    // Playback bar
    <div key="playback-bar" className="absolute top-0 left-0 right-0 h-1 group">
      {renderLoadingBar(state)}
      <div
        key="cursor"
        className="absolute w-2 h-2 group-hover:-top-1.5 -top-0.5 bg-white rounded-full shadow-lg transform -translate-x-1/2
                   group-hover:w-4 group-hover:h-4 transition-all duration-200"
        style={playbackCursorStyle}
      />
      <div
        key="scrub-bar"
        className="absolute w-full h-8 -top-3 cursor-pointer"
        draggable="true"
        onMouseMove={handleScrubPreview}
        onMouseOut={clearPreview}
        onDragStart={handleDragStart}
        onClick={handleScrub}
        onDrag={handleScrub}
      />
    </div>,

    // Left controls group
    <div className="flex items-center space-x-2 ml-4">
      <button
        key="play"
        className="p-2 text-white/90 hover:text-white/100 transition-all duration-200 
                   hover:scale-110 focus:outline-none"
        onClick={() => dispatch('playPause')}
        aria-label={state.playing.isPaused ? 'Play' : 'Pause'}
      >
        <Icon
          icon={state.playing.isPaused ? 'fluent:play-48-filled' : 'fluent:pause-48-filled'}
          className="pointer-events-none"
          width="32"
          height="32"
        />
      </button>

      {/* Volume control */}
      <div key="volume" className="flex items-center">
        <button
          className="p-2 text-white/90 hover:text-white/100 transition-colors"
          onClick={handleVolumeMute}
          aria-label="Mute"
        >
          <Icon
            icon={getVolumeIcon(state.playing.volume)}
            className="pointer-events-none"
            width="24"
            height="24"
          />
        </button>
        <input
          className="w-24 mx-2 h-1 bg-white/25 rounded-full appearance-none cursor-pointer
                     transition-all duration-200 hover:bg-white/40"
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={state.playing.volume}
          onChange={handleVolumeScrub}
        />
      </div>

      {/* Time display */}
      <span key="time" className="text-sm text-white/80 font-medium tabular-nums select-none">
        {formatTime(state.playing.currentTime, state.playing.duration)} /
        {formatTime(state.playing.duration, state.playing.duration)}
      </span>
    </div>,

    // Right controls group
    <div className="flex items-center space-x-2 ml-auto mr-4">
      {state.playing.type === 'video' && (
        <>
          <button
            key="subtitles"
            className={`p-2 text-white/90 transition-all duration-200 ${captionsClass}`}
            onClick={handleSubtitles}
            aria-label="Closed captions"
          >
            <Icon
              icon="mingcute:subtitle-fill"
              className="pointer-events-none"
              width="24"
              height="24"
            />
          </button>
        </>
      )}

      <button
        key="fullscreen"
        className="p-2 text-white/90 hover:text-white/100 transition-all duration-200 
                   hover:scale-110 focus:outline-none"
        onClick={handleFullScreen}
        aria-label={state.window.isVideoFullScreen ? 'Exit full screen' : 'Enter full screen'}
      >
        <Icon
          icon={state.window.isVideoFullScreen ? 'mingcute:fullscreen-exit-fill' : 'mingcute:fullscreen-fill'}
          className="pointer-events-none"
          width="24"
          height="24"
        />
      </button>
    </div>
  ];

  // Helper function for volume icon
  function getVolumeIcon(volume) {
    if (volume === 0) return 'fluent:speaker-mute-24-filled';
    if (volume < 0.3) return 'fluent:speaker-1-24-filled';
    if (volume < 0.6) return 'fluent:speaker-2-24-filled';
    return 'fluent:speaker-2-24-filled';
  }

  function convertToPercentage(value) {
    return Math.floor(value * 100);
  }

  const emptyImage = new window.Image(0, 0);
  emptyImage.src =
    'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs%3D';
  function handleDragStart(e) {
    if (e.dataTransfer) {
      const dt = e.dataTransfer;
      // Prevent the cursor from changing, eg to a green + icon on Mac
      dt.effectAllowed = 'none';
      // Prevent ghost image
      dt.setDragImage(emptyImage, 0, 0);
    }
  }

  // Handles a scrub hover (preview another position in the video)
  function handleScrubPreview(e) {
    // Only show for videos
    if (!e.clientX || state.playing.type !== 'video') return;
    dispatch('mediaMouseMoved');
    dispatch('preview', e.clientX);
  }

  function clearPreview() {
    if (state.playing.type !== 'video') return;
    dispatch('clearPreview');
  }

  // Handles a click or drag to scrub (jump to another position in the video)
  function handleScrub(e) {
    if (!e.clientX) return;
    dispatch('mediaMouseMoved');
    const windowWidth = document.querySelector('body').clientWidth;
    const fraction = e.clientX / windowWidth;
    const position = fraction * state.playing.duration; /* seconds */
    dispatch('skipTo', position);
  }

  // Handles volume muting and Unmuting
  function handleVolumeMute() {
    if (state.playing.volume === 0.0) {
      dispatch('setVolume', 1.0);
    } else {
      dispatch('setVolume', 0.0);
    }
  }

  // Handles volume slider scrub
  function handleVolumeScrub(e) {
    dispatch('setVolume', e.target.value);
  }

  function handleSubtitles(e) {
    if (!currentSubtitles.tracks.length || e.ctrlKey || e.metaKey) {
      // if no subtitles available select it
      // dispatch('openSubtitles');
    } else {
      dispatch('toggleSubtitlesMenu');
    }
  }

  function handleAudioTracks() {
    dispatch('toggleAudioTracksMenu');
  }

  function handleFullScreen() {
    const currentWindow = remote.getCurrentWindow()
    const currentScreen = remote.screen.getDisplayMatching(currentWindow.getBounds());
    const workAreaSize = currentScreen.workAreaSize;
    const currentSize = currentWindow.getSize();
    const currentPosition = currentWindow.getBounds();


    const isWindowAtOrigin = currentPosition.x === 0 && currentPosition.y === 0;
    const isFullScreenInSize = currentSize[0] === workAreaSize.width &&
      currentSize[1] > workAreaSize.height;
    const isMaximized = currentSize[0] === workAreaSize.width &&
      currentSize[1] === workAreaSize.height;

    const isFullScreen = isFullScreenInSize && isWindowAtOrigin;

    // Debug logs to hunt user bugs
    console.log('handleFullScreen workAreaSize', workAreaSize.width, workAreaSize.height);
    console.log('handleFullScreen currentSize', currentSize[0], currentSize[1]);
    console.log('handleFullScreen isFullScreenInSize', isFullScreenInSize);
    console.log('handleFullScreen isMaximized', isMaximized);
    console.log('handleFullScreen state.window.isVideoFullScreen', state.window.isVideoFullScreen);

    if (isFullScreen) {
      exitFullScreen(currentWindow);
    } else {
      enterFullScreen(currentWindow);
    }

    state.window.isVideoFullScreen = !isFullScreen;
  }

  function exitFullScreen(window) {
    window.unmaximize();
    window.setFullScreen(false);
  }

  function enterFullScreen(window) {
    window.maximize();
    window.setFullScreen(true);
  }

  return (
    <div
      key="controls"
      className="fixed bottom-0 w-full bg-gradient-to-t from-black/95 via-black/75 to-transparent flex flex-col"
      style={controlsStyle}
      onMouseMove={handleMouseMove}
    >
      {/* Progress bar container */}
      <div className="w-full h-1 bg-white/5 hover:h-1.5 transition-all duration-200 mt-10">
        {/* Progress bar background and fill */}
        <div className="relative w-full h-full">
          <div className="absolute w-full h-full bg-white/20" />
          <div
            className="absolute h-full bg-white/60"
            style={{ width: `${positionPercent}%` }}
          />
          {elements[1]}
        </div>
      </div>

      {/* Controls container */}
      <div className="relative flex items-center w-full h-16 px-2">
        {elements.slice(2)}
      </div>
      <SubtitleSelector state={state} currentSubtitles={currentSubtitles} />
    </div>
  );
}

function renderPreview(state) {
  const { previewXCoord = null } = state.playing;

  // Calculate time from x-coord as fraction of track width
  const windowWidth = document.querySelector('body').clientWidth;
  const fraction = previewXCoord / windowWidth;
  const time = fraction * state.playing?.duration; /* seconds */

  const height = 70;
  let width = Math.floor(height * 16 / 9); // Default width with 16:9 aspect ratio

  const previewEl = document.querySelector('video#preview');
  if (previewEl !== null && previewXCoord !== null) {
    // Check if time is a valid, finite number
    const validTime = (typeof time === 'number' && isFinite(time)) ? time : 0;
    previewEl.currentTime = validTime;

    // Auto adjust width to maintain video aspect ratio
    const aspectRatio = previewEl.videoWidth / previewEl.videoHeight;
    if (!isNaN(aspectRatio)) {
      width = Math.floor(aspectRatio * height);
    }
  }

  // Center preview window on mouse cursor,
  // while avoiding falling off the left or right edges
  const xPos = Math.min(
    Math.max(previewXCoord - width / 2, 5),
    windowWidth - width - 5
  );

  return (
    <div
      key="preview"
      style={{
        position: 'absolute',
        bottom: 50,
        left: xPos,
        zIndex: 9999,
        display: previewXCoord == null && 'none' // Hide preview when XCoord unset
      }}
    >
      <div style={{ width, height, backgroundColor: 'black', zIndex: 9999 }}>
        <video
          src={Playlist.getCurrentLocalURL(state)}
          id="preview"
          style={{ border: '1px solid lightgrey', borderRadius: 2 }}
        />
      </div>
      <p
        style={{
          textAlign: 'center',
          margin: 5,
          textShadow: '0 0 2px rgba(0,0,0,.5)',
          color: '#eee'
        }}
      >
        {formatTime(time, state.playing.duration)}
      </p>
    </div>
  );
}

// Renders the loading bar. Shows which parts of the torrent are loaded, which
// can be 'spongey' / non-contiguous
function renderLoadingBar(state) {
  if (config.IS_TEST) return; // Don't integration test the loading bar. Screenshots won't match.

  const torrentSummary = state.getPlayingTorrentSummary();
  if (!torrentSummary?.progress) {
    return renderEmptyLoadingBar();
  }

  // Find all contiguous parts of the torrent which are loaded
  const prog = torrentSummary.progress;
  const fileProg = prog.files[state.playing.fileIndex];

  if (!fileProg) return renderEmptyLoadingBar();

  const parts = [];
  let lastPiecePresent = false;
  for (let i = fileProg.startPiece; i <= fileProg.endPiece; i++) {
    const partPresent = BitField.prototype.get.call(prog.bitfield, i);
    if (partPresent && !lastPiecePresent) {
      parts.push({ start: i - fileProg.startPiece, count: 1 });
    } else if (partPresent) {
      parts[parts.length - 1].count++;
    }
    lastPiecePresent = partPresent;
  }

  // Output some bars to show which parts of the file are loaded
  const loadingBarElems = parts.map((part, i) => {
    const style = {
      left: (100 * part.start) / fileProg.numPieces + '%',
      width: (100 * part.count) / fileProg.numPieces + '%',
      backgroundColor: '#dd0000'
    };

    return <div key={i} className="loading-bar-part" style={style} />;
  });

  return (
    <div key="loading-bar" className="loading-bar">
      {loadingBarElems}
    </div>
  );
}

function renderEmptyLoadingBar() {
  return (
    <div key="loading-bar" className="loading-bar">
      <div className="loading-bar-part" style={{
        left: '0%',
        width: '100%',
        backgroundColor: '#dd0000'
      }} />
    </div>
  );
}

// Returns the CSS background-image string for a poster image + dark vignette
function cssBackgroundImagePoster(state) {
  const torrentSummary = state.getPlayingTorrentSummary();
  const posterPath = TorrentSummary.getPosterPath(torrentSummary);
  if (!posterPath) return '';
  return cssBackgroundImageDarkGradient() + `, url('${posterPath}')`;
}

function cssBackgroundImageDarkGradient() {
  return (
    'radial-gradient(circle at center, ' +
    'rgba(0,0,0,0.4) 0%, rgba(0,0,0,1) 100%)'
  );
}
function formatTime(time, total) {
  if (typeof time !== 'number' || Number.isNaN(time)) {
    return '0:00';
  }

  const totalHours = Math.floor(total / 3600);
  const totalMinutes = Math.floor(total / 60);
  const hours = Math.floor(time / 3600);
  let minutes = Math.floor((time % 3600) / 60);
  if (totalMinutes > 9 && minutes < 10) {
    minutes = '0' + minutes;
  }
  const seconds = `0${Math.floor(time % 60)}`.slice(-2);

  return (totalHours > 0 ? hours + ':' : '') + minutes + ':' + seconds;
}

