const React = require('react');
const { useState, useEffect } = React;
const { motion } = require('framer-motion');

const useModernBackground = require('../../hooks/useModernBackground');
const useRSSData = require('../../hooks/useRSSData');

const TorrentPlayer = require('../../lib/torrent-player');
const { sendNotification } = require('../../lib/errors');

const EpisodeCard = require('../../components/episode/LatestEpisodes/episode');
const EpisodeCardSkeleton = require('../../components/episode/LatestEpisodes/skeleton');

const LatestEpisodesPage = () => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);
  
  const { rssAnimes, isLoading, error } = useRSSData({
    state: 'latest',
    page: 1,
    perPage: 24,
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
      sendNotification('latest', { message: error });
    }
  }, [error]);

  const handlePlay = (anime) => {
    const infoHash = anime?.torrent?.infoHash;
    if (!infoHash) {
      return sendNotification('latest', { message: 'Episodio no disponible.' });
    }

    if (loadingEpisodeId) {
      return sendNotification('latest', { 
        title: 'Wow, espera!', 
        message: 'Ya estamos cargando un episodio.', 
        type: 'alert' 
      });
    }

    setLoadingEpisodeId(infoHash);
    TorrentPlayer.playTorrent(anime, 'latest', setLoadingEpisodeId);
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <div className="relative flex flex-col py-6 pb-12">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${background})`,
          maskImage: 'linear-gradient(to top, black 70%, transparent)',
          WebkitMaskImage: 'linear-gradient(to top, black 70%, transparent)'
        }}
      />
      <h2 className="relative text-2xl font-bold mb-6 px-8 text-center">Últimos Episodios</h2>
      
      <div className="relative mx-auto w-full max-w-[90%]">
        <div className="grid grid-cols-4 gap-8 w-full place-items-center">
          {isLoading || !rssAnimes
            ? Array.from({ length: 24 }).map((_, i) => (
              <EpisodeCardSkeleton key={i} />
            ))
            : rssAnimes.map((anime, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={cardVariants}
              >
                <EpisodeCard
                  anime={anime}
                  isLoading={loadingEpisodeId === anime?.torrent?.infoHash}
                  onPlay={() => handlePlay(anime)}
                />
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
};

module.exports = LatestEpisodesPage;

