import React from 'react';
import { View } from 'react-native';

const MockView = (props) => <View {...props} />;

export const Marker = MockView;
export const Callout = MockView;
export const Circle = MockView;
export const Polyline = MockView;
export const Polygon = MockView;
export const UrlTile = MockView;
export const CustomStyle = {};
export const PROVIDER_GOOGLE = 'google';
export const PROVIDER_DEFAULT = 'default';

export default MockView;
