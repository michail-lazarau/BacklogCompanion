import { useMutation } from "@tanstack/react-query";
import { ReducedSteamGame, SteamGame } from "../types/steam.types";
import { generateSuggestion, generateSuggestionWith } from "../data/api/llm";
import { compressLibrary } from "../utils/compressLibrary";
import { buildCompressedPrompt } from "../utils/buildCompressedPrompt";

// export const useGenerateSuggestions = (games: ReducedSteamGame[]) => {
//     return useMutation({
//         mutationFn: async () => {
//             const compressed = await compressLibrary(games);
//             const prompt = buildCompressedPrompt(compressed);
//             return await generateSuggestion(games);
//         }
//     });
// }

export const useGenerateSuggestions = (games: ReducedSteamGame[]) => {
    return useMutation({
        mutationFn: async () => {
            const startTime = Date.now();
            const compressed = await compressLibrary(games);
            console.log('Compressed size:', JSON.stringify(compressed).length);
            console.log('Compressed:', compressed);
            const prompt = buildCompressedPrompt(compressed);
            const result = await generateSuggestionWith(prompt);
            const latencyMs = Date.now() - startTime;
            console.log(`LLM latency: ${latencyMs}ms`);
            return result;
        }
    });
}