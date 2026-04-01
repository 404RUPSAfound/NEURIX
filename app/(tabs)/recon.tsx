import React from 'react';
import ReconView from '@/components/ReconView';

/**
 * Tactical Command Center Entry Point.
 * Leveraging an architectural isolation strategy to prevent Expo Router
 * from discovery native-only dependencies (react-native-maps) on Web.
 */
export default function ReconTab() {
  return <ReconView />;
}
