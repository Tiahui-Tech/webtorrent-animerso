const { useEffect, useState } = require('react');
const remote = require('@electron/remote');

function useWindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let win;
    try {
      win = remote.getCurrentWindow();
    } catch (error) {
      console.error('Error getting window reference:', error);
      return;
    }

    const handleMaximize = () => setIsMaximized(true);
    const handleUnmaximize = () => setIsMaximized(false);
    const handleResize = () => {
      if (win) setIsMaximized(win.isMaximized());
    };

    setIsMaximized(win.isMaximized());

    win.on('maximize', handleMaximize);
    win.on('unmaximize', handleUnmaximize);
    win.on('resize', handleResize);

    return () => {
      win.off('maximize', handleMaximize);
      win.off('unmaximize', handleUnmaximize);
      win.off('resize', handleResize);
    };
  }, []);

  const handleWindowControl = (action) => (e) => {
    e.stopPropagation();
    const win = remote.getCurrentWindow();
    if (!win) return;

    try {
      switch (action) {
        case 'minimize':
          win.minimize();
          break;
        case 'maximize':
          if (win.isFullScreen()) {
            win.setFullScreen(false);
            setTimeout(() => {
              if (win.isFullScreen()) win.maximize();
            }, 100);
          } else if (win.isMaximized()) {
            win.unmaximize();
          } else {
            win.maximize();
          }
          break;
        case 'close':
          win.close();
          break;
      }
    } catch (error) {
      console.error(`Error executing window action ${action}:`, error);
    }
  };

  return { isMaximized, handleWindowControl };
}

module.exports = useWindowControls;