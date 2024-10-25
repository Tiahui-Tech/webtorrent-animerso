const React = require('react');
const { useState } = React;

const TorrentPlayer = require('../../../../lib/torrent-player');
const { sendNotification } = require('../../../../lib/errors');

const EpisodeCard = require('./episode');
const EpisodeCardSkeleton = require('./skeleton');

const EpisodesList = React.memo(({ episodesData, isLoading, animeColors }) => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);

  const handlePlay = (episode) => {
    const infoHash = episode?.torrent?.hash;
    if (!infoHash) {
      return sendNotification(state, { message: 'Episodio no disponible.' });
    }

    if (loadingEpisodeId) {
      return sendNotification(state, { title: 'Wow, espera!', message: 'Ya estamos cargando un episodio.', type: 'alert' });
    }

    setLoadingEpisodeId(infoHash);
    TorrentPlayer.playTorrent(episode, state, setLoadingEpisodeId);
  };

  return (
    <div className="relative w-full">
      <div className="flex flex-col gap-4 p-4 px-8">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
            <EpisodeCardSkeleton color={animeColors[0]} key={i} />
          ))
          : episodesData.map((episode, i) => (
            <EpisodeCard
              episode={episode}
              key={`episode-${episode.episodeNumber}-${i}`}
              isLoading={loadingEpisodeId === episode?.torrent?.hash}
              onPlay={() => handlePlay(episode)}
            />
          ))}
      </div>
    </div>
  );
});

module.exports = EpisodesList;
