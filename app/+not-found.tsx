import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';
import { useThemedStyles } from '../src/theme/useThemedStyles';

export default function NotFoundScreen() {
  const styles = useThemedStyles((theme) => ({
    container: {
      flex: 1,
      backgroundColor: theme.bg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 20,
    },
    title: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: theme.text,
    },
    link: { marginTop: 16 },
    linkText: { color: theme.accent, fontWeight: '700' as const },
  }));
  return (
    <>
      <Stack.Screen options={{ title: 'Missing' }} />
      <View style={styles.container}>
        <Text style={styles.title}>That screen is gone.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Back to Load</Text>
        </Link>
      </View>
    </>
  );
}
