const React = require('react');
const { useState } = React;

const TorrentPlayer = require('../../../../lib/torrent-player');
const { sendNotification } = require('../../../../lib/errors');

const EpisodeCard = require('./episode');
const EpisodeCardSkeleton = require('./skeleton');

const EpisodesList = React.memo(({ episodesData, isLoading, animeColors, textColor }) => {
  const [loadingEpisodeId, setLoadingEpisodeId] = useState(null);

  const isWithinLastSixDays = (dateStr) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays <= 6;
  };

  // Find most recent episode within last 6 days
  const sortedEpisodes = [...episodesData].sort((a, b) => {
    const aDate = new Date(a?.torrent?.date || 0);
    const bDate = new Date(b?.torrent?.date || 0);
    const isRecentA = isWithinLastSixDays(a?.torrent?.date);

    if (isRecentA && aDate > bDate) {
      return -1;
    }
    return 0;
  });

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
          : sortedEpisodes.map((episode, i) => (
            <EpisodeCard
              episode={episode}
              key={`episode-${episode.episodeNumber}-${i}`}
              isLoading={loadingEpisodeId === episode?.torrent?.hash}
              isNew={isWithinLastSixDays(episode?.torrent?.date)}
              animeColors={animeColors}
              textColor={textColor}
              onPlay={() => handlePlay(episode)}
            />
          ))}
      </div>
    </div>
  );
});

module.exports = EpisodesList;
