import { getValue, setValue } from './SessionStorage';

const RETRY_KEY = 'foreman-chunk-load-retry';

export const MAX_CHUNK_RELOADS = 2;

export const shouldReloadForChunkError = () => {
  const attempts = Number(getValue(RETRY_KEY)) || 0;
  if (attempts >= MAX_CHUNK_RELOADS) return false;
  setValue(RETRY_KEY, attempts + 1);
  return true;
};
