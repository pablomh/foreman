import { loadModule } from './useLazyModule';

describe('loadModule', () => {
  it('resolves the module once per loader', async () => {
    const module = { default: 'component' };
    const loader = jest.fn().mockResolvedValue(module);

    await expect(loadModule(loader)).resolves.toBe(module);
    await expect(loadModule(loader)).resolves.toBe(module);
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejected load so a retry can succeed', async () => {
    const module = { default: 'component' };
    const loader = jest
      .fn()
      .mockRejectedValueOnce(new Error('chunk failed'))
      .mockResolvedValue(module);

    await expect(loadModule(loader)).rejects.toThrow('chunk failed');
    await expect(loadModule(loader)).resolves.toBe(module);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
