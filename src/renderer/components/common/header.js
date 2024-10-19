const React = require('react');
const { useState, useEffect, useCallback } = require('react');
const {
  useNavigate,
  useLocation,
  useNavigationType
} = require('react-router-dom');

const { ipcRenderer } = require('electron');
const remote = require('@electron/remote')
const eventBus = require('../../lib/event-bus');
const { debounce } = require('../../../modules/utils');

const useDiscordUser = require('../../hooks/useDiscordUser');

const SearchInput = require('./search-input');
const { Icon } = require('@iconify/react');
const { Skeleton } = require('@nextui-org/react');

const Header = ({ state }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const onPlayerPage = location.pathname.includes('player');

  const appIsActivated = state?.saved?.activation?.key
  const appUserDiscordId = state?.saved?.activation?.discordId
  const appIsBlocked = state?.saved?.activation?.blocked

  const { data: discordUser, isLoading: isLoadingDiscordUser, error: errorDiscordUser } = useDiscordUser(appUserDiscordId);

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [opacity, setOpacity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
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
    // Updates the navigation state every time the location or navigation type changes
    setCanGoBack(navigationType !== 'POP' || location.key !== 'default');
    setCanGoForward(false); // Reset on each navigation
    setIsHome(location.pathname === '/'); // Update isHome state based on current path
  }, [location, navigationType]);

  useEffect(() => {
    const updateMaximizedState = () => {
      const focusedWindow = remote.BrowserWindow.getFocusedWindow();
      setIsMaximized(focusedWindow ? focusedWindow.isMaximized() : false);
    };

    updateMaximizedState();
    window.addEventListener('resize', updateMaximizedState);

    return () => {
      window.removeEventListener('resize', updateMaximizedState);
    };
  }, []);

  useEffect(() => {
    if (onPlayerPage) {
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
  }, [onPlayerPage]);

  useEffect(() => {
    if (isHome) {
      // Emit the search event when the debounced search term changes
      eventBus.emit('searchTermChanged', debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, isHome]);

  const handleBack = (e) => {
    e.preventDefault();
    if (canGoBack) {
      navigate(-1);
      setCanGoForward(true);
    }
  };

  const handleForward = (e) => {
    e.preventDefault();
    if (canGoForward) {
      navigate(1);
    }
  };

  const handleHome = () => {
    if (!isHome) {
      navigate('/');
      setDebouncedSearchTerm('')
      setSearchTerm('')
    }
  };

  const startDrag = (e) => {
    if (e.button !== 0) return;
    ipcRenderer.send('dragWindow');
  };

  const handleWindowControl = (action) => (e) => {
    e.stopPropagation();
    const focusedWindow = remote.BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      switch (action) {
        case 'minimize':
          focusedWindow.minimize();
          break;
        case 'maximize':
          isMaximized ? focusedWindow.unmaximize() : focusedWindow.maximize();
          break;
        case 'close':
          focusedWindow.close();
          break;
      }
    }
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
            <div className="flex flex-row items-center gap-2">
              <button
                onClick={handleBack}
                disabled={!canGoBack}
                className={`focus:outline-none ${canGoBack ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:chevron-left"
                  width="28"
                  height="28"
                  className={canGoBack ? 'text-white' : 'text-gray-500'}
                />
              </button>
              <button
                onClick={handleForward}
                disabled={!canGoForward}
                className={`focus:outline-none ${canGoForward ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
              >
                <Icon
                  icon="gravity-ui:chevron-right"
                  width="28"
                  height="28"
                  className={canGoForward ? 'text-white' : 'text-gray-500'}
                />
              </button>
            </div>

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
            <button onClick={handleHome} className={isHome ? 'cursor-default' : 'cursor-pointer'} style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}>
              <div className="flex flex-col items-center">
                <p className="text-white font-bold text-2xl leading-none">Animeton</p>
                <span className="text-zinc-400 text-xs mt-1 leading-none">Beta cerrada</span>
              </div>
            </button>
          </div>

          {/* Window Controls and Discord Login */}
          <div className="flex flex-row items-center gap-2 justify-end">

            {/* Discord Login */}
            {(appIsActivated && appUserDiscordId && !appIsBlocked) && (
              <div className="flex flex-row items-center gap-2 bg-zinc-900 rounded-full pl-1 pr-3 py-1">
                {isLoadingDiscordUser ? (
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
                    <img 
                      src={discordUser.assets.avatarURL} 
                      alt={discordUser.basicInfo.globalName} 
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-white font-medium text-sm">
                      {discordUser.basicInfo.globalName}
                    </span>
                  </>
                )}
              </div>
            )}

            {/* Window Controls */}
            <div className="flex flex-row items-center gap-1">
              <button 
                onClick={handleWindowControl('minimize')} 
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon icon="gravity-ui:minus" width="26" height="26" />
              </button>
              <button 
                onClick={handleWindowControl('maximize')} 
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon icon={isMaximized ? "gravity-ui:copy" : "gravity-ui:square"} width="26" height="26" />
              </button>
              <button 
                onClick={handleWindowControl('close')} 
                style={{ WebkitAppRegion: 'no-drag', zIndex: 9999 }}
                className="p-1 hover:bg-zinc-800 rounded"
              >
                <Icon icon="gravity-ui:xmark" width="26" height="26" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

module.exports = Header;
