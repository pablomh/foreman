import {
  CHUNK_LOAD_RETRY_WINDOW_MS,
  shouldReloadForChunkError,
} from './chunkLoadRetry';

const NOW = 1_700_000_000_000;

describe('shouldReloadForChunkError', () => {
  beforeEach(() => sessionStorage.clear());

  it('reloads on the first chunk error', () => {
    expect(shouldReloadForChunkError(NOW)).toBe(true);
  });

  it('does not reload again inside the window', () => {
    shouldReloadForChunkError(NOW);
    expect(
      shouldReloadForChunkError(NOW + CHUNK_LOAD_RETRY_WINDOW_MS - 1)
    ).toBe(false);
  });

  it('reloads again after the window', () => {
    shouldReloadForChunkError(NOW);
    expect(
      shouldReloadForChunkError(NOW + CHUNK_LOAD_RETRY_WINDOW_MS + 1)
    ).toBe(true);
  });
});
