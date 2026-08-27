import { Redirect, useLocalSearchParams } from 'expo-router';

export default function JoinByLinkScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const code = typeof params.code === 'string' ? params.code.toUpperCase() : '';

  return <Redirect href={{ pathname: '/join-group', params: { code } }} />;
}
