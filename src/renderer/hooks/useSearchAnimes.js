const { useMemo } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useSearchAnimes = (query, limit = 1) => {
  return useMemo(() => {
    const searchAnimes = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); 

        const response = await fetch(`${API_BASE_URL}/anime/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ animeName: query, limit }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        return await response.json();
      } catch (error) {
        console.error('Error fetching anime data:', error);
        return [];
      }
    };

    return searchAnimes;
  }, [query]);
};

module.exports = useSearchAnimes;
