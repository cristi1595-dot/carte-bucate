import { parseRecipeFromText, parseRecipeFromImage, hasApiKey, type ParsedRecipeData } from './geminiParser';
import { parseRecipeWithGroq, hasGroqApiKey } from './groqParser';

export type AIProvider = 'auto' | 'gemini' | 'groq';

const PROVIDER_STORAGE_KEY = 'CARTE_BUCATE_PREFERRED_PROVIDER';

export function getPreferredProvider(): AIProvider {
  return (localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProvider) || 'auto';
}

export function setPreferredProvider(provider: AIProvider): void {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}

export function hasAnyAiKey(): boolean {
  return hasApiKey() || hasGroqApiKey();
}

// Unified recipe text parser with automatic failover between Gemini and Groq
export async function extractRecipeFromText(text: string): Promise<ParsedRecipeData> {
  const preferred = getPreferredProvider();
  const geminiAvailable = hasApiKey();
  const groqAvailable = hasGroqApiKey();

  if (!geminiAvailable && !groqAvailable) {
    throw new Error('Nicio cheie AI configurată. Adaugă o cheie gratuită Gemini sau Groq în Setări.');
  }

  // 1. If Groq is explicitly preferred and available
  if (preferred === 'groq' && groqAvailable) {
    try {
      return await parseRecipeWithGroq(text);
    } catch (err: any) {
      if (geminiAvailable) {
        console.warn('Groq failed, falling back to Gemini:', err);
        return await parseRecipeFromText(text);
      }
      throw err;
    }
  }

  // 2. Default/Auto: Try Gemini first (with multi-model fallback chain: 2.0-flash -> 1.5-flash -> 2.0-flash-lite)
  if (geminiAvailable) {
    try {
      return await parseRecipeFromText(text);
    } catch (err: any) {
      // If Gemini experienced severe outage and Groq is configured, failover to Groq
      if (groqAvailable) {
        console.warn('Gemini failed, falling back to Groq:', err);
        return await parseRecipeWithGroq(text);
      }
      throw err;
    }
  }

  // 3. Fallback to Groq if only Groq is configured
  if (groqAvailable) {
    return await parseRecipeWithGroq(text);
  }

  throw new Error('Nu s-a putut procesa rețeta cu niciun serviciu AI.');
}

// Unified recipe image parser (Gemini Vision)
export async function extractRecipeFromImage(base64DataUrl: string): Promise<ParsedRecipeData> {
  if (!hasApiKey()) {
    throw new Error('Citirea din imagini/screenshot-uri necesită o cheie gratuită Gemini API configurată în Setări.');
  }

  return await parseRecipeFromImage(base64DataUrl);
}
