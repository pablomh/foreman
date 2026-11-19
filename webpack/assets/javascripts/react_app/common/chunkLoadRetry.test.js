import { MAX_CHUNK_RELOADS, shouldReloadForChunkError } from './chunkLoadRetry';
import { loadModule } from './lazyModule';

describe('shouldReloadForChunkError', () => {
  beforeEach(() => sessionStorage.clear());

  it('reloads until the attempt limit and then shows the error UI', () => {
    for (let attempt = 1; attempt <= MAX_CHUNK_RELOADS; attempt += 1) {
      expect(shouldReloadForChunkError()).toBe(true);
    }
    expect(shouldReloadForChunkError()).toBe(false);
  });

  it('does not refill the budget when another chunk loads', async () => {
    for (let attempt = 1; attempt <= MAX_CHUNK_RELOADS; attempt += 1) {
      expect(shouldReloadForChunkError()).toBe(true);
    }

    await loadModule(jest.fn().mockResolvedValue({ default: 'healthy' }));

    expect(shouldReloadForChunkError()).toBe(false);
  });
});
