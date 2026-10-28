import type { Ingredient, InstructionStep, RecipeCategory } from '../types/recipe';

// Parse ISO 8601 duration e.g. "PT30M", "PT1H15M", "PT45S"
export function parseIsoDuration(duration?: string): number | undefined {
  if (!duration || typeof duration !== 'string') return undefined;
  const match = duration.match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/);
  if (!match) return undefined;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const total = hours * 60 + minutes;
  return total > 0 ? total : undefined;
}

// Parse string ingredient into amount, unit, and name
export function parseIngredientString(raw: string): Ingredient {
  const clean = raw.trim();
  // Regex to detect common numbers and fractions e.g. "500g", "2.5 kg", "1/2 linguriță", "3 buc"
  const regex = /^([\d\s\/\.,]+)\s*([a-zA-ZăâîșțĂÂÎȘȚ]+)?\s+(.*)$/;
  const match = clean.match(regex);

  let amount: number | null = null;
  let unit = '';
  let name = clean;

  if (match) {
    const rawAmount = match[1].trim();
    if (rawAmount.includes('/')) {
      const parts = rawAmount.split('/');
      if (parts.length === 2) {
        amount = parseFloat(parts[0]) / parseFloat(parts[1]);
      }
    } else {
      const parsed = parseFloat(rawAmount.replace(',', '.'));
      if (!isNaN(parsed)) amount = parsed;
    }

    unit = (match[2] || '').trim();
    name = (match[3] || '').trim();
  }

  return {
    id: 'ing-' + Math.random().toString(36).substring(2, 9),
    name: name || clean,
    amount,
    unit,
    originalText: clean,
  };
}

// Automatically classify recipe into one of our predefined categories based on keywords
export function autoClassifyCategory(title: string, rawText = ''): RecipeCategory {
  const combined = (title + ' ' + rawText).toLowerCase();

  if (/ciorb[aă]|sup[aă]|bor[sș]|consommé|zeam[aă]/.test(combined)) {
    return 'Ciorbe & Supe';
  }
  if (/air\s*fryer|friteuz[aă] cu aer/.test(combined)) {
    return 'La Air Fryer';
  }
  if (/past[ae]|spaghett?i|penne|tagliatelle|carbonara|bolognese|risotto|macaroane|fusilli/.test(combined)) {
    return 'Paste & Risotto';
  }
  if (/pr[aă]jitur[aă]|tort|chec|cozonac|biscui[tț]|cl[aă]tit[eă]|lava\s*cake|briose|muffins|fursecuri|budinc[aă]|crem[aă]\s*de\s*zah[aă]r|ecler|tart[aă]|tiramisu/.test(combined)) {
    return 'Prăjituri & Deserturi';
  }
  if (/p[aâ]ine|focaccia|chifl[eă]|aluat|maia|covrigi|pl[aă]cint[aă]/.test(combined)) {
    return 'Pâine & Panificație';
  }
  if (/omlet[aă]|ou[aă]\s*ochi|shakshuka|mic\s*dejun|brunch|granola|ov[aă]z/.test(combined)) {
    return 'Mic Dejun & Brunch';
  }
  if (/sandvi[sș]|sandwich|toast|bruschet|crostini|panini|aperitiv/.test(combined)) {
    return 'Sandvișuri & Gustări';
  }
  if (/salat[aă]|garnitur[aă]|piure|cartofi\s*pr[aă]ji[tț]i|legume\s*la\s*gr[aă]tar/.test(combined)) {
    return 'Salate & Garnituri';
  }
  if (/mur[aă]tur[iă]|zacusc[aă]|dulcea[tț][aă]|gem|compot|conserve/.test(combined)) {
    return 'Conserve & Murături';
  }
  if (/sos\b|dressing|maionez[aă]|pesto|marinad[aă]|mujdei/.test(combined)) {
    return 'Sosuri & Dressinguri';
  }
  if (/smoothie|limonad[aă]|cocktail|sirop|ceai|b[aă]utur[aă]|suc\s*natural/.test(combined)) {
    return 'Băuturi & Smoothie-uri';
  }
  if (/la\s*cuptor|friptur[aă]|coapt[aă]|musaca|iahnie/.test(combined)) {
    return 'La Cuptor';
  }

  return 'Fel Principal';
}

// Auto-detect timer from a step text e.g. "lasă la fiert 25 minute", "coace timp de 1 oră"
export function detectStepTimer(text: string): number | undefined {
  const minMatch = text.match(/(\d+)\s*(?:-|la|\s)?\s*(\d+)?\s*(?:de\s*)?(?:min|minute|mins)/i);
  if (minMatch) {
    const mins = parseInt(minMatch[2] || minMatch[1], 10);
    if (!isNaN(mins) && mins > 0 && mins <= 360) return mins;
  }

  const hourMatch = text.match(/(\d+)\s*(?:or[aă]|ore|h\b)/i);
  if (hourMatch) {
    const hours = parseInt(hourMatch[1], 10);
    if (!isNaN(hours) && hours > 0 && hours <= 12) return hours * 60;
  }

  return undefined;
}

