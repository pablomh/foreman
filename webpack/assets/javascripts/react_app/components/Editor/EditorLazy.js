import React from 'react';
import LazyComponent from '../common/LazyComponent';

const loader = () => import('./index');

const EditorLazy = props => <LazyComponent loader={loader} {...props} />;

export default EditorLazy;
