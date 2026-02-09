import { useMutation } from "@tanstack/react-query";
import { ReducedSteamGame, SteamGame } from "../types/steam.types";
import { generateSuggestion } from "../data/api/llm";

export const useGenerateSuggestions = (games: ReducedSteamGame[]) => {
    return useMutation({
        mutationFn: async () => {
            return await generateSuggestion(games);
        }
    });
}