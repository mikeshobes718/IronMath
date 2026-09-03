import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../src/theme';

export default function NotFoundScreen() {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.text,
  },
  link: {
    marginTop: 16,
  },
  linkText: {
    color: theme.accent,
    fontWeight: '700',
  },
});
