import { DEFAULT_CATEGORIES } from '../types/recipe';
import type { RecipeCategory, Ingredient, InstructionStep } from '../types/recipe';
import type { ParsedRecipeData } from './geminiParser';

const DEEPSEEK_API_KEY_STORAGE_KEY = 'CARTE_BUCATE_DEEPSEEK_API_KEY';

export function getStoredDeepSeekApiKey(): string {
  return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE_KEY) || '';
}

export function setStoredDeepSeekApiKey(key: string): void {
  localStorage.setItem(DEEPSEEK_API_KEY_STORAGE_KEY, key.trim());
}

export function hasDeepSeekApiKey(): boolean {
  return !!getStoredDeepSeekApiKey();
}

const SYSTEM_PROMPT = `Ești un asistent culinar profesionist de top. Sarcina ta este să extragi și să structurezi o rețetă culinară dintr-un text, o postare (Facebook, Instagram, TikTok, comentarii), un text extras din imagine sau o transcriere.
Trebuie să returnezi EXCLUSIV un obiect JSON valid, fără markdown sau alte explicații suplimentare.

Formatul JSON OBLIGATORIU:
{
  "title": "Titlu clar și atractiv în limba română",
  "category": "Una din categoriile exacte: Ciorbe & Supe | Fel Principal | Mic Dejun & Brunch | Paste & Risotto | La Cuptor | La Air Fryer | Sandvișuri & Gustări | Salate & Garnituri | Prăjituri & Deserturi | Pâine & Panificație | Altele",
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
  "notes": "Sfaturi utile, secrete de gătire sau variațiuni identificate în text"
}

Reguli stricte:
1. "category" TREBUIE să fie una din opțiunile exacte de mai sus. Dacă e făcută la Air Fryer, alege "La Air Fryer". Dacă e prăjitură/tort/clătite/desert, alege "Prăjituri & Deserturi". Dacă e ciorbă/supă, alege "Ciorbe & Supe". Dacă e paste/risotto, alege "Paste & Risotto". Dacă e coaptă/friptură la cuptor, alege "La Cuptor".
2. "amount" trebuie să fie un număr numeric (ex: 2.5, 200, 3, 0.5) sau null dacă nu e specificată cantitatea.
3. Dacă un pas menționează un timp de fierbere/coacere/așteptare (ex: 'coace 20 de minute'), include numărul de minute în "timerMinutes".
4. Curăță orice reclame, saluturi de social media, emoticoane irelevante sau text parazit.`;

export async function parseRecipeWithDeepSeek(text: string, customApiKey?: string): Promise<ParsedRecipeData> {
  const apiKey = customApiKey || getStoredDeepSeekApiKey();
  if (!apiKey) {
    throw new Error('Cheia DeepSeek API lipsește. Adaug-o în Setări.');
  }

  const url = 'https://api.deepseek.com/chat/completions';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Extrage și structurează rețeta din următorul text:\n\n${text}` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Eroare DeepSeek (${response.status}): ${response.statusText}`;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.error?.message) {
          errorMsg = errJson.error.message;
        }
      } catch {}

      if (response.status === 401) {
        throw new Error('Cheia DeepSeek API este invalidă. Verifică cheia în Setări.');
      }
      if (response.status === 402 || /insufficient balance|quota/i.test(errorMsg)) {
        throw new Error('Creditul DeepSeek API este epuizat. Verifică soldul pe platform.deepseek.com.');
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('DeepSeek nu a returnat niciun conținut.');
    }

    // Clean code fences if present
    const cleaned = rawText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error('Răspunsul primit de la DeepSeek nu are un format JSON valid.');
      }
    }

    // Validate category
    const validCategoryIds = DEFAULT_CATEGORIES.map((c) => c.id);
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
    console.error('DeepSeek parser error:', err);
    throw err;
  }
}
