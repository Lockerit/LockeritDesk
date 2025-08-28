import { useState, useEffect } from 'react';

export function useWindowSize() {
  const getSize = () => ({
    width: window.innerWidth,
    height: window.innerHeight,
    factor: window.innerWidth / 1920,
  });

  const [size, setSize] = useState(getSize);

  useEffect(() => {
    const handleResize = () => setSize(getSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}

