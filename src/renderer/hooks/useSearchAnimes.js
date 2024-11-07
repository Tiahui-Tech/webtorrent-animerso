const { useCallback, useState } = require('react');
const eLog = require('electron-log');
const { API_BASE_URL } = require('../../constants/config');

const useSearchAnimes = (query, limit = 1) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState([]);

  const searchAnimes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/anime/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeName: query, limit }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const result = await response.json();
      setData(result);
      return result;
    } catch (error) {
      eLog.error('Error searching animes:', error);
      console.error('Error searching animes:', error)

      if (error?.message?.includes('signal')) {
        setError('Ocurrio un error, intentelo de nuevo');
      } else {
        setError('Error: ' + error.message);
      }
      
      setData([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [query, limit]);

  return {
    searchAnimes,
    isLoading,
    error,
    data
  };
};

module.exports = useSearchAnimes;
