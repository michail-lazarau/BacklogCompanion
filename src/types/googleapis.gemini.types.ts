export interface GenerateContentResponse {
  candidates: Candidate[];
  promptFeedback?: PromptFeedback;
  usageMetadata?: UsageMetadata;
}

interface Candidate {
  content: Content;
  finishReason?: string;
  index?: number;
  safetyRatings: SafetyRating[];
}

interface Content {
  parts: Part[];
  role: string;  // e.g., "model"
}

interface Part {
  text?: string;
}

interface SafetyRating {
  category: string;
  probability: string;  // e.g., "NEGLIGIBLE"
}

interface PromptFeedback {
  blockReason?: string;
  safetyRatings: SafetyRating[];
}

interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}