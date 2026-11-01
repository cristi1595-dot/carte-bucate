import { parseRecipeFromText, parseRecipeFromImage, hasApiKey, type ParsedRecipeData } from './geminiParser';
import { parseRecipeWithGroq, parseRecipeFromImageWithGroq, hasGroqApiKey } from './groqParser';
import { parseRecipeWithDeepSeek, hasDeepSeekApiKey } from './deepseekParser';
import { extractTextWithOcr, type OcrProgress } from './ocrService';

export type AIProvider = 'auto' | 'deepseek' | 'gemini' | 'groq';

const PROVIDER_STORAGE_KEY = 'CARTE_BUCATE_PREFERRED_PROVIDER';

export function getPreferredProvider(): AIProvider {
  return (localStorage.getItem(PROVIDER_STORAGE_KEY) as AIProvider) || 'auto';
}

export function setPreferredProvider(provider: AIProvider): void {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}

export function hasAnyAiKey(): boolean {
  return hasDeepSeekApiKey() || hasApiKey() || hasGroqApiKey();
}

/**
 * Unified recipe text parser with automatic failover between DeepSeek, Gemini, and Groq.
 */
export async function extractRecipeFromText(text: string): Promise<ParsedRecipeData> {
  const preferred = getPreferredProvider();
  const deepseekAvailable = hasDeepSeekApiKey();
  const geminiAvailable = hasApiKey();
  const groqAvailable = hasGroqApiKey();

  if (!deepseekAvailable && !geminiAvailable && !groqAvailable) {
    throw new Error('Nicio cheie AI configurată. Adaugă o cheie DeepSeek, Gemini sau Groq în Setări.');
  }

  // 1. Explicit preference: DeepSeek
  if (preferred === 'deepseek' && deepseekAvailable) {
    try {
      return await parseRecipeWithDeepSeek(text);
    } catch (err: any) {
      console.warn('DeepSeek failed, attempting fallback:', err);
      if (geminiAvailable) return await parseRecipeFromText(text);
      if (groqAvailable) return await parseRecipeWithGroq(text);
      throw err;
    }
  }

  // 2. Explicit preference: Groq
  if (preferred === 'groq' && groqAvailable) {
    try {
      return await parseRecipeWithGroq(text);
    } catch (err: any) {
      console.warn('Groq failed, attempting fallback:', err);
      if (deepseekAvailable) return await parseRecipeWithDeepSeek(text);
      if (geminiAvailable) return await parseRecipeFromText(text);
      throw err;
    }
  }

  // 3. Explicit preference: Gemini
  if (preferred === 'gemini' && geminiAvailable) {
    try {
      return await parseRecipeFromText(text);
    } catch (err: any) {
      console.warn('Gemini failed, attempting fallback:', err);
      if (deepseekAvailable) return await parseRecipeWithDeepSeek(text);
      if (groqAvailable) return await parseRecipeWithGroq(text);
      throw err;
    }
  }

  // 4. Default / Auto: Prioritize DeepSeek (most stable with paid balance), then Gemini, then Groq
  if (deepseekAvailable) {
    try {
      return await parseRecipeWithDeepSeek(text);
    } catch (err: any) {
      console.warn('DeepSeek auto-try failed, falling back:', err);
      if (geminiAvailable) {
        try {
          return await parseRecipeFromText(text);
        } catch (gemErr) {
          console.warn('Gemini fallback failed:', gemErr);
        }
      }
      if (groqAvailable) {
        return await parseRecipeWithGroq(text);
      }
      throw err;
    }
  }

  if (geminiAvailable) {
    try {
      return await parseRecipeFromText(text);
    } catch (err: any) {
      console.warn('Gemini auto-try failed, falling back to Groq:', err);
      if (groqAvailable) {
        return await parseRecipeWithGroq(text);
      }
      throw err;
    }
  }

  if (groqAvailable) {
    return await parseRecipeWithGroq(text);
  }

  throw new Error('Nu s-a putut procesa rețeta cu niciun serviciu AI configurat.');
}

/**
 * Unified recipe image parser.
 * Supports native Gemini Vision (if configured) AND local client-side OCR (Tesseract.js)
 * combined with DeepSeek / Groq / Gemini text structuring.
 */
export async function extractRecipeFromImage(
  base64DataUrl: string,
  onOcrProgress?: (info: OcrProgress) => void
): Promise<ParsedRecipeData> {
  const geminiAvailable = hasApiKey();
  const groqAvailable = hasGroqApiKey();
  const deepseekAvailable = hasDeepSeekApiKey();
  const preferred = getPreferredProvider();

  // 1. Try Gemini Vision if Gemini is available
  if (geminiAvailable && (preferred === 'gemini' || preferred === 'auto')) {
    try {
      onOcrProgress?.({ progress: 30, status: 'Analiză imagine cu Google Gemini Vision...' });
      const res = await parseRecipeFromImage(base64DataUrl);
      onOcrProgress?.({ progress: 100, status: 'Rețetă extrasă cu succes!' });
      return res;
    } catch (gemErr: any) {
      console.warn('Gemini Vision failed, attempting alternative/fallback:', gemErr);
    }
  }

  // 2. Try Groq Vision if Groq is available
  if (groqAvailable && (preferred === 'groq' || preferred === 'auto')) {
    try {
      onOcrProgress?.({ progress: 35, status: 'Analiză imagine cu Groq Vision...' });
      const res = await parseRecipeFromImageWithGroq(base64DataUrl);
      onOcrProgress?.({ progress: 100, status: 'Rețetă extrasă cu succes!' });
      return res;
    } catch (groqErr: any) {
      console.warn('Groq Vision failed, falling back to OCR:', groqErr);
    }
  }

  // 3. Fallback to Local Browser OCR (Tesseract.js) + Text AI structuring
  if (deepseekAvailable || groqAvailable || geminiAvailable) {
    onOcrProgress?.({ progress: 15, status: 'Scanare text din imagine cu OCR local...' });
    const ocrText = await extractTextWithOcr(base64DataUrl, onOcrProgress);

    if (!ocrText || ocrText.length < 15) {
      throw new Error(
        'Nu s-a putut citi text clar din imagine. Asigură-te că fotografia este focalizată, bine iluminată și conține textul rețetei.'
      );
    }

    onOcrProgress?.({ progress: 85, status: 'Structurare rețetă cu AI...' });
    const structuredRecipe = await extractRecipeFromText(ocrText);
    onOcrProgress?.({ progress: 100, status: 'Rețetă completată!' });
    return structuredRecipe;
  }

  // If no AI key is configured at all
  throw new Error(
    'Pentru scanarea imaginilor este necesară o cheie gratuită Gemini sau Groq configurată în Setări.'
  );
}
