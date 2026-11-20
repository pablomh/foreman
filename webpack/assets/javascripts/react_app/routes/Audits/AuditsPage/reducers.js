import { combineReducers } from 'redux';
import withQueryReducer from '../../common/reducerHOC/withQueryReducer';
import withDataReducer from '../../common/reducerHOC/withDataReducer';

export default combineReducers({
  data: withDataReducer('AUDITS_PAGE'),
  query: withQueryReducer('AUDITS_PAGE'),
});
