const RETRY_KEY = 'foreman-chunk-load-retry';

export const CHUNK_LOAD_RETRY_WINDOW_MS = 10000;

export const shouldReloadForChunkError = (now = Date.now()) => {
  try {
    const lastRetry = Number(sessionStorage.getItem(RETRY_KEY)) || 0;
    if (now - lastRetry > CHUNK_LOAD_RETRY_WINDOW_MS) {
      sessionStorage.setItem(RETRY_KEY, String(now));
      return true;
    }
  } catch (e) {
    // storage unavailable: fall through to the error UI
  }
  return false;
};
