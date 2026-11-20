import { routes } from '../routes';
import models from '../Models';
import filters from '../FiltersForm';
import {
  MODELS_PATH,
  MODELS_PATH_BY_ID,
  MODELS_PATH_EDIT,
  MODELS_PATH_NEW,
} from '../Models/constants';
import { FILTERS_PATH_EDIT, FILTERS_PATH_NEW } from '../FiltersForm/constants';

const declaredPaths = new Set(routes.map(route => route.path));

describe.each([
  [
    'Models',
    models,
    [MODELS_PATH, MODELS_PATH_NEW, MODELS_PATH_EDIT, MODELS_PATH_BY_ID],
  ],
  ['FiltersForm', filters, [FILTERS_PATH_NEW, FILTERS_PATH_EDIT]],
])('%s route module', (_name, moduleRoutes, expectedPaths) => {
  it('declares its paths from the shared constants', () => {
    expect(moduleRoutes.map(route => route.path)).toEqual(expectedPaths);
  });

  it('is registered in the route table', () => {
    moduleRoutes.forEach(route => {
      expect(declaredPaths.has(route.path)).toBe(true);
      expect(typeof route.render).toBe('function');
    });
  });
});
