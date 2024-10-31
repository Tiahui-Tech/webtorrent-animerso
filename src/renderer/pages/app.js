const React = require('react');
const { useState, useEffect, useRef } = React;
const {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate
} = require('react-router-dom');
const { usePostHog } = require('posthog-js/react');

const Header = require('../components/common/header');
const ErrorPopover = require('../components/common/error-popover');

// Perf optimization: Needed immediately, so do not lazy load it
const Home = require('./Home');
const AnimeDetails = require('./AnimeDetails');

const Player = require('./player-page');

const eventBus = require('../lib/event-bus');
const { dispatch } = require('../lib/dispatcher');

let currentPath = '/';
function getCurrentPath() {
  return currentPath;
}

const UpdateDownloadedModal = require('../components/common/modal/update-downloaded-modal')

function App({ initialState, onUpdate }) {
  return (
    <MemoryRouter>
      <AppContent initialState={initialState} onUpdate={onUpdate} />
    </MemoryRouter>
  );
}

function AppContent({ initialState, onUpdate }) {
  const [state, setState] = useState(initialState);
  const [currentTorrent, setCurrentTorrent] = useState(null);
  const [updateDownloadedModalOpen, setUpdateDownloadedModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const posthog = usePostHog();
  
  const stateRef = useRef(state);
  stateRef.current = state;

  // Track page views
  useEffect(() => {
    currentPath = location.pathname;
    posthog?.capture('page_view', {
      path: location.pathname
    });

    const stateUpdateHandler = (newPartialState) => {
      setState((prevState) => {
        const updatedState = deepMerge({ ...prevState }, newPartialState);
        return updatedState;
      });
    };
    eventBus.on('stateUpdate', stateUpdateHandler);

    const navigationHandler = ({ path, state }) => {
      navigate(path, { state });
    };
    eventBus.on('navigate', navigationHandler);

    const torrentUpdateHandler = (torrentSummary) => {
      console.log('torrentUpdateHandler', torrentSummary);
      setCurrentTorrent(torrentSummary);
      // Track torrent updates
      posthog?.capture('torrent_update', {
        infoHash: torrentSummary.infoHash,
        name: torrentSummary.name,
        progress: torrentSummary.progress
      });
    };
    eventBus.on('torrentUpdate', torrentUpdateHandler);

    eventBus.on('updateDownloaded', () => {
      setUpdateDownloadedModalOpen(true);
      posthog?.capture('update_downloaded');
    });

  }, [navigate, location, posthog]);

  // Track torrent cleanup on startup
  useEffect(() => {
    const savedTorrents = state.saved.torrents;
    posthog?.capture('cleanup_torrents', {
      count: savedTorrents.length
    });

    savedTorrents.forEach(async (torrent) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      dispatch('deleteTorrent', torrent.infoHash, true);
    });
  }, [posthog]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdate(stateRef.current);
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [state, onUpdate]);

  const hideControls = state.shouldHidePlayerControls();

  const cls = ['view-' + location.pathname.slice(1), 'is-' + process.platform];
  if (state.window.isFullScreen) cls.push('is-fullscreen');
  if (state.window.isFocused) cls.push('is-focused');
  if (hideControls) cls.push('hide-video-controls');

  const isPlayerPage = location.pathname === '/player';

  return (
    <main className={`app`}>
      <div
        className={`dark text-foreground bg-background min-h-screen overflow-y-auto ${cls.join(' ')}`}
      >
        <Header state={state} />
        <ErrorPopover state={state} />
        <div
          key="content"
          className="content"
          style={{
            minHeight: isPlayerPage ? '100vh' : 'calc(100vh - 56px)',
            marginTop: isPlayerPage ? '0' : '56px'
          }}
        >
          <React.Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Home state={state} />} />
              <Route
                path="/anime/:idAnilist"
                element={<AnimeDetails state={state} />}
              />
              <Route path="/player" element={<Player state={state} currentTorrent={currentTorrent} />} />
            </Routes>
          </React.Suspense>
        </div>
        <UpdateDownloadedModal isOpen={updateDownloadedModalOpen} setIsOpen={setUpdateDownloadedModalOpen} />
      </div>
    </main>
  );
}

function deepMerge(target, source) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object') {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

module.exports = { App, getCurrentPath };
