const React = require('react');
const { useState, useEffect, useCallback, useRef } = require('react');
const { usePostHog } = require('posthog-js/react');
const {
  useLocation,
} = require('react-router-dom');

const { ipcRenderer } = require('electron');
const eventBus = require('../../lib/event-bus');
const { debounce } = require('../../../modules/utils');
const appVersion = require('../../../../package.json').version;

const useDiscordUser = require('../../hooks/useDiscordUser');

const SearchInput = require('./search-input');
const NewBadge = require('./new-badge');
const { Icon } = require('@iconify/react');
const { Skeleton, Divider, Tooltip } = require('@nextui-org/react');

const PLAYER_PATH = '/player';

const isPlayerRoute = (path) => path?.includes(PLAYER_PATH);

const useWindowControls = require('../../hooks/useWindowControls');
const useHeaderNavigation = require('../../hooks/useHeaderNavigation');
const useHeaderTitle = require('../../hooks/useHeaderTitle');
const useUpdateDownload = require('../../hooks/useUpdateDownload');

const Header = ({ state }) => {
  const posthog = usePostHog();
  const location = useLocation();
  const identifySentRef = useRef(false);

  const appIsActivated = state?.saved?.activation?.key
  const appUserDiscordId = state?.saved?.activation?.discordId
  const appIsBlocked = state?.saved?.activation?.blocked

  const { data: userData, isLoading: isLoadingUserData } = useDiscordUser(appUserDiscordId);

  const { isMaximized, handleWindowControl } = useWindowControls();
  const {
    canGoBack,
    canGoForward,
    canGoHome,
    isHome,
    handleBack,
    handleForward,
    handleHome,
    currentPath,
    searchTerm,
    setSearchTerm
  } = useHeaderNavigation();

  const { headerTitle } = useHeaderTitle();
  const { updateDownloaded, handleUpdateClick } = useUpdateDownload();

  const [opacity, setOpacity] = useState(1);

  // Efficient debounced search handler
  const debouncedEmitSearch = useCallback(
    debounce((term) => {
      if (currentPath !== '/popular-anime') {
        // Listen for navigation completion before emitting search
        const handleRouteChange = (path) => {
          if (path === '/popular-anime') {
            eventBus.emit('searchTermChanged', term);
            eventBus.off('routeChanged', handleRouteChange);
          }
        };

        eventBus.on('routeChanged', handleRouteChange);
        eventBus.emit('navigate', {
          path: '/popular-anime',
          state: { searchTerm: term }
        });
      } else {
        // If already on popular-anime, emit search directly
        eventBus.emit('searchTermChanged', term);
      }
    }, 500),
    [currentPath]
  );

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    debouncedEmitSearch(term);
  };

  useEffect(() => {
    const currentPath = location.pathname;

    const handleSearchTermChanged = (term) => {
      if (term && currentPath !== '/popular-anime') {
        eventBus.emit('navigate', {
          path: '/popular-anime'
        });
      }
      setSearchTerm(term);
    };

    eventBus.on('searchTermChanged', handleSearchTermChanged);
  }, [location]);

  useEffect(() => {
    const appKey = state?.saved?.activation?.key;
    const discordUser = userData?.discord;

    if (discordUser && !identifySentRef.current) {
      posthog?.identify(`${discordUser.username}-${discordUser.id}`, {
        appKey,
      });
      identifySentRef.current = true;
    }
  }, [userData]);

  useEffect(() => {
    if (location.pathname.includes('player')) {
      let timeoutId;
      const handleMouseMove = () => {
        setOpacity(1);
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => setOpacity(0), 3000);
      };

      window.addEventListener('mousemove', handleMouseMove);
      timeoutId = setTimeout(() => setOpacity(0), 3000);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        clearTimeout(timeoutId);
      };
    } else {
      setOpacity(1);
    }
  }, [location]);

  const handleClosedBeta = () => {
    eventBus.emit('modalOpen', 'closedBeta');
  }

  const startDrag = (e) => {
    if (e.button !== 0) return;
    ipcRenderer.send('dragWindow');
  };

  return (
    <div
      onMouseDown={startDrag}
      className="header"
      style={{
        WebkitAppRegion: 'drag',
        opacity: opacity,
        transition: 'opacity 0.3s ease-in-out'
      }}
    >
      <div
        className="fixed w-full bg-zinc-950 overflow-hidden flex top-0 left-0 right-0 py-2 px-8 h-14"
      >
        <div
          className="flex flex-row w-full h-full items-center"
          style={{ zIndex: 9000 }}
        >
          <div className='flex flex-row items-center gap-2 flex-1'>
            {/* Navigate Buttons */}
            <div className="flex flex-row items-center">
              <button
                onClick={handleHome}
                disabled={isHome}
                className={`focus:outline-none p-1 hover:bg-zinc-800 rounded ${!isHome ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:house"
                  width="28"
                  height="28"
                  className={`pointer-events-none ${!isHome ? 'text-white' : 'text-gray-500'}`}
                />
              </button>
              <button
                onClick={handleBack}
                disabled={!canGoBack}
                className={`focus:outline-none p-1 hover:bg-zinc-800 rounded ${canGoBack ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:chevron-left"
                  width="28"
                  height="28"
                  className={`pointer-events-none ${canGoBack ? 'text-white' : 'text-gray-500'}`}
                />
              </button>
              <button
                onClick={handleForward}
                disabled={!canGoForward}
                className={`focus:outline-none p-1 hover:bg-zinc-800 rounded ${canGoForward ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:chevron-right"
                  width="28"
                  height="28"
                  className={`pointer-events-none ${canGoForward ? 'text-white' : 'text-gray-500'}`}
                />
              </button>
            </div>

            <Divider orientation="vertical" className="bg-zinc-800 h-6 mr-1" />

            {/* Search Input */}
            {(!isPlayerRoute(currentPath) && appIsActivated && !appIsBlocked) && (
              <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={handleSearchChange}
              />
            )}
          </div>

          {/* Center Content: Navigation Links + Logo */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
            {/* Left Link */}

            <NewBadge>
              <button
                className="text-white focus:outline-none p-1 hover:bg-zinc-800 rounded text-sm font-semibold flex items-center gap-2"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => eventBus.emit('navigate', { path: '/popular-anime' })}
              >
                <Icon icon="gravity-ui:star" width="20" height="20" className="pointer-events-none text-zinc-500" />
                Animes Populares
              </button>
            </NewBadge>

            <Divider orientation="vertical" className="bg-zinc-800 h-6 mr-1" />

            {/* Animeton Logo */}
            <div className="flex flex-col items-center" style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}>
              <p onClick={handleHome} className="text-white font-bold text-2xl leading-none" style={{ cursor: canGoHome ? 'pointer' : 'default' }}>Animeton</p>
              <div className="flex items-center gap-1">
                <span
                  onClick={isPlayerRoute(currentPath) ? handleHome : handleClosedBeta}
                  className="text-zinc-400 text-xs mt-1 leading-none"
                  style={{ cursor: 'pointer' }}
                >
                  {headerTitle}
                </span>
                <span className="text-zinc-500 text-xs mt-1 cursor-pointer">{' - '}</span>
                <span onClick={isPlayerRoute(currentPath) ? handleHome : handleClosedBeta} className="text-zinc-400 text-xs mt-1 cursor-pointer">v{appVersion}</span>
              </div>
            </div>

            <Divider orientation="vertical" className="bg-zinc-800 h-6 mr-1" />

            {/* Right Link */}
            <NewBadge>
              <button
                className="text-white focus:outline-none p-1 hover:bg-zinc-800 rounded text-sm font-semibold flex items-center gap-2"
                style={{ WebkitAppRegion: 'no-drag' }}
                onClick={() => eventBus.emit('navigate', { path: '/latest-episodes' })}
              >
                <Icon icon="majesticons:megaphone-line" width="20" height="20" className="pointer-events-none text-zinc-500" />
                Últimos Episodios
              </button>
            </NewBadge>
          </div>

          {/* Window Controls and Discord User */}
          <div className="flex flex-row items-center gap-4 justify-end">

            {/* Discord User */}
            {(appIsActivated && appUserDiscordId && !appIsBlocked) && (
              <div className="flex items-center gap-3 bg-zinc-900/50 rounded-full px-3 py-1.5"
                style={{ WebkitAppRegion: 'no-drag' }}>
                {isLoadingUserData ? (
                  <Skeleton className="w-24" />
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <img
                        src={userData?.discord?.avatarURL}
                        alt={userData?.discord?.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-white text-sm font-medium">
                        {userData?.discord?.username}
                      </span>
                    </div>
                    <Tooltip content="¡Consigue mas interactuando en discord!">
                      <div className="flex items-center gap-1 bg-zinc-800/80 rounded-full px-2 py-0.5">
                        <img src={'assets/icons/coin.png'} alt="coin" className="w-3.5 h-3.5" />
                        <span className="text-white text-xs font-medium">{userData?.user?.coins || 0}</span>
                      </div>
                    </Tooltip>
                  </>
                )}
              </div>
            )}

            {updateDownloaded && (
              <>
                <Divider orientation="vertical" className="bg-zinc-800 h-6" />
                <button
                  onClick={handleUpdateClick}
                  style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                  className="p-1 hover:bg-zinc-800 rounded"
                >
                  <Icon
                    icon="gravity-ui:arrow-down-to-line"
                    className="pointer-events-none text-[#17c964]"
                    width="26"
                    height="26"
                    style={{
                      color: '#17c964',
                      filter: 'drop-shadow(0 0 2px #17c964)',
                    }}
                  />
                </button>
              </>
            )}

            <Divider orientation="vertical" className="bg-zinc-800 h-6" />

            {/* Window Controls */}
            <div className="flex flex-row items-center gap-1">
              <button
                onClick={handleWindowControl('minimize')}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon icon="gravity-ui:minus" className="pointer-events-none" width="26" height="26" />
              </button>
              <button
                onClick={handleWindowControl('maximize')}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon
                  icon={isMaximized ? "gravity-ui:copy" : "gravity-ui:square"}
                  className="pointer-events-none"
                  width="26"
                  height="26"
                />
              </button>
              <button
                onClick={handleWindowControl('close')}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon icon="gravity-ui:xmark" className="pointer-events-none" width="26" height="26" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

module.exports = Header;
