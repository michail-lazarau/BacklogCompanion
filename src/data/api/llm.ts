import Config from 'react-native-config';
import { LLMGameSuggestionResponse, ReducedSteamGame, SteamGame } from '../../types/steam.types';
import { geminiFetch } from './httpClient';
import { GenerateContentResponse } from '../../types/googleapis.gemini.types';

export const generateSuggestion = async (games: ReducedSteamGame[]): Promise<LLMGameSuggestionResponse> => {
  const prompt = `Analyze library: ${JSON.stringify(games)}.
  Suggest up to 10 games to play next. Consider:
  - playtime (hours played)
  - recent activity (last played)
  - genres
  Respond in JSON format: { "appids": [list of up to 10 appids] }`;

  if (!Config.GOOGLEAI_API_KEY) {
    throw new Error('Google AI API Key is missing in Config');
  }

  const params = new URLSearchParams({
    key: Config.GOOGLEAI_API_KEY,
  });

  const response = await geminiFetch<GenerateContentResponse>(
    'models/gemini-2.5-flash:generateContent', 
    params, 
    'POST', 
    {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        response_mime_type: "application/json"
      }
    },
  );
  
  return JSON.parse(response.candidates[0].content.parts[0].text || '{}');
}