const { useState, useCallback, useRef, useEffect } = require('react');
const { useLocation, useNavigate } = require('react-router-dom');
const { usePostHog } = require('posthog-js/react');
const eventBus = require('../lib/event-bus');

const PLAYER_PATH = '/player';
const HOME_PATH = '/';
const defaultHeaderTitle = "Beta cerrada";
const isPlayerRoute = (path) => path?.includes(PLAYER_PATH);

function useHeaderNavigation() {
  const posthog = usePostHog();
  const navigate = useNavigate();
  const location = useLocation();
  const historyRef = useRef({ past: [], current: null, future: [] });

  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [canGoHome, setCanGoHome] = useState(false);
  const [isHome, setIsHome] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Navigation state management
  useEffect(() => {
    const currentPath = location.pathname;
    const isCurrentPlayer = isPlayerRoute(currentPath);
    const wasPreviousPlayer = isPlayerRoute(historyRef.current.current);

    // Handle player exit
    if (wasPreviousPlayer && !isCurrentPlayer) {
      eventBus.emit('headerTitle', defaultHeaderTitle);
      posthog?.capture('exit_player', {
        from: '/player',
        to: currentPath
      });
    }

    if (historyRef.current.current !== currentPath && !(isCurrentPlayer && wasPreviousPlayer)) {
      if (historyRef.current.current) {
        historyRef.current.past.push(historyRef.current.current);
      }
      historyRef.current.current = currentPath;

      if (!isCurrentPlayer) {
        historyRef.current.future = [];
      }

      posthog?.capture('route_changed', {
        from: historyRef.current.past[historyRef.current.past.length - 1] || null,
        to: currentPath,
        method: 'navigation'
      });
    }

    updateNavigationState();

    // Debug logging
    console.log('History state:', {
      past: historyRef.current.past,
      current: historyRef.current.current,
      future: historyRef.current.future
    });
  }, [location.pathname]);

  // Update canGoHome based on both path and search
  useEffect(() => {
    setCanGoHome(location.pathname !== HOME_PATH || searchTerm);
  }, [location.pathname, searchTerm]);

  // Separate navigation state update function
  const updateNavigationState = useCallback(() => {
    setCanGoBack(historyRef.current.past.length > 0);
    setCanGoForward(historyRef.current.future.length > 0 && !isPlayerRoute(historyRef.current.future[0]));
    setIsHome(location.pathname === HOME_PATH);
  }, []);

  // Navigation handlers
  const handleBack = useCallback((e) => {
    e.preventDefault();
    if (!canGoBack) return;

    let prevPage;
    const currentIsPlayer = isPlayerRoute(historyRef.current.current);

    if (currentIsPlayer) {
      do {
        prevPage = historyRef.current.past.pop();
      } while (isPlayerRoute(prevPage) && historyRef.current.past.length > 0);
    } else {
      prevPage = historyRef.current.past.pop();
    }

    if (prevPage && !isPlayerRoute(prevPage)) {
      historyRef.current.future.unshift(historyRef.current.current);
      historyRef.current.current = prevPage;
      navigate(prevPage);
      
      posthog?.capture('route_changed', {
        from: historyRef.current.current,
        to: prevPage,
        method: 'back_button'
      });

      eventBus.emit('historyUpdated');
    }
  }, [navigate, canGoBack]);

  const handleForward = useCallback((e) => {
    e.preventDefault();
    if (!canGoForward) return;

    let nextPage;
    do {
      nextPage = historyRef.current.future.shift();
    } while (isPlayerRoute(nextPage) && historyRef.current.future.length > 0);

    if (nextPage && !isPlayerRoute(nextPage)) {
      historyRef.current.past.push(historyRef.current.current);
      historyRef.current.current = nextPage;
      navigate(nextPage);

      posthog?.capture('route_changed', {
        from: historyRef.current.past[historyRef.current.past.length - 1],
        to: nextPage,
        method: 'forward_button'
      });

      eventBus.emit('historyUpdated');
    }
  }, [navigate, canGoForward]);

  const handleHome = useCallback((e) => {
    e?.preventDefault();
    if (!canGoHome) return;

    if (location.pathname !== HOME_PATH) {
      historyRef.current.past.push(historyRef.current.current);
      historyRef.current.current = HOME_PATH;
      historyRef.current.future = [];
      
      navigate(HOME_PATH);
      
      posthog?.capture('route_changed', {
        from: historyRef.current.past[historyRef.current.past.length - 1],
        to: HOME_PATH,
        method: 'home_button'
      });
    }

    // Reset search state
    setSearchTerm('');
    eventBus.emit('searchTermChanged', '');
  }, [navigate, canGoHome, location.pathname]);

  return {
    canGoBack,
    canGoForward,
    canGoHome,
    isHome,
    handleBack,
    handleForward,
    handleHome,
    currentPath: location.pathname,
    searchTerm,
    setSearchTerm
  };
}

module.exports = useHeaderNavigation;