import { useEffect, useState } from 'react';

/**
 * Hook para resolver rutas de recursos (imágenes) en Electron y Web
 * Soporta:
 * - URLs HTTP/HTTPS
 * - Data URIs
 * - Nombres de archivo (se buscan en images/)
 * - Rutas relativas o absolutas
 */
export const useAssetPath = (fileName) => {
    const [assetPath, setAssetPath] = useState('');

    useEffect(() => {
        if (!fileName || typeof fileName !== 'string') {
            setAssetPath('');
            return;
        }

        const trimmedFileName = fileName.trim();

        // Si es una URL HTTP/HTTPS o data URI, usar directamente
        if (/^https?:/.test(trimmedFileName) || /^data:/.test(trimmedFileName)) {
            setAssetPath(trimmedFileName);
            return;
        }

        // Validar que sea un archivo de imagen
        if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(trimmedFileName)) {
            setAssetPath('');
            return;
        }

        const isElectron = window?.electronAPI !== undefined;

        if (isElectron) {
            // En Electron, usar protocolo custom app://
            setAssetPath(`app://images/${trimmedFileName}`);
        } else {
            // En desarrollo web, usar ruta relativa
            setAssetPath(`images/${trimmedFileName}`);
        }
    }, [fileName]);

    return assetPath;
};
