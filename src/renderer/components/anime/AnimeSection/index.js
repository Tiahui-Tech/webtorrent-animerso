const React = require('react');
const { useState, useMemo, useEffect } = React;

const useAnimesData = require('../../../hooks/useAnimesData');
const useSearchAnimes = require('../../../hooks/useSearchAnimes');

const AnimeCard = require('./anime');
const AnimeCardSkeleton = require('./skeleton');
const { Icon } = require('@iconify/react');

const AnimeSection = ({ state, sectionTitle, searchTerm, fullScreen }) => {
  const [filteredAnimes, setFilteredAnimes] = useState([]);
  const animes = useAnimesData();
  const {
    searchAnimes,
    data: searchResults,
    isLoading: isSearchLoading,
    error: searchError
  } = useSearchAnimes(searchTerm, 48);

  useEffect(() => {
    const fetchAnimes = async () => {
      if (!searchTerm) {
        setFilteredAnimes(animes || []);
      } else {
        await searchAnimes();
      }
    };

    fetchAnimes();
  }, [searchTerm, animes, searchAnimes]);

  const displayAnimes = searchTerm ? searchResults : filteredAnimes;
  const isLoading = searchTerm ? isSearchLoading : false;
  const isEmpty = !displayAnimes.length;

  return (
    <div className={`flex flex-col p-8 px-12 ${isEmpty ? 'justify-center' : 'justify-start'} items-center bg-zinc-960 ${fullScreen ? 'min-h-[calc(100vh-56px)]' : ''}`}>
      {sectionTitle && (
        <div className="relative flex flex-row justify-center items-center w-full mb-4">
          <h2 className="relative text-2xl font-bold z-10">
            {sectionTitle}
          </h2>
        </div>
      )}
      {isLoading ? (
        <div className="grid grid-cols-auto-fit gap-4 sm:gap-6 md:gap-8 justify-center items-center min-h-[400px] w-full">
          {Array.from({ length: 21 }).map((_, index) => (
            <AnimeCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col justify-center items-center w-full min-h-[400px]">
          <>
            <Icon icon="gravity-ui:circle-xmark" width="128" height="128" style={{ color: '#71717a' }} />
            <p className="text-2xl font-bold text-zinc-500">{searchError || 'No se encontraron animes'}</p>
          </>
        </div>
      ) : (
        <div className="grid grid-cols-auto-fit gap-8 justify-center items-center min-h-[400px] w-full">
          {displayAnimes.map((anime, i) => (
            <AnimeCard
              key={`anime-${anime.id}-${i}`}
              anime={anime}
              state={state}
            />
          ))}
        </div>
      )}
    </div>
  );
};

module.exports = AnimeSection;
