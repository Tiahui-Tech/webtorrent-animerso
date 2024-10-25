const React = require('react');

const { Icon } = require('@iconify/react');
const { Card, CardBody, Image } = require('@nextui-org/react');
const { motion } = require('framer-motion');

const EpisodeCard = React.memo(({ episode, isLoading, onPlay }) => {
  const episodeHasTorrent = episode?.torrent ? true : false;

  const handlePlay = (e) => {
    e.preventDefault();
    onPlay(episode);
  };

  const episodeTitle = episode?.title?.en || episode?.torrent?.title;
  const episodeSubtitle = episode?.title?.ja || episodeTitle;
  const episodeNumber = episode?.episodeNumber || episode?.episode;
  const episodeDate = episode?.torrent?.date || episode?.airDateUtc || episode?.airDate || episode?.airdate;

  return (
    <motion.div
      onClick={handlePlay}
      viewport={{ once: true }}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      whileHover={{ scale: 1.05 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20,
        opacity: { delay: 0.3 }
      }}
      className="w-full overflow-visible"
    >
      <Card
        className="w-full h-full relative transition-all duration-300 ease-in-out cursor-pointer group/card bg-zinc-950 rounded-xl border-2 border-zinc-900"
        style={{ zIndex: 9000 }}
      >
        <CardBody className="flex flex-row relative gap-4 justify-start overflow-hidden">
          <div className="flex flex-row gap-4 items-center justify-between w-full overflow-hidden">
            <div className="flex flex-row gap-4 items-center flex-grow min-w-0 overflow-hidden">
              <div className="relative min-w-[227px]">
                <Image
                  alt="episode-image"
                  src={episode.image}
                  className={`aspect-video object-cover w-auto h-32 transition-all duration-300 ease-in-out z-20 group-hover/card:brightness-[120%] group-hover/card:blur-[5px] group-hover/card:opacity-70 ${!episodeHasTorrent && 'group-hover/card:grayscale'}`}
                />
                {!episodeHasTorrent && <div
                  className="absolute inset-0 bg-white rounded-2xl z-10"
                />}
                <div
                  className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out z-30 ${isLoading ? 'opacity-70' : 'opacity-0 group-hover/card:opacity-70'}`}
                  style={{
                    zIndex: 9999
                  }}
                >
                  {isLoading ? (
                    <Icon
                      icon="fluent:spinner-ios-16-filled"
                      width="64"
                      height="64"
                      className="animate-spin"
                      style={{ color: '#000' }}
                    />
                  ) : episodeHasTorrent ? (
                    <Icon icon="gravity-ui:play-fill" className="pointer-events-none" width="64" height="64" style={{ color: '#000' }} />
                  ) : (
                    <p className="text-black text-xl font-bold">No disponible...</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 min-w-0 flex-grow overflow-hidden">
                <p className="text-3xl font-medium truncate">
                  {`E${episodeNumber}`}{episodeTitle && ` - ${episodeTitle}`}
                </p>
                <span className="text-xl text-gray-400 truncate">{episodeSubtitle}</span>
              </div>
            </div>

            <div className="flex flex-col gap-6 justify-between items-end">
              <div className="flex flex-row gap-1">
                <span className="text-base text-gray-400">
                  {episode.rating || 'N/A'}
                </span>
                <Icon
                  icon="gravity-ui:star"
                  width="16"
                  height="16"
                  className="text-gray-400"
                  style={{ marginTop: 4 }}
                />
              </div>
              <div className="flex flex-row gap-1">
                <span className="text-base text-gray-400">
                  {episode.length || '??'}
                  {' mins'}
                </span>
                <Icon
                  icon="gravity-ui:clock"
                  width="16"
                  height="16"
                  className="text-gray-400"
                  style={{ marginTop: 5 }}
                />
              </div>
              <div className="flex flex-row gap-1">
                <span className="text-base text-gray-400">
                  {new Date(episodeDate).toLocaleDateString() || 'N/A'}
                </span>
                <Icon
                  icon="gravity-ui:calendar"
                  width="16"
                  height="16"
                  className="text-gray-400"
                  style={{ marginTop: 4 }}
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
});

module.exports = EpisodeCard;
