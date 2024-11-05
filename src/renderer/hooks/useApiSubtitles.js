const { useState, useCallback } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useApiSubtitles = (infoHash) => {
  const [subtitles, setSubtitles] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubtitles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/subtitles/${infoHash}`);
      const result = await response.text();

      if (!result) {
        return setError('No se encontraron subtítulos');
      }

      const parsedResult = {
        infoHash,
        buffer: 'data:text/vtt;base64,' + Buffer.from(result).toString('base64'),
        label: 'Español Latino',
        filePath: `memory:${infoHash}`
      }

      setSubtitles(parsedResult);
    } catch (err) {
      console.error('Error fetching subtitles:', err);
      setError(err.message || 'Ocurrió un error al obtener los subtítulos');
    } finally {
      setIsLoading(false);
    }
  }, [infoHash]);

  return { subtitles, isLoading, error, fetchSubtitles };
};

module.exports = useApiSubtitles;
