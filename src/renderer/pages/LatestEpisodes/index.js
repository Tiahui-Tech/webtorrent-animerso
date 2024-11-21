const React = require('react');
const LatestEpisodes = require('../../components/episode/LatestEpisodes');

const LatestEpisodesPage = ({ state }) => (
  <div className='py-6'>
    <LatestEpisodes
      state={state}
      perPage={32}
      showViewMore={false}
      cardAnimation={true}
    />
  </div>
);

module.exports = LatestEpisodesPage;

