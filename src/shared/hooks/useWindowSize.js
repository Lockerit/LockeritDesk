import { useState, useEffect } from "react";

const fileName = "useWindowSize";

const log = (level, message) => {
  if (typeof window !== "undefined" && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

/**
 * @param {object|null} initialSize - Tamaño inicial pasado desde main-renderer
 */
export function useWindowSize(initialSize = null) {
  log("info", "hook useWindowSize montado");

  const [size, setSize] = useState(initialSize);

  const handler = ({ width, height }) => {
    const isPortrait = height > width;

    const baseWidth = isPortrait ? 1080 : 1920;
    const baseHeight = isPortrait ? 1920 : 1080;

    const scaleW = width / baseWidth;
    const scaleH = height / baseHeight;
    const factor = Math.min(scaleW, scaleH);

    log("info", `hook useWindowSize montado handler ${scaleW} ${scaleH} ${factor}`);

    setSize({
      width,
      height,
      orientation: isPortrait ? "portrait" : "landscape",
      factor: parseFloat(factor.toFixed(2)),
    });
  };

  useEffect(() => {
    if (window.electronAPI?.onScreenData) {
      log("info", `hook useWindowSize montado onScreenData`);
      window.electronAPI.onScreenData(handler);
    }
    return () => {
      if (window.electronAPI?.removeOnScreenData) {
        log("info", `hook useWindowSize montado onScreenData`);
        window.electronAPI.removeOnScreenData(handler);
      }
    };
  }, []);

  return size;
}
