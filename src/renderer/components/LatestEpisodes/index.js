const React = require('react');
const useRSSData = require('../../hooks/useRSSData');

const EpisodeCard = require('./episode-card');
const EpisodeCardSkeleton = require('./episode-card-skeleton');

const LatestEpisodes = ({ state, sectionTitle }) => {
  const rssAnimes = useRSSData({
    page: 1,
    perPage: 10,
    displayCount: 8
  });

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">{sectionTitle}</h2>
      <div className="grid grid-cols-4 auto-cols-max gap-8 justify-center items-center">
        {!rssAnimes &&
          Array.from({ length: 8 }).map((_, index) => (
            <EpisodeCardSkeleton key={`skeleton-${index}`} />
          ))}
        {rssAnimes &&
          rssAnimes.map((anime, i) => (
            <EpisodeCard
              key={`rss-${anime.id}-${i}`}
              anime={anime}
              state={state}
            />
          ))}
      </div>
    </div>
  );
};

module.exports = LatestEpisodes;