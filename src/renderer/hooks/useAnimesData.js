const { useEffect, useState } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useAnimesData = ({ page = 1, perPage = 28, displayCount } = {}) => {
  const [animes, setAnimes] = useState(null);

  useEffect(() => {
    const fetchAnimes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/anime/list`);
        const data = await response.json();

        if (!data) {
          return;
        }
        
        // Apply pagination
        const startIndex = (page - 1) * perPage;
        const paginatedData = data.slice(startIndex, startIndex + perPage);
        
        // Apply display count if provided
        const finalData = displayCount ? paginatedData.slice(0, displayCount) : paginatedData;
        
        setAnimes(finalData);
      } catch (error) {
        console.error('Error fetching anime data:', error);
      }
    };

    fetchAnimes();
  }, [page, perPage, displayCount]);

  return animes;
};

module.exports = useAnimesData;
