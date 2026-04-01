import React from 'react';
import { Redirect } from 'expo-router';

export default function LoginScreen() {
  // Legacy login screen now unified into the /auth portal for higher security protocols.
  return <Redirect href="/auth" />;
}