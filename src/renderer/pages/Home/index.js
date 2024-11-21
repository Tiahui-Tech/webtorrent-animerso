const React = require('react');
const { useState, useEffect } = require('react');
const eventBus = require('../../lib/event-bus');

const useAnimesData = require('../../hooks/useAnimesData');
const useValidateKey = require('../../hooks/useValidateKey');

const AnimeCarousel = require('../../components/anime/AnimeCarousel');
const LatestEpisodes = require('../../components/episode/LatestEpisodes');
const AnimeSection = require('../../components/anime/AnimeSection');
const Spinner = require('../../components/common/spinner');
const Activation = require('../../components/common/activation');

const Home = ({ state }) => {
  const animes = useAnimesData({ displayCount: 10 });
  const { isValid, isLoading, validateKey } = useValidateKey(state?.saved?.activation?.key);
  const needActivation = !state?.saved?.activation?.key || (state?.saved?.activation?.key && !isValid);

  useEffect(() => {
    if (!needActivation) {
      dispatch('updateDiscordRPC', { details: 'En el inicio' });
    }
  }, [needActivation]);

  useEffect(() => {
    if (state?.saved?.activation?.key) {
      validateKey();
    }
  }, [state?.saved?.activation?.key, validateKey]);

  if (isLoading) return <Spinner />;

  if (needActivation) {
    return <Activation isValid={isValid} />;
  }

  if (!animes) return <Spinner />;

  return (
    <div>
      <AnimeCarousel animes={animes} />
      <LatestEpisodes state={state} sectionTitle={'Ultimos Episodios'} />
      <AnimeSection
        state={state}
        sectionTitle={'Animes Populares'}
        searchTerm={''}
        fullScreen={false}
      />
    </div>
  );
};

module.exports = Home;
