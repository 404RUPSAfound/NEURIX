import { Redirect } from 'expo-router';

export default function RootIndex() {
  // Always show the splash screen first.
  return <Redirect href="/splash" />;
}
