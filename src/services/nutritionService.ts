import type { Ingredient, NutritionInfo } from '../types/recipe';
import { getStoredDeepSeekApiKey, hasDeepSeekApiKey } from './deepseekParser';
import { getStoredApiKey, hasApiKey } from './geminiParser';
import { getStoredGroqApiKey, hasGroqApiKey } from './groqParser';
import { getPreferredProvider } from './aiOrchestrator';

const SYSTEM_PROMPT = `Ești un nutriționist și asistent culinar profesionist de top.
Sarcina ta este să analizezi o rețetă și lista ei de ingrediente și să estimezi valorile nutriționale medii PENTRU O SINGURĂ PORȚIE.

Trebuie să returnezi EXCLUSIV un obiect JSON valid, fără markdown sau alte explicații:
{
  "calories": 420,
  "protein": 28,
  "carbs": 45,
  "fat": 14,
  "fiber": 6
}

Reguli:
1. Toate valorile trebuie să fie numere întregi rotunjite (nu string-uri).
2. "calories": valoarea energetică în kilocalorii (kcal) per porție.
3. "protein", "carbs", "fat", "fiber": macronutrienții în grame (g) per porție.
4. Împarte conținutul total al tuturor ingredientelor la numărul de porții specificat.`;

function createPrompt(recipeTitle: string, ingredients: Ingredient[], servings: number): string {
  const ingList = ingredients
    .map((i) => {
      const amt = i.amount !== null && i.amount !== undefined ? `${i.amount} ${i.unit || ''}`.trim() : '';
      return `- ${amt} ${i.name} (${i.originalText || ''})`.trim();
    })
    .join('\n');

  return `Calculează valorile nutriționale medii per porție pentru această rețetă:
Titlu: "${recipeTitle}"
Număr de porții: ${servings || 4}

Ingrediente totale:
${ingList}`;
}

function parseNutritionJson(raw: string): NutritionInfo {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Răspunsul AI nu a putut fi decodificat ca JSON nutrițional.');
    }
  }

  const parseNum = (v: any, fallback = 0) => {
    if (typeof v === 'number' && !isNaN(v)) return Math.round(v);
    if (typeof v === 'string') {
      const m = v.match(/[\d.,]+/);
      if (m) {
        const num = parseFloat(m[0].replace(',', '.'));
        if (!isNaN(num)) return Math.round(num);
      }
    }
    return fallback;
  };

  return {
    calories: parseNum(parsed.calories, 0),
    protein: parseNum(parsed.protein, 0),
    carbs: parseNum(parsed.carbs, 0),
    fat: parseNum(parsed.fat, 0),
    fiber: parsed.fiber !== undefined ? parseNum(parsed.fiber, 0) : undefined,
    estimatedAt: Date.now(),
  };
}

async function estimateWithDeepSeek(prompt: string): Promise<NutritionInfo> {
  const apiKey = getStoredDeepSeekApiKey();
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Eroare DeepSeek (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Răspuns gol de la DeepSeek');
  return parseNutritionJson(content);
}

async function estimateWithGroq(prompt: string): Promise<NutritionInfo> {
  const apiKey = getStoredGroqApiKey();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Eroare Groq (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Răspuns gol de la Groq');
  return parseNutritionJson(content);
}

async function estimateWithGemini(prompt: string): Promise<NutritionInfo> {
  const apiKey = getStoredApiKey();
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        lastError = errText;
        continue;
      }

      const data = await res.json();
      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error('Răspuns gol de la Gemini');
      return parseNutritionJson(content);
    } catch (e: any) {
      lastError = e?.message || String(e);
    }
  }

  throw new Error(`Gemini a eșuat: ${lastError}`);
}

/**
 * Estimates recipe nutrition using available AI providers with automatic fallback.
 */
export async function estimateNutritionWithAI(
  recipeTitle: string,
  ingredients: Ingredient[],
  servings: number
): Promise<NutritionInfo> {
  if (!hasDeepSeekApiKey() && !hasApiKey() && !hasGroqApiKey()) {
    throw new Error('Nicio cheie AI configurată. Adaugă o cheie DeepSeek, Gemini sau Groq în Setări.');
  }

  const prompt = createPrompt(recipeTitle, ingredients, servings);
  const preferred = getPreferredProvider();

  // 1. Try preferred
  if (preferred === 'deepseek' && hasDeepSeekApiKey()) {
    try {
      return await estimateWithDeepSeek(prompt);
    } catch (err) {
      console.warn('DeepSeek failed, falling back:', err);
    }
  } else if (preferred === 'gemini' && hasApiKey()) {
    try {
      return await estimateWithGemini(prompt);
    } catch (err) {
      console.warn('Gemini failed, falling back:', err);
    }
  } else if (preferred === 'groq' && hasGroqApiKey()) {
    try {
      return await estimateWithGroq(prompt);
    } catch (err) {
      console.warn('Groq failed, falling back:', err);
    }
  }

  // 2. Automatic fallback order: DeepSeek -> Gemini -> Groq
  if (hasDeepSeekApiKey()) {
    try {
      return await estimateWithDeepSeek(prompt);
    } catch (e) {
      console.warn('DeepSeek auto failed:', e);
    }
  }

  if (hasApiKey()) {
    try {
      return await estimateWithGemini(prompt);
    } catch (e) {
      console.warn('Gemini auto failed:', e);
    }
  }

  if (hasGroqApiKey()) {
    return await estimateWithGroq(prompt);
  }

  throw new Error('Nu s-a putut calcula nutriția cu niciun serviciu AI configurat.');
}
