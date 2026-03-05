declare module 'react-native-config' {
  type Env = {
    STEAM_API_KEY: string;
    LLM_API_KEY?: string;
    GOOGLEAI_API_KEY?: string;
    SENTRY_DSN?: string;
    APP_ENV?: string;
  };
  const Config: Env;
  export default Config;
}