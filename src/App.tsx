import { useMigrations } from 'drizzle-orm/op-sqlite/migrator';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { Providers } from './data/QueryProvider';
import { db } from '@db/index';
import { allMigrations } from '@db/migrations/index';
import '../global.css';

const rootStyle = { flex: 1 } as const;

export function App() {
  const { success, error } = useMigrations(db, allMigrations);

  // DB migration failed — surface crash for Sentry (wired in Story 1.5)
  if (error) {
    throw error;
  }

  return (
    <GestureHandlerRootView style={rootStyle}>
      {success ? (
        <Providers>
          <AppNavigator />
        </Providers>
      ) : (
        <View style={rootStyle}>
          <ActivityIndicator style={rootStyle} />
        </View>
      )}
    </GestureHandlerRootView>
  );
}
