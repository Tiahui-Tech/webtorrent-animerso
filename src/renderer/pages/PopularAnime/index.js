const React = require('react');
const { useState, useEffect } = require('react');
const { useLocation } = require('react-router-dom');

const eventBus = require('../../lib/event-bus');

const AnimeSection = require('../../components/anime/AnimeSection');

const PopularAnimePage = ({ state }) => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  // Handle initial state and location changes
  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
      eventBus.emit('searchTermChanged', location.state.searchTerm);
    }
  }, [location.state?.searchTerm]);

  // Handle search term changes
  useEffect(() => {
    const handleSearch = (term) => setSearchTerm(term);
    eventBus.on('searchTermChanged', handleSearch);
    
    return () => eventBus.off('searchTermChanged', handleSearch);
  }, []);

  return (
    <div className='py-6'>
      <AnimeSection
        state={state}
        fullScreen={true}
        perPage={48}
        showBackground={true}
        cardAnimation={true}
        searchTerm={searchTerm}
      />
    </div>
  );
};

module.exports = PopularAnimePage;

