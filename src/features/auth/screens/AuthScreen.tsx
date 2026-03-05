import { View, Text, StyleSheet } from 'react-native';

export const AuthScreen = () => (
  <View style={styles.container}>
    <Text>Auth</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
