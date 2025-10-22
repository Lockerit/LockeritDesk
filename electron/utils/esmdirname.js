import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const filename = (metaUrl) => fileURLToPath(metaUrl);
export const dirname = (metaUrl) => path.dirname(filename(metaUrl));
