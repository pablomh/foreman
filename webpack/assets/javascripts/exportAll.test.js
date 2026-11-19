jest.mock('../../../config/plugin_api', () => ['common', 'redux/index']);

const { apiEntryFor, exportNameFor } = require('./exportAll');
const { exportKeyFor } = require('../../../config/plugin_import_key');

describe('exportNameFor', () => {
  it('flattens paths and drops the index suffix', () => {
    expect(exportNameFor('components/Foo/index')).toBe('components_Foo');
    expect(exportNameFor('common/helpers')).toBe('common_helpers');
  });
});

describe('exportKeyFor', () => {
  it('flattens a plugin import path', () => {
    expect(exportKeyFor('/components/HostsIndex')).toBe(
      'components_HostsIndex'
    );
    expect(exportKeyFor('/API')).toBe('API');
  });

  it('treats an index path as its directory', () => {
    expect(exportKeyFor('/components/HostsIndex/index')).toBe(
      'components_HostsIndex'
    );
  });
});

describe('apiEntryFor', () => {
  it('matches a declared file', () => {
    expect(apiEntryFor('redux/index')).toBe('redux/index');
  });

  it('matches only the declared module', () => {
    expect(apiEntryFor('common')).toBe('common');
    expect(apiEntryFor('common/helpers')).toBeUndefined();
  });

  it('excludes modules that are not declared', () => {
    expect(apiEntryFor('components/HostDetails/index')).toBeUndefined();
  });
});
