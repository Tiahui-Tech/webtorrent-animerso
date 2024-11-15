const { useEffect, useState, useCallback, useRef } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const RETRY_INTERVAL = 2500;
const UPDATE_INTERVAL = 15000;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const ERROR_MESSAGE = 'No se encontraron los ultimos episodios';

// Global cache object
const cache = {};

const useRSSData = ({ page, perPage, emptyState }) => {
  const [rssAnimes, setRSSAnimes] = useState(emptyState ? Array.from({ length: perPage }) : null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const cacheKey = useRef(`${page}-${perPage}`);
  const previousDataRef = useRef(null);

  const fetchRSSAnimes = useCallback(async (bypassCache = false) => {
    const now = Date.now();
    // Check if cached data is still valid
    if (!bypassCache && cache[cacheKey.current] && now - cache[cacheKey.current].timestamp < CACHE_DURATION) {
      // Only update state if the cached data is different from the previous data
      if (JSON.stringify(cache[cacheKey.current].data) !== JSON.stringify(previousDataRef.current)) {
        setIsLoading(true);
        setRSSAnimes(cache[cacheKey.current].data);
        previousDataRef.current = cache[cacheKey.current].data;
        setIsLoading(false);
      }
      return true;
    }

    try {
      // Fetch new data from the API
      const response = await fetch(`${API_BASE_URL}/anime/rss?page=${page}&perPage=${perPage}&withHevc=true`);
      if (!response.ok) throw new Error(ERROR_MESSAGE);
      const rssAnimesData = await response.json();

      if (rssAnimesData.length === 0) {
        throw new Error(ERROR_MESSAGE);
      }

      if (rssAnimesData.length > 1) {
        // Only update state if the new data is different from the previous data
        if (JSON.stringify(rssAnimesData) !== JSON.stringify(previousDataRef.current)) {
          setIsLoading(true);
          setRSSAnimes(rssAnimesData);
          previousDataRef.current = rssAnimesData;
          // Update the cache with the new data
          cache[cacheKey.current] = { data: rssAnimesData, timestamp: now };
          setIsLoading(false);
        }
        return true;
      }
      return false;
    } catch (error) {
      setError(error.message);
      return false;
    }
  }, [page, perPage]);

  useEffect(() => {
    let intervalId;

    // Function to set up the fetch interval
    const setupFetchInterval = (interval) => {
      clearInterval(intervalId);
      intervalId = setInterval(async () => {
        // Fetch data and check if it was successful
        const success = await fetchRSSAnimes(interval === UPDATE_INTERVAL);
        // If successful and currently in retry mode, switch to regular update interval
        if (success && interval === RETRY_INTERVAL) {
          setupFetchInterval(UPDATE_INTERVAL);
        }
      }, interval);
    };

    // Initial fetch and setup
    fetchRSSAnimes();
    setupFetchInterval(RETRY_INTERVAL);

    // Cleanup function to clear the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, [fetchRSSAnimes]);

  return { rssAnimes, isLoading, error };
};

module.exports = useRSSData;
