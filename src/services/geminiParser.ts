import { RECIPE_CATEGORIES } from '../types/recipe';
import type { Ingredient, InstructionStep, RecipeCategory } from '../types/recipe';

const API_KEY_STORAGE_KEY = 'CARTE_BUCATE_GEMINI_API_KEY';

export function getStoredApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export function hasApiKey(): boolean {
  return !!getStoredApiKey();
}

const SYSTEM_PROMPT = `Ești un asistent culinar profesionist de top. Sarcina ta este să extragi și să structurezi o rețetă culinară dintr-un text, o postare (Facebook, Instagram, TikTok, comentarii) sau dintr-o poză / screenshot.
Trebuie să returnezi EXCLUSIV un obiect JSON valid, fără markdown sau alte explicații suplimentare.

Formatul JSON OBLIGATORIU:
{
  "title": "Titlu clar și atractiv în limba română",
  "category": "Una din categoriile exacte: Ciorbe & Supe | Fel Principal | Mic Dejun & Brunch | Paste & Risotto | La Cuptor | La Air Fryer | Sandvișuri & Gustări | Salate & Garnituri | Prăjituri & Deserturi | Pâine & Panificație | Conserve & Murături | Sosuri & Dressinguri | Băuturi & Smoothie-uri | Altele",
  "tags": ["etichetă1", "etichetă2", "etichetă3"],
  "servings": 4,
  "prepTimeMinutes": 15,
  "cookTimeMinutes": 35,
  "ingredients": [
    {
      "name": "nume ingredient",
      "amount": 250,
      "unit": "g",
      "originalText": "250g făină albă"
    }
  ],
  "instructions": [
    {
      "stepNumber": 1,
      "text": "Textul pasului clar explicat.",
      "timerMinutes": 15
    }
  ],
  "notes": "Sfaturi utile, secrete de gătire sau variațiuni identificate în text/imagine"
}

Reguli stricte:
1. "category" TREBUIE să fie una din opțiunile exacte de mai sus. Dacă e făcută la Air Fryer, pune "La Air Fryer". Dacă e prăjitură/tort/clătite, pune "Prăjituri & Deserturi". Dacă e ciorbă/supă, pune "Ciorbe & Supe". Dacă e paste/risotto, pune "Paste & Risotto".
2. "amount" trebuie să fie un număr numeric (ex: 2.5, 200, 3, 0.5) sau null dacă nu e specificată cantitatea.
3. Dacă un pas menționează un timp de fierbere/coacere/așteptare (ex: 'coace 20 de minute'), include acel număr în "timerMinutes".
4. Curăță orice reclame, saluturi de social media, linkuri nesemnificative sau text irelevant.`;

export interface ParsedRecipeData {
  title: string;
  category: RecipeCategory;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  notes?: string;
}

// Call Gemini API with automatic model fallback (gemini-3.8-flash -> gemini-2.0-flash -> gemini-1.5-flash)
async function callGeminiApi(payload: any, apiKey: string): Promise<string> {
  const models = ['gemini-3.8-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Eroare Gemini (${response.status}): ${response.statusText}`;
        try {
          const errJson = JSON.parse(errorText);
          if (errJson.error?.message) errorMsg = errJson.error.message;
        } catch {}

        // If model not found or not available, try next model in fallback list
        if (response.status === 404 || errorMsg.includes('no longer available') || errorMsg.includes('not found')) {
          lastError = errorMsg;
          continue;
        }

        throw new Error(errorMsg);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Gemini nu a returnat niciun conținut.');
      }

      return rawText;
    } catch (err: any) {
      lastError = err?.message || 'Eroare la apelul Gemini API';
      if (!lastError.includes('no longer available') && !lastError.includes('not found')) {
        throw err;
      }
    }
  }

  throw new Error(`Nu s-a putut apela modelul Gemini: ${lastError}`);
}

function cleanAndParseJsonResponse(rawText: string): ParsedRecipeData {
  // Strip code fences if present (```json ... ```)
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    // If there's extra text, try regex extraction
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error('Răspunsul primit de la AI nu are un format JSON valid.');
    }
  }

  // Validate & map category
  const validCategoryIds = RECIPE_CATEGORIES.map((c) => c.id);
  let category: RecipeCategory = 'Fel Principal';
  if (validCategoryIds.includes(parsed.category)) {
    category = parsed.category;
  }

  const ingredients: Ingredient[] = (parsed.ingredients || []).map((ing: any, idx: number) => ({
    id: 'ing-' + Date.now() + '-' + idx,
    name: ing.name || 'Ingredient',
    amount: typeof ing.amount === 'number' ? ing.amount : null,
    unit: ing.unit || '',
    originalText: ing.originalText || `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim(),
  }));

  const instructions: InstructionStep[] = (parsed.instructions || []).map((step: any, idx: number) => ({
    id: 'step-' + Date.now() + '-' + idx,
    stepNumber: step.stepNumber || idx + 1,
    text: step.text || '',
    timerMinutes: typeof step.timerMinutes === 'number' && step.timerMinutes > 0 ? step.timerMinutes : undefined,
  }));

  return {
    title: parsed.title || 'Rețetă Fără Titlu',
    category,
    tags: Array.isArray(parsed.tags) ? parsed.tags : ['rețetă'],
    servings: typeof parsed.servings === 'number' && parsed.servings > 0 ? parsed.servings : 4,
    prepTimeMinutes: parsed.prepTimeMinutes,
    cookTimeMinutes: parsed.cookTimeMinutes,
    ingredients,
    instructions,
    notes: parsed.notes,
  };
}

// 1. Parse raw text / post / comment with Gemini
export async function parseRecipeFromText(text: string, customApiKey?: string): Promise<ParsedRecipeData> {
  const apiKey = customApiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error('Cheia Gemini API lipsește. Adaug-o în secțiunea Setări.');
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `Iată textul din care să extragi rețeta:\n\n${text}` },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const rawText = await callGeminiApi(payload, apiKey);
  return cleanAndParseJsonResponse(rawText);
}

// 2. Parse image / screenshot / cookbook photo with Gemini Vision
export async function parseRecipeFromImage(base64DataUrl: string, customApiKey?: string): Promise<ParsedRecipeData> {
  const apiKey = customApiKey || getStoredApiKey();
  if (!apiKey) {
    throw new Error('Cheia Gemini API lipsește. Adaug-o în secțiunea Setări.');
  }

  // Extract base64 and mime type from data url (e.g. data:image/jpeg;base64,....)
  const match = base64DataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formatul imaginii este invalid.');
  }

  const mimeType = match[1];
  const base64Data = match[2];

  const payload = {
    contents: [
      {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: 'Te rog să citești imaginea de mai sus (screenshot sau poză din carte/telefon) și să extragi rețeta culinară conform instrucțiunilor.' },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const rawText = await callGeminiApi(payload, apiKey);
  return cleanAndParseJsonResponse(rawText);
}
