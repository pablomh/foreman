import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import LazyComponent, { lazyComponent } from './index';

const loaderFor = text =>
  jest.fn().mockResolvedValue({
    default: ({ label }) => <span>{`${text} ${label}`}</span>,
  });

describe('LazyComponent', () => {
  it('shows a spinner until the module resolves', async () => {
    const loader = loaderFor('loaded');

    render(<LazyComponent loader={loader} label="value" />);

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(await screen.findByText('loaded value')).toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

describe('lazyComponent', () => {
  it('wraps a loader and forwards props', async () => {
    const Component = lazyComponent(loaderFor('wrapped'), 'Wrapped');

    expect(Component.displayName).toBe('Wrapped');
    render(<Component label="value" />);

    expect(await screen.findByText('wrapped value')).toBeInTheDocument();
  });
});
