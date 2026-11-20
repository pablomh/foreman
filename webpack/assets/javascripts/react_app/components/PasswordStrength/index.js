import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';

import * as actions from './PasswordStrengthActions';
import {
  doesPasswordsMatch,
  passwordPresent,
} from './PasswordStrengthSelectors';

import PasswordStrength from './PasswordStrength';

// map state to props
const mapStateToProps = ({ passwordStrength }) => ({
  doesPasswordsMatch: doesPasswordsMatch(passwordStrength),
  passwordPresent: passwordPresent(passwordStrength),
});

// map action dispatchers to props
const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch);

// export connected component
export default connect(mapStateToProps, mapDispatchToProps)(PasswordStrength);
