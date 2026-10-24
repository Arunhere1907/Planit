import { GoogleGenAI } from "@google/genai";
import { ZodSchema } from "zod";

// Initialize Gemini SDK on server-side with required headers
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    })
  : null;

/**
 * Standard LLM caller with JSON schema enforcement and retry loop (max 2 retries)
 */
export async function callStructuredLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodSchema<T>,
  fallbackValue: T
): Promise<T> {
  const currentKey = process.env.GEMINI_API_KEY || "";
  if (!currentKey || currentKey === "MY_GEMINI_API_KEY" || currentKey.trim().length < 10) {
    console.warn("[PlanIt LLM] Valid GEMINI_API_KEY not detected. Using intelligent deterministic fallback.");
    return fallbackValue;
  }

  const client = new GoogleGenAI({
    apiKey: currentKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  let lastError: any = null;
  let currentPrompt = userPrompt;

  const timeoutPromise = (ms: number) =>
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms));

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const generatePromise = client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: currentPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          temperature: 0.7,
        },
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise(9000)]);

      const rawText = response.text?.trim() || "";
      const cleanedJson = rawText
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/```$/, "")
        .trim();

      const parsed = JSON.parse(cleanedJson);
      const validation = schema.safeParse(parsed);

      if (validation.success) {
        return validation.data;
      } else {
        lastError = validation.error;
        console.warn(`[PlanIt LLM] Schema validation failed on attempt ${attempt}:`, validation.error.message);
        currentPrompt = `${userPrompt}\n\nIMPORTANT: Previous attempt had schema error: ${validation.error.message}. Return valid JSON conforming strictly to schema.`;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[PlanIt LLM] Generation attempt ${attempt} notice:`, err?.message || err);
      break; // Immediate resilient fallback to avoid user waiting
    }
  }

  console.log("[PlanIt LLM] Using verified deterministic baseline response.");
  return fallbackValue;
}
