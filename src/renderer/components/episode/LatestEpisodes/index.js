const React = require('react');
const { useState, useEffect } = React;
const { Icon } = require('@iconify/react');
const useRSSData = require('../../../hooks/useRSSData');
const useModernBackground = require('../../../hooks/useModernBackground');

const eventBus = require('../../../lib/event-bus');
const TorrentPlayer = require('../../../lib/torrent-player');
const { sendNotification } = require('../../../lib/errors');

const EpisodeCard = require('./episode');
const EpisodeCardSkeleton = require('./skeleton');

const LatestEpisodes = React.memo(({ state, sectionTitle }) => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);

  const { rssAnimes, isLoading, error } = useRSSData({
    state,
    page: 1,
    perPage: 8,
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
        <div className="grid grid-cols-4 gap-8 w-full place-items-center">
          {isLoading || !rssAnimes
            ? Array.from({ length: 8 }).map((_, i) => (
              <EpisodeCardSkeleton key={i} />
            ))
            : rssAnimes.map((anime, i) => (
              <EpisodeCard
                key={i}
                anime={anime}
                isLoading={loadingEpisodeId === anime?.torrent?.infoHash}
                onPlay={() => handlePlay(anime)}
              />
            ))}
        </div>

        <div className="flex justify-center w-full">
          <button
            onClick={() => eventBus.emit('navigate', { path: '/latest-episodes' })}
            className="flex flex-col items-center mt-8 transition-opacity duration-300 hover:opacity-70 group"
          >
            {/* <span className="text-lg font-medium mb-2">Ver más</span> */}
            <Icon
              icon="gravity-ui:chevron-down"
              className="w-24 h-24 pointer-events-none transition-transform duration-300 group-hover:translate-y-1"
            />
          </button>
        </div>
      </div>
    </div>
  );
});

module.exports = LatestEpisodes;
