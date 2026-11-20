import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ErrorBoundary from './index';
import {
  MAX_CHUNK_RELOADS,
  shouldReloadForChunkError,
} from '../../../common/chunkLoadRetry';

jest.mock('../../../common/helpers', () => ({
  ...jest.requireActual('../../../common/helpers'),
  reloadPage: jest.fn(),
}));

const { reloadPage } = require('../../../common/helpers');

const ChunkFailure = () => {
  const error = new Error('Loading chunk 123 failed.');
  error.name = 'ChunkLoadError';
  throw error;
};

const renderBoundary = () =>
  render(
    <ErrorBoundary fallback={({ error }) => <div>{error.message}</div>}>
      <ChunkFailure />
    </ErrorBoundary>
  );

describe('ErrorBoundary chunk reload', () => {
  beforeEach(() => {
    sessionStorage.clear();
    reloadPage.mockClear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  it('reloads while the budget lasts', () => {
    renderBoundary();

    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByText('Loading chunk 123 failed.')
    ).not.toBeInTheDocument();
  });

  it('shows the fallback once the budget is exhausted', () => {
    for (let attempt = 0; attempt < MAX_CHUNK_RELOADS; attempt += 1) {
      shouldReloadForChunkError();
    }

    renderBoundary();

    expect(reloadPage).not.toHaveBeenCalled();
    expect(screen.getByText('Loading chunk 123 failed.')).toBeInTheDocument();
  });
});
