const React = require('react');
const { useState, useEffect, useCallback, useRef } = require('react');
const { usePostHog } = require('posthog-js/react');
const {
  useLocation,
} = require('react-router-dom');

const { ipcRenderer, shell } = require('electron');
const remote = require('@electron/remote')
const eventBus = require('../../lib/event-bus');
const { debounce } = require('../../../modules/utils');
const appVersion = require('../../../../package.json').version;

const useDiscordUser = require('../../hooks/useDiscordUser');

const SearchInput = require('./search-input');
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
  
  const isPlayerPath = isPlayerRoute(currentPath);
  const { headerTitle } = useHeaderTitle(isPlayerPath);
  const { updateDownloaded, handleUpdateClick } = useUpdateDownload();

  const [opacity, setOpacity] = useState(1);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounced setDebouncedSearchTerm
  const debouncedSetSearchTerm = useCallback(
    debounce(term => setDebouncedSearchTerm(term), 500),
    []
  );

  // Update searchTerm and trigger debounce
  const handleSearchTermChange = (term) => {
    setSearchTerm(term);
    debouncedSetSearchTerm(term);
  };

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

  useEffect(() => {
    if (isHome) {
      // Emit the search event when the debounced search term changes
      eventBus.emit('searchTermChanged', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, isHome]);

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
                disabled={!canGoHome}
                className={`focus:outline-none p-1 hover:bg-zinc-800 rounded ${canGoHome ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:house"
                  width="28"
                  height="28"
                  className={`pointer-events-none ${canGoHome ? 'text-white' : 'text-gray-500'}`}
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
            {(isHome && appIsActivated && !appIsBlocked) && (
              <SearchInput
                searchTerm={searchTerm}
                setSearchTerm={handleSearchTermChange}
              />
            )}
          </div>

          {/* Animeton Logo */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
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
                {!isPlayerRoute(currentPath) && (
                  <span onClick={handleClosedBeta} className="text-zinc-500 text-xs mt-1 cursor-pointer">v{appVersion}</span>
                )}
              </div>
            </div>
          </div>

          {/* Window Controls and Discord User */}
          <div className="flex flex-row items-center gap-4 justify-end">

            {/* Discord User */}
            {(appIsActivated && appUserDiscordId && !appIsBlocked) && (
              <div className="flex flex-row items-center gap-2 bg-zinc-900 rounded-full pl-1 pr-3 py-1" style={{
                zIndex: 9999, pointerEvents: 'auto', WebkitAppRegion: 'no-drag'
              }}>
                {isLoadingUserData ? (
                  <>
                    <Skeleton className="rounded-full" style={{ backgroundColor: '#ffffff30' }}>
                      <div className="w-8 h-8 rounded-full bg-default-200"></div>
                    </Skeleton>
                    <Skeleton className="w-24 rounded-lg" style={{ backgroundColor: '#ffffff30' }}>
                      <div className="h-4 rounded-lg bg-default-200"></div>
                    </Skeleton>
                  </>
                ) : (
                  <>
                    <Tooltip content="¡Consigue mas interactuando en discord!" className='bg-zinc-900 text-white' placement='bottom'>
                      <div className="flex flex-row items-center gap-1">
                        <img src={'assets/icons/coin.png'} alt="coin" className="w-4 h-4 ml-2" />
                        <span className="text-white font-medium text-sm">
                          {userData?.user?.coins || 0}
                        </span>
                      </div>
                    </Tooltip>
                    <Divider orientation="vertical" className="h-8" />
                    <img
                      src={userData?.discord?.avatarURL}
                      alt={userData?.discord?.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-white font-medium text-sm">
                      {userData?.discord?.username || '???'}
                    </span>
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
