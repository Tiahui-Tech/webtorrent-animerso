const { useState, useEffect } = require('react');
const eventBus = require('../lib/event-bus');

const defaultHeaderTitle = "Beta cerrada";

const useHeaderTitle = () => {
  const [headerTitle, setHeaderTitle] = useState(defaultHeaderTitle);

  useEffect(() => {
    const handleHeaderTitle = (newTitle) => {
      setHeaderTitle(newTitle);
    };

    eventBus.on('headerTitle', handleHeaderTitle);
  }, []);

  return { headerTitle };
};

module.exports = useHeaderTitle;