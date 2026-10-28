import { RECIPE_CATEGORIES } from '../types/recipe';
import type { RecipeCategory, Ingredient, InstructionStep } from '../types/recipe';
import type { ParsedRecipeData } from './geminiParser';

const GROQ_API_KEY_STORAGE_KEY = 'CARTE_BUCATE_GROQ_API_KEY';

export function getStoredGroqApiKey(): string {
  return localStorage.getItem(GROQ_API_KEY_STORAGE_KEY) || '';
}

export function setStoredGroqApiKey(key: string): void {
  localStorage.setItem(GROQ_API_KEY_STORAGE_KEY, key.trim());
}

export function hasGroqApiKey(): boolean {
  return !!getStoredGroqApiKey();
}

const SYSTEM_PROMPT = `Ești un asistent culinar profesionist de top. Sarcina ta este să extragi și să structurezi o rețetă culinară dintr-un text, o postare (Facebook, Instagram, TikTok, comentarii) sau dintr-o transcriere.
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
  "notes": "Sfaturi utile sau secrete de preparare identificate în text"
}

Reguli:
1. "category" TREBUIE să fie una din categoriile exacte de mai sus.
2. "amount" trebuie să fie numeric (ex: 2.5, 200, 3) sau null.
3. Dacă textul menționează un timp de fierbere/coacere (ex: 20 min), include-l în "timerMinutes".`;

export async function parseRecipeWithGroq(text: string, customApiKey?: string): Promise<ParsedRecipeData> {
  const apiKey = customApiKey || getStoredGroqApiKey();
  if (!apiKey) {
    throw new Error('Cheia Groq API lipsește.');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
  let lastError = '';

  for (const model of models) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Extrage rețeta din următorul text:\n\n${text}` },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        lastError = `Groq (${response.status}): ${errorText}`;
        continue;
      }

      const data = await response.json();
      const rawText = data.choices?.[0]?.message?.content;
      if (!rawText) {
        throw new Error('Groq nu a returnat conținut.');
      }

      const parsed = JSON.parse(rawText);

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
    } catch (err: any) {
      lastError = err?.message || 'Eroare apel Groq';
    }
  }

  throw new Error(`Eroare apelare Groq API: ${lastError}`);
}
