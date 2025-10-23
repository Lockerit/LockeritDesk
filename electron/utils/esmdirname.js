import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const filename = (metaUrl) => fileURLToPath(metaUrl);
export const dirname = (metaUrl) => path.dirname(filename(metaUrl));
