const React = require('react');
const { useState, useEffect, useCallback, useMemo } = React;
const { Icon } = require('@iconify/react');
const { motion, AnimatePresence } = require('framer-motion');
const useRSSData = require('../../../hooks/useRSSData');
const useModernBackground = require('../../../hooks/useModernBackground');
const usePagination = require('../../../hooks/usePagination');

const TorrentPlayer = require('../../../lib/torrent-player');
const { sendNotification } = require('../../../lib/errors');

const EpisodeCard = require('./episode');
const EpisodeCardSkeleton = require('./skeleton');

const LatestEpisodes = React.memo(({ state, sectionTitle }) => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);
  
  const { rssAnimes, isLoading, error } = useRSSData({
    state,
    page: 1,
    perPage: 24,
    emptyState: false
  });

  const {
    currentPage,
    direction,
    hasMore,
    handlePrev,
    handleNext
  } = usePagination(rssAnimes?.length || 0);

  const displayEpisodes = useMemo(() => {
    if (!rssAnimes) return null;
    const startIndex = (currentPage - 1) * 8;
    return rssAnimes.slice(startIndex, startIndex + 8);
  }, [rssAnimes, currentPage]);

  const background = useModernBackground({
    primaryColor: '#63e8ff',
    secondaryColor: '#ff9af7',
    disablePattern: true,
    opacity: 0.6
  });

  useEffect(() => {
    if (error) {
      sendNotification(state, { message: error });
    }
  }, [error]);

  const handlePlay = (anime) => {
    const infoHash = anime?.torrent?.infoHash;
    if (!infoHash) {
      return sendNotification(state, { message: 'Episodio no disponible.' });
    }

    if (loadingEpisodeId) {
      return sendNotification(state, { title: 'Wow, espera!', message: 'Ya estamos cargando un episodio.', type: 'alert' });
    }

    setLoadingEpisodeId(infoHash);
    TorrentPlayer.playTorrent(anime, state, setLoadingEpisodeId);
  };

  const slideVariants = {
    enter: (direction) => ({
      transform: `translateX(${direction > 0 ? 100 : -100}%)`,
      opacity: 0
    }),
    center: {
      transform: 'translateX(0%)',
      opacity: 1
    },
    exit: (direction) => ({
      transform: `translateX(${direction < 0 ? 100 : -100}%)`,
      opacity: 0
    })
  };

  return (
    <div className="relative flex flex-col py-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${background})`,
          maskImage: 'linear-gradient(to top, black 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent)'
        }}
      />
      <h2 className="relative text-2xl font-bold mb-6 px-8 text-center">{sectionTitle}</h2>
      
      <div className="relative mx-auto w-full max-w-[90%]">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={currentPage}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              transform: { duration: 0.2, ease: 'easeOut' },
              opacity: { duration: 0.1 }
            }}
            className="grid grid-cols-4 gap-6 w-full place-items-center"
          >
            {isLoading || !displayEpisodes
              ? Array.from({ length: 8 }).map((_, i) => (
                <EpisodeCardSkeleton key={i} />
              ))
              : displayEpisodes.map((anime, i) => (
                <EpisodeCard
                  key={i}
                  anime={anime}
                  isLoading={loadingEpisodeId === anime?.torrent?.infoHash}
                  onPlay={() => handlePlay(anime)}
                />
              ))}
          </motion.div>
        </AnimatePresence>

        {currentPage > 1 && (
          <button
            className="absolute -left-16 top-1/2 transform -translate-y-1/2 transition-opacity duration-300 hover:opacity-100 opacity-50"
            onClick={handlePrev}
            disabled={isLoading}
          >
            <Icon
              icon="gravity-ui:chevron-left"
              className="w-16 h-16 pointer-events-none"
            />
          </button>
        )}

        {(!isLoading && hasMore) && (
          <button
            className="absolute -right-16 top-1/2 transform -translate-y-1/2 transition-opacity duration-300 hover:opacity-100 opacity-50"
            onClick={handleNext}
            disabled={isLoading}
          >
            <Icon
              icon="gravity-ui:chevron-right"
              className="w-16 h-16 pointer-events-none"
            />
          </button>
        )}
      </div>
    </div>
  );
});

module.exports = LatestEpisodes;
