import * as Sentry from '@sentry/react-native';
import Config from 'react-native-config';
import { useMigrations } from 'drizzle-orm/op-sqlite/migrator';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { RootNavigator } from './navigation/RootNavigator';
import { Providers } from './data/QueryProvider';
import { db } from '@db/index';
import { allMigrations } from '@db/migrations/index';
import { toastConfig } from '@shared/components/toastConfig';
import '../global.css';

Sentry.init({
  dsn: Config.SENTRY_DSN,
  enabled: !!Config.SENTRY_DSN,
  environment: Config.APP_ENV || 'development',
});

const rootStyle = { flex: 1 } as const;

export const App = Sentry.wrap(function App() {
  const { success, error } = useMigrations(db, allMigrations);

  // DB migration failed — surface crash for Sentry (wired in Story 1.5)
  if (error) {
    throw error;
  }

  return (
    <GestureHandlerRootView style={rootStyle}>
      {success ? (
        <Providers>
          <RootNavigator />
        </Providers>
      ) : (
        <View style={rootStyle}>
          <ActivityIndicator style={rootStyle} />
        </View>
      )}
      <Toast config={toastConfig} />
    </GestureHandlerRootView>
  );
});
