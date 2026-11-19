import { combineReducers } from 'redux';
import { connectRouter } from 'connected-react-router';
import history from '../../history';
import hosts from './hosts';
import notifications from './notifications';
import passwordStrengthReducer from '../../components/PasswordStrength/PasswordStrengthReducer';
import { reducers as breadcrumbBarReducers } from '../../components/BreadcrumbBar';
import { reducers as layoutReducers } from '../../components/Layout';
import { reducers as diffModalReducers } from '../../components/ConfigReports/DiffModal';
import editorReducer from '../../components/Editor/EditorReducer';
import { reducers as templateGenerationReducers } from '../../components/TemplateGenerator';
import { reducers as fillReducers } from '../../components/common/Fill';
import auditsPageReducer from '../../routes/Audits/AuditsPage/reducers';
import { reducers as intervalReducers } from '../middlewares/IntervalMiddleware';
import { reducers as bookmarksPF4Reducers } from '../../components/PF4/Bookmarks';
import { reducers as apiReducer } from '../API';
import { reducers as settingRecordsReducers } from '../../components/SettingRecords';
import { reducers as personalAccessTokensReducers } from '../../components/users/PersonalAccessTokens';
import { reducers as confirmModalReducers } from '../../components/ConfirmModal';
import { reducers as toastsListReducers } from '../../components/ToastsList';

export function combineReducersAsync(asyncReducers) {
  return combineReducers({
    ...bookmarksPF4Reducers,
    hosts,
    notifications,
    ...toastsListReducers,
    passwordStrength: passwordStrengthReducer,
    ...breadcrumbBarReducers,
    ...layoutReducers,
    ...asyncReducers,
    ...diffModalReducers,
    editor: editorReducer,
    ...templateGenerationReducers,
    ...settingRecordsReducers,
    ...personalAccessTokensReducers,
    ...confirmModalReducers,

    router: connectRouter(history),
    // Pages
    ...fillReducers,
    auditsPage: auditsPageReducer,

    // Middlewares
    ...intervalReducers,
    ...apiReducer,
  });
}

export default combineReducersAsync();
