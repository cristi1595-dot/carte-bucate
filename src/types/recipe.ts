export type RecipeCategory =
  | 'Ciorbe & Supe'
  | 'Fel Principal'
  | 'Mic Dejun & Brunch'
  | 'Paste & Risotto'
  | 'La Cuptor'
  | 'La Air Fryer'
  | 'Sandvișuri & Gustări'
  | 'Salate & Garnituri'
  | 'Prăjituri & Deserturi'
  | 'Pâine & Panificație'
  | 'Conserve & Murături'
  | 'Sosuri & Dressinguri'
  | 'Băuturi & Smoothie-uri'
  | 'Altele';

export const RECIPE_CATEGORIES: { id: RecipeCategory; label: string; icon: string }[] = [
  { id: 'Ciorbe & Supe', label: 'Ciorbe & Supe', icon: '🥣' },
  { id: 'Fel Principal', label: 'Fel Principal', icon: '🍲' },
  { id: 'Mic Dejun & Brunch', label: 'Mic Dejun', icon: '🍳' },
  { id: 'Paste & Risotto', label: 'Paste & Risotto', icon: '🍝' },
  { id: 'La Cuptor', label: 'La Cuptor', icon: '🍗' },
  { id: 'La Air Fryer', label: 'Air Fryer', icon: '💨' },
  { id: 'Sandvișuri & Gustări', label: 'Sandvișuri & Gustări', icon: '🥪' },
  { id: 'Salate & Garnituri', label: 'Salate & Garnituri', icon: '🥗' },
  { id: 'Prăjituri & Deserturi', label: 'Deserturi', icon: '🍰' },
  { id: 'Pâine & Panificație', label: 'Panificație', icon: '🥖' },
  { id: 'Conserve & Murături', label: 'Conserve & Murături', icon: '🥫' },
  { id: 'Sosuri & Dressinguri', label: 'Sosuri', icon: '🍯' },
  { id: 'Băuturi & Smoothie-uri', label: 'Băuturi', icon: '🥤' },
  { id: 'Altele', label: 'Altele', icon: '🍽️' },
];

export interface Ingredient {
  id: string;
  name: string;
  amount: number | null;
  unit: string;
  originalText: string;
}

export interface InstructionStep {
  id: string;
  stepNumber: number;
  text: string;
  timerMinutes?: number;
}

export interface Recipe {
  id: string;
  title: string;
  category: RecipeCategory;
  tags: string[];
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  notes?: string;
  rating?: number; // 1 to 5
  isFavorite: boolean;
  sourceUrl?: string;
  originalText?: string;
  image?: string; // base64 / compressed data url
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  recipeTitle?: string;
  checked: boolean;
  createdAt: number;
}

export interface AppBackup {
  version: number;
  exportDate: string;
  recipes: Recipe[];
  shoppingList: ShoppingItem[];
}
