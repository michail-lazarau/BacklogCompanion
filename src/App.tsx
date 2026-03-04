import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './navigation/AppNavigator';
import { Providers } from './data/QueryProvider';
import '../global.css';

const rootStyle = { flex: 1 } as const;

export function App() {
  return (
    <GestureHandlerRootView style={rootStyle}>
      <Providers>
        <AppNavigator />
      </Providers>
    </GestureHandlerRootView>
  );
}
