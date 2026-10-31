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