// Extract Schema.org/Recipe JSON-LD from HTML string or parsed JSON
export function parseSchemaRecipeJsonLd(htmlOrJson: string | object): Partial<{
  title: string;
  category: RecipeCategory;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  image?: string;
  originalText?: string;
}> | null {
  try {
    let jsonLdObj: any = null;

    if (typeof htmlOrJson === 'object') {
      jsonLdObj = htmlOrJson;
    } else {
      // Look for <script type="application/ld+json">...</script>
      const matches = htmlOrJson.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
      for (const m of matches) {
        try {
          const parsed = JSON.parse(m[1].trim());
          if (parsed['@type'] === 'Recipe') {
            jsonLdObj = parsed;
            break;
          } else if (Array.isArray(parsed)) {
            const found = parsed.find((p) => p['@type'] === 'Recipe');
            if (found) {
              jsonLdObj = found;
              break;
            }
          } else if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            const found = parsed['@graph'].find((p: any) => p['@type'] === 'Recipe');
            if (found) {
              jsonLdObj = found;
              break;
            }
          }
        } catch {
          // continue searching
        }
      }

      // If no script tag matched, attempt direct JSON parse
      if (!jsonLdObj) {
        try {
          const direct = JSON.parse(htmlOrJson);
          if (direct['@type'] === 'Recipe') jsonLdObj = direct;
        } catch {
          // not raw JSON
        }
      }
    }

    if (!jsonLdObj) return null;

    const title = jsonLdObj.name || jsonLdObj.headline || 'Rețetă Fără Titlu';
    const category = autoClassifyCategory(title, JSON.stringify(jsonLdObj.recipeCategory || ''));

    // Servings / yield
    let servings = 4;
    if (jsonLdObj.recipeYield) {
      const match = String(jsonLdObj.recipeYield).match(/\d+/);
      if (match) servings = parseInt(match[0], 10);
    }

    // Times
    const prepTimeMinutes = parseIsoDuration(jsonLdObj.prepTime);
    const cookTimeMinutes = parseIsoDuration(jsonLdObj.cookTime);

    // Ingredients
    const rawIngs: string[] = Array.isArray(jsonLdObj.recipeIngredient)
      ? jsonLdObj.recipeIngredient
      : typeof jsonLdObj.recipeIngredient === 'string'
      ? jsonLdObj.recipeIngredient.split('\n')
      : [];

    const ingredients: Ingredient[] = rawIngs.map((ing) => parseIngredientString(String(ing)));

    // Instructions
    const rawSteps = jsonLdObj.recipeInstructions;
    const instructions: InstructionStep[] = [];

    if (Array.isArray(rawSteps)) {
      rawSteps.forEach((s, idx) => {
        let text = '';
        if (typeof s === 'string') text = s;
        else if (s && typeof s === 'object' && s.text) text = s.text;
        else if (s && typeof s === 'object' && s.name) text = s.name;

        if (text.trim()) {
          instructions.push({
            id: 'step-' + (idx + 1),
            stepNumber: idx + 1,
            text: text.trim(),
            timerMinutes: detectStepTimer(text),
          });
        }
      });
    } else if (typeof rawSteps === 'string') {
      const splitSteps = rawSteps.split(/\n+/).filter((s) => s.trim().length > 0);
      splitSteps.forEach((s, idx) => {
        instructions.push({
          id: 'step-' + (idx + 1),
          stepNumber: idx + 1,
          text: s.trim(),
          timerMinutes: detectStepTimer(s),
        });
      });
    }

    // Image
    let image: string | undefined = undefined;
    if (typeof jsonLdObj.image === 'string') {
      image = jsonLdObj.image;
    } else if (Array.isArray(jsonLdObj.image) && jsonLdObj.image.length > 0) {
      image = typeof jsonLdObj.image[0] === 'string' ? jsonLdObj.image[0] : jsonLdObj.image[0]?.url;
    } else if (jsonLdObj.image?.url) {
      image = jsonLdObj.image.url;
    }

    return {
      title,
      category,
      tags: Array.isArray(jsonLdObj.keywords) ? jsonLdObj.keywords : ['importat'],
      servings,
      prepTimeMinutes,
      cookTimeMinutes,
      ingredients,
      instructions,
      image,
      originalText: JSON.stringify(jsonLdObj, null, 2),
    };
  } catch (err) {
    console.error('Error parsing Schema.org recipe:', err);
    return null;
  }
}
