const { useState, useEffect } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useDiscordUser = (discordId) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDiscordUser = async () => {
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/user/discord/${discordId}`);
        const result = await response.json();

        if (result.error) {
          return setError(result.message);
        }

        setData(result);
      } catch (err) {
        console.error('Error fetching Discord user:', err);
        setError(err.message || 'Ocurrió un error al obtener el usuario de Discord');
      } finally {
        setIsLoading(false);
      }
    };

    if (discordId) {
      fetchDiscordUser();
      const interval = setInterval(fetchDiscordUser, 60000);
      
      return () => clearInterval(interval);
    }
  }, [discordId]);

  return { data, isLoading, error };
};

module.exports = useDiscordUser;
