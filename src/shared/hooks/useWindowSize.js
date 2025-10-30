// shared/hooks/useWindowSize.js
import { useEffect, useRef, useState } from "react";

function calcSize({ width, height }) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }
  const isPortrait = height > width;
  const baseWidth = isPortrait ? 1080 : 1920;
  const baseHeight = isPortrait ? 1920 : 1080;
  const scaleW = width / baseWidth;
  const scaleH = height / baseHeight;
  const factor = Math.max(0.1, Math.min(5, Math.min(scaleW, scaleH))); // [0.1, 5] defensivo
  return {
    width,
    height,
    orientation: isPortrait ? "portrait" : "landscape",
    factor: Number(factor.toFixed(2)),
  };
}

/**
 * @param {{width:number,height:number}|null} initialSize Tamaño inicial (opcional)
 */
export function useWindowSize(initialSize = null) {
  // Estado inicial: si no hay initialSize y estamos en navegador, usar viewport actual
  const initial =
    initialSize?.width && initialSize?.height
      ? calcSize(initialSize)
      : (typeof window !== "undefined" ? calcSize({ width: window.innerWidth, height: window.innerHeight }) : null);

  const [size, setSize] = useState(initial);
  const rafId = useRef(0);
  const electronUnsubRef = useRef(null);

  // Handler común
  const handleUpdate = ({ width, height }) => {
    const next = calcSize({ width, height });
    if (!next) return;
    setSize(prev => {
      if (!prev) return next;
      // evita renders si no cambia algo relevante
      if (
        prev.width === next.width &&
        prev.height === next.height &&
        prev.orientation === next.orientation &&
        prev.factor === next.factor
      ) {
        return prev;
      }
      return next;
    });
  };

  // Listener de window.resize con rAF
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(() => {
        handleUpdate({ width: window.innerWidth, height: window.innerHeight });
      });
    };

    window.addEventListener("resize", onResize);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Canal Electron: onScreenData
  useEffect(() => {
    if (typeof window === "undefined") return;

    const api = window.electronAPI;
    if (!api?.onScreenData) return;

    // onScreenData puede devolver un unsubscribe o depender de removeOnScreenData
    const maybeUnsub = api.onScreenData(({ width, height }) => handleUpdate({ width, height }));
    if (typeof maybeUnsub === "function") {
      electronUnsubRef.current = maybeUnsub;
      return () => {
        try { electronUnsubRef.current?.(); } catch { /* noop */ }
        electronUnsubRef.current = null;
      };
    }

    // Fallback: usar removeOnScreenData(handler)
    const fallbackHandler = ({ width, height }) => handleUpdate({ width, height });
    if (api.removeOnScreenData) {
      // Ya nos suscribimos arriba; aquí solo definimos cleanup con el mismo handler si la API lo requiere
      return () => {
        try { api.removeOnScreenData(fallbackHandler); } catch { /* noop */ }
      };
    }

    // Si no hay mecanismo de desuscripción, no hacemos nada en cleanup
    return () => { };
  }, []);

  return size;
}
