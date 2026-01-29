import AppNavigator from './navigation/AppNavigator';
import { Providers } from './data/QueryProvider';

export default function App() {
  return (
    <Providers>
      <AppNavigator />
    </Providers>
  );
}