import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DESIGN } from '@/constants/design';

export const Skeleton: React.FC<{ width?: any; height: number; rounded?: number }> = ({ width = '100%', height, rounded = 16 }) => (
  <View style={[s.skeletonBase, { width, height, borderRadius: rounded }]}>
    <LinearGradient
      colors={['transparent', DESIGN.bgCard, 'transparent']}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={{ flex: 1 }}
    />
  </View>
);

export const ResultSkeleton = () => (
  <View style={s.container}>
    <Skeleton height={120} rounded={24} />
    <Skeleton height={180} rounded={24} />
    <View style={s.row}>
      <Skeleton width="48%" height={100} rounded={24} />
      <Skeleton width="48%" height={100} rounded={24} />
    </View>
    <Skeleton height={150} rounded={24} />
  </View>
);

const s = StyleSheet.create({
  skeletonBase: { backgroundColor: DESIGN.bgSurface, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: DESIGN.borderDefault },
  container: { padding: 24, flex: 1 },
  row: { flexDirection: 'row', gap: 16 }
});
