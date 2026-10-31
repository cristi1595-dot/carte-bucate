export type RecipeCategory = string;

export interface CategoryItem {
  id: string;
  label: string;
  icon: string;
  order: number;
}

// Initial simplified default categories (fără conserve, sosuri și băuturi)
export const DEFAULT_CATEGORIES: CategoryItem[] = [
  { id: 'Ciorbe & Supe', label: 'Ciorbe & Supe', icon: '🥣', order: 1 },
  { id: 'Fel Principal', label: 'Fel Principal', icon: '🍲', order: 2 },
  { id: 'Mic Dejun & Brunch', label: 'Mic Dejun', icon: '🍳', order: 3 },
  { id: 'Paste & Risotto', label: 'Paste & Risotto', icon: '🍝', order: 4 },
  { id: 'La Cuptor', label: 'La Cuptor', icon: '🍗', order: 5 },
  { id: 'La Air Fryer', label: 'Air Fryer', icon: '💨', order: 6 },
  { id: 'Sandvișuri & Gustări', label: 'Sandvișuri & Gustări', icon: '🥪', order: 7 },
  { id: 'Salate & Garnituri', label: 'Salate & Garnituri', icon: '🥗', order: 8 },
  { id: 'Prăjituri & Deserturi', label: 'Deserturi', icon: '🍰', order: 9 },
  { id: 'Pâine & Panificație', label: 'Panificație', icon: '🥖', order: 10 },
  { id: 'Altele', label: 'Altele', icon: '🍽️', order: 11 },
];

// Backward-compatible alias for static imports
export const RECIPE_CATEGORIES = DEFAULT_CATEGORIES;

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
  image?: string; // base64 / compressed data url (vizibilă în detaliul rețetei)
  createdAt: number;
  updatedAt: number;
}

export type SupermarketAisle =
  | 'Legume & Fructe'
  | 'Lactate & Ouă'
  | 'Carne & Pește'
  | 'Panificație'
  | 'Băcănie & Condimente'
  | 'Congelate'
  | 'Băuturi'
  | 'Altele';

export const SUPERMARKET_AISLES: { id: SupermarketAisle; label: string; icon: string }[] = [
  { id: 'Legume & Fructe', label: 'Legume & Fructe', icon: '🥦' },
  { id: 'Lactate & Ouă', label: 'Lactate & Ouă', icon: '🧀' },
  { id: 'Carne & Pește', label: 'Carne & Pește', icon: '🥩' },
  { id: 'Panificație', label: 'Panificație', icon: '🥖' },
  { id: 'Băcănie & Condimente', label: 'Băcănie & Condimente', icon: '🧂' },
  { id: 'Congelate', label: 'Congelate', icon: '❄️' },
  { id: 'Băuturi', label: 'Băuturi', icon: '🧃' },
  { id: 'Altele', label: 'Altele', icon: '🛒' },
];

export interface ShoppingItem {
  id: string;
  name: string;
  amount?: string;
  recipeTitle?: string;
  aisle?: SupermarketAisle;
  checked: boolean;
  createdAt: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanEntry {
  id: string;
  date: string; // 'YYYY-MM-DD'
  mealType: MealType;
  recipeId: string;
  recipeTitle: string;
  recipeCategory?: string;
  servings: number;
  createdAt: number;
}

export interface AppBackup {
  version: number;
  exportDate: string;
  recipes: Recipe[];
  shoppingList: ShoppingItem[];
  categories?: CategoryItem[];
  mealPlans?: MealPlanEntry[];
}
