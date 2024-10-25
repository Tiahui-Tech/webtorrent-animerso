const React = require('react');
const { useState, useMemo } = React;
const { Divider, Button } = require('@nextui-org/react');
const { Icon } = require('@iconify/react');
const { motion } = require('framer-motion');

const useAnimeEpisodesData = require('../../../hooks/useAnimeEpisodesData');

const EpisodesList = require('./List');

const AnimeEpisodesList = ({ idAnilist, animeColors, sectionTitle }) => {
  const { episodes: episodesData, isLoading } = useAnimeEpisodesData(idAnilist, true);
  const [isReversed, setIsReversed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = () => {
    setIsReversed(!isReversed);
  };

  const filteredAndSortedEpisodes = useMemo(() => {
    if (!Array.isArray(episodesData)) {
      return [];
    }

    let result = [...episodesData];

    if (searchTerm) {
      result = result.filter((episode) => {
        const episodeTitle = episode?.title?.en?.toLowerCase() || '';
        const episodeNumber = episode?.episodeNumber || episode?.episode || '';
        const episodeFullTitle = `${episodeNumber} ${episodeTitle}`.trim();

        return episodeFullTitle.includes(searchTerm.toLowerCase());
      });
    }

    return isReversed ? result.reverse() : result;
  }, [episodesData, isReversed, searchTerm]);

  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
  };

  const isEpisodesDataEmpty = filteredAndSortedEpisodes.length === 0;

  return (
    <div className="flex flex-col gap-2 justify-start w-full z-30 overflow-hidden">
      <div className="flex flex-row w-full justify-between items-start">
        <h2 className="text-2xl font-semibold mt-2">{sectionTitle}</h2>
        <div className="flex flex-row gap-2">
          <Button
            size="md"
            startContent={
              <Icon
                icon={
                  isReversed
                    ? 'gravity-ui:bars-descending-align-left-arrow-up'
                    : 'gravity-ui:bars-ascending-align-left-arrow-down'
                }
              />
            }
            onClick={handleSort}
          >
            {isReversed ? 'Menor a mayor' : 'Mayor a menor'}
          </Button>

          <div className="relative inline-block">
            <input
              type="text"
              className=" h-10 py-2 pl-8 pr-4 w-64 text-white placeholder-white placeholder-opacity-70 rounded-full focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
              placeholder="Buscar"
              value={searchTerm}
              onChange={handleSearch}
            />
            <Icon
              icon="gravity-ui:magnifier"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white"
            />
          </div>
        </div>
      </div>

      <Divider orientation="horizontal" />

      <div>
        {isEpisodesDataEmpty && !isLoading ? (
          <motion.div
            className="flex flex-col justify-center items-center w-full min-h-[400px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Icon icon="gravity-ui:circle-xmark" width="128" height="128" style={{ color: '#d1d5db ' }} />
            <p className="text-2xl font-bold text-gray-300">No se encontraron episodios</p>
          </motion.div>
        ) : (
          <EpisodesList
            episodesData={filteredAndSortedEpisodes}
            isLoading={isLoading}
            animeColors={animeColors}
          />
        )}
      </div>
    </div>
  );
};

module.exports = AnimeEpisodesList;
