import type { SupermarketAisle, ShoppingItem } from '../types/recipe';

interface KeywordRule {
  aisle: SupermarketAisle;
  keywords: string[];
}

const AISLE_RULES: KeywordRule[] = [
  {
    aisle: 'Legume & Fructe',
    keywords: [
      'roșii', 'rosii', 'ceapă', 'ceapa', 'usturoi', 'cartof', 'cartofi', 'morcov', 'morcovi',
      'ardei', 'castravete', 'castraveți', 'dovlecel', 'dovlecei', 'vânătă', 'vinete', 'salată', 'salata',
      'spanac', 'ciuperci', 'varză', 'varza', 'pătrunjel', 'patrunjel', 'mărar', 'marar', 'țelină', 'telina',
      'lămâie', 'lamaie', 'lămâi', 'măr', 'mere', 'banană', 'banane', 'portocală', 'portocale', 'avocado',
      'ghimbir', 'busuioc proaspăt', 'ceapă verde', 'praz', 'ridichi', 'conopidă', 'brocoli', 'broccoli',
      'sparanghel', 'roșie', 'lime', 'căpșuni', 'afine', 'zmeură'
    ],
  },
  {
    aisle: 'Lactate & Ouă',
    keywords: [
      'lapte', 'smântână', 'smantana', 'iaurt', 'unt', 'brânză', 'branza', 'cașcaval', 'cascaval',
      'parmezan', 'mozzarella', 'ricotta', 'mascarpone', 'telemea', 'ou', 'ouă', 'oua', 'gălbenuș', 'albuș',
      'cheddar', 'gorgonzola', 'feta', 'cremă de brânză', 'crema de branza', 'friscă', 'frișcă'
    ],
  },
  {
    aisle: 'Carne & Pește',
    keywords: [
      'carne', 'pui', 'piept de pui', 'copane', 'vită', 'vita', 'porc', 'mușchi', 'muschi', 'bacon',
      'șuncă', 'sunca', 'salam', 'cârnați', 'carnati', 'pește', 'peste', 'somon', 'ton', 'creveți', 'creveti',
      'fructe de mare', 'tocată', 'tocata', 'curcan', 'miel', 'pulpă', 'pulpa', 'costiță', 'costita',
      'prosciutto', 'pancetta'
    ],
  },
  {
    aisle: 'Panificație',
    keywords: [
      'pâine', 'paine', 'chifle', 'baghetă', 'bagheta', 'lipie', 'lipii', 'toast', 'pesmet', 'foi de plăcintă',
      'aluat', 'foietaj', 'tortilla', 'crutoane', 'croissant'
    ],
  },
  {
    aisle: 'Congelate',
    keywords: ['congelat', 'congelată', 'congelate', 'înghețată', 'inghetata', 'fructe congelate'],
  },
  {
    aisle: 'Băuturi',
    keywords: ['cafea', 'ceai', 'vin', 'bere', 'suc', 'apă', 'apa', 'cognac', 'rom', 'vodka', 'sirop'],
  },
  {
    aisle: 'Băcănie & Condimente',
    keywords: [
      'ulei', 'sare', 'piper', 'zahăr', 'zahar', 'făină', 'faina', 'mălai', 'malai', 'orez', 'paste',
      'spaghete', 'penne', 'macaroane', 'tăiței', 'taitei', 'oțet', 'otet', 'sos', 'bulion', 'pastă de tomate',
      'muștar', 'mustar', 'boia', 'oregano', 'busuioc', 'cimbru', 'scorțișoară', 'scortisoara', 'drojdie',
      'praf de copt', 'bicarbonat', 'vanilie', 'cacao', 'ciocolată', 'ciocolata', 'nucă', 'nuci', 'migdale',
      'semințe', 'seminte', 'sos de soia', 'miere', 'ketchup', 'maioneză', 'maioneza', 'măsline', 'masline',
      'bulion', 'condiment'
    ],
  },
];

/**
 * Automatically classifies an ingredient name into the most appropriate supermarket aisle.
 */
export function classifyAisle(ingredientName: string): SupermarketAisle {
  if (!ingredientName) return 'Altele';
  const lower = ingredientName.toLowerCase().trim();

  // Check specific rules
  for (const rule of AISLE_RULES) {
    for (const kw of rule.keywords) {
      // match word boundary or substring
      if (lower.includes(kw)) {
        return rule.aisle;
      }
    }
  }

  return 'Altele';
}

/**
 * Combines ingredients and prepares shopping items with aisles.
 */
export function prepareShoppingItem(
  name: string,
  amount?: string,
  recipeTitle?: string,
  customAisle?: SupermarketAisle
): ShoppingItem {
  const assignedAisle = customAisle || classifyAisle(name);

  return {
    id: 'shop-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    amount: amount?.trim() || undefined,
    recipeTitle,
    aisle: assignedAisle,
    checked: false,
    createdAt: Date.now(),
  };
}

/**
 * Smartly increments or decrements quantity string.
 * Supports units like kg, g, l, ml, buc, or plain numbers.
 */
export function adjustQuantity(
  currentAmount: string | undefined,
  delta: number
): { newAmount: string; isZero: boolean } {
  if (!currentAmount || !currentAmount.trim()) {
    if (delta > 0) return { newAmount: '1', isZero: false };
    return { newAmount: '0', isZero: true };
  }

  const trimmed = currentAmount.trim();
  const match = trimmed.match(/^([\d.,]+)\s*(.*)$/);

  if (!match) {
    return { newAmount: trimmed, isZero: false };
  }

  const num = parseFloat(match[1].replace(',', '.'));
  if (isNaN(num)) {
    return { newAmount: trimmed, isZero: false };
  }

  const unit = match[2] ? match[2].trim() : '';
  const lowerUnit = unit.toLowerCase();

  let step = 1;
  if (lowerUnit === 'g' || lowerUnit === 'gr' || lowerUnit === 'grame') {
    step = num >= 500 ? 100 : 50;
  } else if (lowerUnit === 'ml' || lowerUnit === 'mililitri') {
    step = num >= 500 ? 100 : 50;
  } else if (lowerUnit === 'kg' || lowerUnit === 'l' || lowerUnit === 'litru' || lowerUnit === 'litri') {
    step = 0.5;
  } else {
    step = 1;
  }

  let newNum = num + delta * step;
  if (newNum <= 0) {
    newNum = 0;
  }

  // Round to avoid float precision artifacts (e.g. 1.0000000002)
  newNum = Math.round(newNum * 100) / 100;

  const newAmount = unit ? `${newNum} ${unit}`.trim() : `${newNum}`;
  return {
    newAmount,
    isZero: newNum === 0,
  };
}
