import { createContext } from 'react';
import forceSingleton from '../../../common/forceSingleton';

export const ForemanActionsBarContext = forceSingleton(
  'ActionsBarContext',
  () => createContext()
);
