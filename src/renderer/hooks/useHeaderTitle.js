const { useState, useEffect } = require('react');
const eventBus = require('../lib/event-bus');

const defaultHeaderTitle = "Beta cerrada";

function useHeaderTitle(isPlayerRoute) {
  const [headerTitle, setHeaderTitle] = useState(defaultHeaderTitle);

  useEffect(() => {
    const handleHeaderTitle = (newTitle) => {
      if (isPlayerRoute) {
        setHeaderTitle(newTitle);
      }
    };

    eventBus.on('headerTitle', handleHeaderTitle);
  }, [isPlayerRoute]);

  return { headerTitle };
}

module.exports = useHeaderTitle;