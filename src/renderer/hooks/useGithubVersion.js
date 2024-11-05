const { useEffect, useState } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useGithubVersion = (version = 'latest') => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/github/${version}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        setError(error.message);
        console.error('Error fetching version data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersion();
  }, [version]);

  return { data, isLoading, error };
};

module.exports = useGithubVersion;
