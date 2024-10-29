const React = require('react');
const { useState, useEffect, useRef } = React;
const {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
  useNavigate
} = require('react-router-dom');
const { motion } = require('framer-motion');

const Header = require('../components/common/header');
const { Icon } = require('@iconify/react');

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

  const stateRef = useRef(state);
  stateRef.current = state;

  // Clean all torrents on startup
  // useEffect(() => {
  //   const savedTorrents = state.saved.torrents;

  //   savedTorrents.forEach(async (torrent) => {
  //     await new Promise(resolve => setTimeout(resolve, 1000));
  //     dispatch('deleteTorrent', torrent.infoHash, true);
  //   });
  // }, []);

  useEffect(() => {
    currentPath = location.pathname;

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
    };
    eventBus.on('torrentUpdate', torrentUpdateHandler);

    eventBus.on('updateDownloaded', () => {
      setUpdateDownloadedModalOpen(true);
    });

  }, [navigate, location]);

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

function ErrorPopover({ state }) {
  const now = new Date().getTime();
  const recentErrors = state.errors.filter((x) => now - x.time < 5000);
  const hasErrors = recentErrors.length > 0;

  if (!hasErrors) return null;

  const errorColors = {
    error: '#f31260',
    alert: '#ff961f',
    debug: '#336ecc'
  };

  return (
    <div
      key="errors"
      className="fixed left-4 flex flex-col space-y-4"
      style={{ zIndex: 9999, top: '72px' }}
    >
      {recentErrors.map((error, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          className={`text-white px-4 pr-6 py-3 rounded-xl shadow-md flex items-center`}
          style={{
            backgroundColor: errorColors[error.type] || errorColors.error
          }}
        >
          <Icon
            icon={error.type === "debug" ? "gravity-ui:wrench" : "gravity-ui:diamond-exclamation"}
            width="32"
            height="32"
            style={{ color: 'white' }}
            className="mr-3"
          />
          <div>
            <h3 className="font-bold mb-1">
              {error.title || 'Ha ocurrido un error...'}
            </h3>
            <p className="text-sm text-white/80">{error.message}</p>
          </div>
        </motion.div>
      ))}
    </div>
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
