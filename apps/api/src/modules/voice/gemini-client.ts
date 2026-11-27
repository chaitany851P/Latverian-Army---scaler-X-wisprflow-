import { GoogleGenAI } from "@google/genai";

export function createGeminiClient(apiKey = process.env["GEMINI_API_KEY"]) {
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}
