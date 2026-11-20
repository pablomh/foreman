import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import useLazyModule from './useLazyModule';
import { loadModule } from '../lazyModule';

const Show = ({ loader }) => {
  const module = useLazyModule(loader);
  return <span>{module ? module.default : 'loading'}</span>;
};

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

  it('does not cache a synchronously throwing loader', async () => {
    const module = { default: 'component' };
    const loader = jest
      .fn()
      .mockImplementationOnce(() => {
        throw new Error('sync failure');
      })
      .mockResolvedValue(module);

    await expect(loadModule(loader)).rejects.toThrow('sync failure');
    await expect(loadModule(loader)).resolves.toBe(module);
    expect(loader).toHaveBeenCalledTimes(2);
  });
});

describe('useLazyModule', () => {
  it('stops re-rendering once a falsy module has settled', async () => {
    let renders = 0;
    const Falsy = ({ loader }) => {
      renders += 1;
      useLazyModule(loader);
      return <span>loading</span>;
    };
    const loader = jest.fn().mockResolvedValue(undefined);

    render(<Falsy loader={loader} />);
    await waitFor(() => expect(loader).toHaveBeenCalled());
    const settledRenders = renders;

    await new Promise(resolve => setTimeout(resolve, 25));

    expect(renders).toBe(settledRenders);
  });

  it('loads the new module when the loader prop changes', async () => {
    const loadA = jest.fn().mockResolvedValue({ default: 'A' });
    const loadB = jest.fn().mockResolvedValue({ default: 'B' });

    const { rerender } = render(<Show loader={loadA} />);
    expect(await screen.findByText('A')).toBeInTheDocument();

    rerender(<Show loader={loadB} />);

    expect(await screen.findByText('B')).toBeInTheDocument();
    expect(loadB).toHaveBeenCalledTimes(1);
  });
});
