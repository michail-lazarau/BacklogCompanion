import { useReducer, useEffect } from 'react';
import * as Keychain from 'react-native-keychain';
import { STEAM_KEYCHAIN_SERVICES } from '@features/auth/hooks/useSteamAuth';

type GateState = { checked: boolean; hasKey: boolean };
type GateAction =
  | { type: 'RESET' }
  | { type: 'RESOLVED'; hasKey: boolean };

const initialState: GateState = { checked: false, hasKey: false };

const gateReducer = (_state: GateState, action: GateAction): GateState => {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'RESOLVED':
      return { checked: true, hasKey: action.hasKey };
  }
};

export const useApiKeyGate = (isAuthenticated: boolean) => {
  const [state, dispatch] = useReducer(gateReducer, initialState);

  useEffect(() => {
    if (!isAuthenticated) {
      dispatch({ type: 'RESET' });
      return;
    }

    let cancelled = false;

    Keychain.getGenericPassword({ service: STEAM_KEYCHAIN_SERVICES.STEAM_API_KEY })
      .then((creds) => {
        if (!cancelled) {
          dispatch({ type: 'RESOLVED', hasKey: !!creds });
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: 'RESOLVED', hasKey: false });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const onApiKeySaved = () => {
    dispatch({ type: 'RESOLVED', hasKey: true });
  };

  return { apiKeyChecked: state.checked, hasApiKey: state.hasKey, onApiKeySaved };
};
