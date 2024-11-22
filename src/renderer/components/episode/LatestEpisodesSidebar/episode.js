const React = require('react');
const { memo } = React;
const { Icon } = require('@iconify/react');
const { Image, Tooltip } = require('@nextui-org/react');


const Episode = memo(({ anime, isLoading, onPlay }) => {

  const episodeImage =
    anime?.episode?.image ||
    anime?.bannerImage ||
    anime?.coverImage?.extraLarge;

  const episodeDuration = anime?.duration || anime?.episode?.runtime || anime?.episode?.length
  const episodeTorrentLink = anime?.torrent?.link.toLowerCase();
  const hevcTorrent = anime?.torrentHevc

  const episode = anime?.episode;

  const handlePlay = (e) => {
    e.preventDefault();
    onPlay();
  }

  const handleAnimeClick = () => {
    navigate(`/anime/${anime.idAnilist}`, {
      state: { title: anime.title.romaji }
    });
  };

  return (
    <div className="inline-block" style={{ width: 'min-content' }}>
      <div
        className="flex flex-col w-[227px] max-w-[227px]"
        onClick={handlePlay}
      >
        <div className="relative cursor-pointer transition-all duration-300">
          <Image
            alt="episode-image"
            src={episodeImage}
            className={`aspect-video object-cover w-auto h-32 ${isLoading && 'grayscale'}`}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 ease-in-out shadow-current hover:opacity-50 z-10">
            <Icon icon="gravity-ui:play-fill" className="pointer-events-none" width="64" height="64" style={{ color: '#000' }} />
          </div>
          {hevcTorrent && <Tooltip content="Cargará hasta 3 veces más rápido por usar el códec HEVC" className="bg-zinc-900 text-white" >
            <Icon
              icon="akar-icons:thunder"
              width="26"
              height="26"
              style={{ color: 'white' }}
              className="absolute top-2 left-2 z-20"
            />
          </Tooltip>}
          {episodeTorrentLink.includes('(nf)') && (
            <Tooltip content="Netflix Subs" className="bg-zinc-900 text-white" >
              <Icon
                icon="streamline:netflix"
                width="24"
                height="24"
                style={{ color: 'white', filter: 'drop-shadow(0 0 10px rgba(0, 0, 0, 0.5))' }}
                className="absolute top-2 right-2 z-20"
              />
            </Tooltip>
          )}
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center opacity-100 z-10">
              <Icon
                icon="fluent:spinner-ios-16-filled"
                width="64"
                height="64"
                className="animate-spin"
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 ease-in-out shadow-current hover:opacity-50">
              <Icon icon="gravity-ui:play-fill" className="pointer-events-none" width="64" height="64" />
            </div>
          )}
        </div>
        <div className="flex flex-row justify-between mt-1 overflow-hidden">
          <p className="text-base text-left font-medium truncate flex-grow min-w-0" onClick={handleAnimeClick}>
            {`${anime?.title?.romaji}`}
          </p>
          {episodeDuration && (
            <p className="text-base text-right text-gray-400 whitespace-nowrap ml-2 flex-shrink-0">
              {`${episodeDuration} mins`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

module.exports = Episode;
