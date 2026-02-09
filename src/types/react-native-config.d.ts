declare module 'react-native-config' {
  type Env = {
    STEAM_API_KEY: string;
    LLM_API_KEY?: string;
    GOOGLEAI_API_KEY?: string;
  };
  const Config: Env;
  export default Config;
}