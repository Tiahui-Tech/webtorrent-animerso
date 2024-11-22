const { useState, useEffect } = require('react');
const { usePostHog } = require('posthog-js/react');
const eventBus = require('../lib/event-bus');

function useUpdateDownload() {
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    const handleUpdateDownloaded = () => {
      setUpdateDownloaded(true);
      posthog?.capture('update_downloaded');
    };

    eventBus.on('updateDownloaded', handleUpdateDownloaded);

    return () => {
      eventBus.off('updateDownloaded', handleUpdateDownloaded);
    };
  }, []);

  const handleUpdateClick = () => {
    eventBus.emit('modalOpen', 'updateDownloaded');
  };

  return {
    updateDownloaded,
    handleUpdateClick
  };
}

module.exports = useUpdateDownload;