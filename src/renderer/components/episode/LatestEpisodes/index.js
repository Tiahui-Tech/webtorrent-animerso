const React = require('react');
const { useState, useEffect } = React;
const { Icon } = require('@iconify/react');
const useRSSData = require('../../../hooks/useRSSData');
const useModernBackground = require('../../../hooks/useModernBackground');
const { motion } = require('framer-motion');

const eventBus = require('../../../lib/event-bus');
const TorrentPlayer = require('../../../lib/torrent-player');
const { sendNotification } = require('../../../lib/errors');

const EpisodeCard = require('./episode');
const EpisodeCardSkeleton = require('./skeleton');

const LatestEpisodes = React.memo(({
  state,
  sectionTitle,
  perPage = 8,
  showViewMore = true,
  cardAnimation = false
}) => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);

  const { rssAnimes, isLoading, error } = useRSSData({
    state,
    page: 1,
    perPage,
    emptyState: false
  });

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

  const renderEpisodeCard = (anime, index) => {
    const card = (
      <EpisodeCard
        anime={anime}
        isLoading={loadingEpisodeId === anime?.torrent?.infoHash}
        onPlay={() => handlePlay(anime)}
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
    ) : (
      <React.Fragment key={index}>{card}</React.Fragment>
    );
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
      {sectionTitle && (
        <h2 className="relative text-2xl font-bold mb-6 px-8 text-center">{sectionTitle}</h2>
      )}

      <div className="relative mx-auto w-full max-w-[90%]">
        <div className="grid grid-cols-4 gap-8 w-full place-items-center">
          {isLoading || !rssAnimes
            ? Array.from({ length: perPage }).map((_, i) => (
              <EpisodeCardSkeleton key={i} />
            ))
            : rssAnimes.map((anime, i) => renderEpisodeCard(anime, i))}
        </div>

        {showViewMore && (
          <div className="flex justify-center w-full">
            <button
              onClick={() => eventBus.emit('navigate', { path: '/latest-episodes' })}
              className="flex flex-col items-center mt-8 transition-opacity duration-300 hover:opacity-70 group"
            >
              <Icon
                icon="gravity-ui:chevron-down"
                className="w-24 h-24 pointer-events-none transition-transform duration-300 group-hover:translate-y-1"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

module.exports = LatestEpisodes;
