const React = require('react');
const { useState, useEffect } = React;
const { Icon } = require('@iconify/react');
const { motion } = require('framer-motion');

const useAnimesData = require('../../../hooks/useAnimesData');
const useSearchAnimes = require('../../../hooks/useSearchAnimes');
const useModernBackground = require('../../../hooks/useModernBackground');

const eventBus = require('../../../lib/event-bus');

const AnimeCard = require('./anime');
const AnimeCardSkeleton = require('./skeleton');

const AnimeSection = React.memo(({
  state,
  sectionTitle,
  searchTerm,
  fullScreen = false,
  perPage = 28,
  showBackground = false,
  cardAnimation = false,
  gridClassName = "grid-cols-auto-fit",
  showViewMore = false,
  viewMoreText = false
}) => {
  const [filteredAnimes, setFilteredAnimes] = useState([]);
  const animes = useAnimesData({ perPage });
  const {
    searchAnimes,
    data: searchResults,
    isLoading: isSearchLoading,
    error: searchError
  } = useSearchAnimes(searchTerm, perPage);

  const background = useModernBackground({
    primaryColor: '#63e8ff',
    secondaryColor: '#ff9af7',
    disablePattern: true,
    opacity: 0.6
  });

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

  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 10,
      scale: 0.98
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        duration: 0.4,
        bounce: 0.1,
        staggerChildren: 0.07
      }
    }
  };

  const renderAnimeCard = (anime, index) => {
    const card = (
      <AnimeCard
        key={`anime-${anime.id}-${index}`}
        anime={anime}
        state={state}
      />
    );

    return cardAnimation ? (
      <motion.div
        key={index}
        initial="hidden"
        whileInView="visible"
        viewport={{
          once: true,
          margin: "-20% 0px"
        }}
        variants={cardVariants}
        className="will-change-transform"
        style={{
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden"
        }}
      >
        {card}
      </motion.div>
    ) : card;
  };

  const displayAnimes = searchTerm ? searchResults : filteredAnimes;
  const isLoading = searchTerm ? isSearchLoading : false;
  const isEmpty = !displayAnimes?.length;

  return (
    <div className={`relative flex flex-col p-8 px-12 ${isEmpty ? 'justify-center' : 'justify-start'} items-center ${fullScreen ? 'min-h-[calc(100vh-56px)]' : ''}`}>
      {showBackground && (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${background})`,
            maskImage: 'linear-gradient(to top, black 70%, transparent)',
            WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent)'
          }}
        />
      )}

      {sectionTitle && (
        <button
          onClick={() => eventBus.emit('navigate', { path: '/popular-anime' })}
          className="flex flex-row items-center gap-2 mb-6 transition-transform duration-300 hover:-translate-y-1">
          <Icon icon="gravity-ui:star" width="28" height="28" className="pointer-events-none text-zinc-500" />
          <h2 className="relative text-2xl font-bold text-center z-10">
            {sectionTitle}
          </h2>
        </button>
      )}

      {isLoading ? (
        <div className={`grid ${gridClassName} gap-4 sm:gap-6 md:gap-8 justify-center items-center min-h-[400px] w-full`}>
          {Array.from({ length: perPage }).map((_, index) => (
            <AnimeCardSkeleton key={`skeleton-${index}`} />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col justify-center items-center w-full min-h-[400px]">
          <Icon icon="gravity-ui:circle-xmark" width="128" height="128" style={{ color: '#71717a' }} />
          <p className="text-2xl font-bold text-zinc-500">{searchError || 'No se encontraron animes'}</p>
        </div>
      ) : (
        <div className={`grid ${gridClassName} gap-8 justify-center items-start min-h-[400px] w-full`}>
          {displayAnimes.map((anime, i) => renderAnimeCard(anime, i))}
        </div>
      )}

      {!isEmpty && showViewMore && (
        <div className="flex flex-col items-center justify-center w-full">
          <button
            onClick={() => eventBus.emit('navigate', { path: '/popular-anime' })}
            className="flex flex-col items-center mt-4 transition-opacity duration-300 opacity-70 hover:opacity-100 group"
          >
            {viewMoreText && <span className="text-lg font-medium">Ver más</span>}
            <Icon
              icon="gravity-ui:chevron-down"
              width="100"
              height="100"
              className="pointer-events-none transition-transform duration-300 group-hover:translate-y-1"
            />
          </button>
        </div>
      )}
    </div>
  );
});

module.exports = AnimeSection;
