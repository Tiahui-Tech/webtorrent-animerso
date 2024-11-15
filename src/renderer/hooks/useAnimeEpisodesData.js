const { useEffect, useState, useCallback } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useAnimeEpisodesData = (idAnilist, withTorrents = false) => {
  const defaultEpisodes = Array.from({ length: 8 });
  const [episodes, setEpisodes] = useState(defaultEpisodes);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnimeEpisodes = useCallback(async () => {
    if (!idAnilist) return;
    setIsLoading(true);
    setEpisodes(defaultEpisodes); // Restart episodes array
    try {
      const response = await fetch(`${API_BASE_URL}/anime/episodes/${idAnilist}?torrents=${withTorrents}&withHevc=true`);
      const data = await response.json();
      setEpisodes(data.episodes);
    } catch (error) {
      console.error('Error fetching anime data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [idAnilist, withTorrents]);

  useEffect(() => {
    fetchAnimeEpisodes();
  }, [fetchAnimeEpisodes]);

  return { episodes, isLoading };
};

module.exports = useAnimeEpisodesData;