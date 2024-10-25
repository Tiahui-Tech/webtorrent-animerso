const { useEffect, useState, useCallback } = require('react');
const { API_BASE_URL } = require('../../constants/config');

const useCanvasRpcFrame = ({ imageUrl }) => {
  const [frame, setFrame] = useState(null);

  const genFrame = useCallback(async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(`${API_BASE_URL}/canvas/anime?imageUrl=${encodeURIComponent(imageUrl)}`);
      const data = await response.json();
      setFrame(data.url);
    } catch (error) {
      setFrame(null);
    }
  }, [imageUrl]);

  useEffect(() => {
    genFrame();
  }, [genFrame]);

  return frame;
};

module.exports = useCanvasRpcFrame;
