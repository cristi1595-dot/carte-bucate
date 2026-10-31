import Dexie, { type Table } from 'dexie';
import type { Recipe, ShoppingItem, AppBackup, CategoryItem, MealPlanEntry, PantryItem } from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { SAMPLE_RECIPES } from './sampleRecipes';

export const DEFAULT_PANTRY_ITEMS: Omit<PantryItem, 'id' | 'updatedAt'>[] = [
  { name: 'Sare fină', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Piper negru măcinat', amount: '100g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Ulei de floarea-soarelui', amount: '1 l', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Ulei de măsline extravirgin', amount: '500 ml', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Făină albă de grâu', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Zahăr tos', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Orez cu bob rotund', amount: '1 kg', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Paste (spaghete/penne)', amount: '500g', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Oțet de mere', amount: '500 ml', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Drojdie uscată', amount: '2 plicuri', category: 'Băcănie & Condimente', inStock: true },
  { name: 'Usturoi', amount: '1 căpățână', category: 'Legume & Fructe', inStock: true },
  { name: 'Ceapă galbenă', amount: '1 kg', category: 'Legume & Fructe', inStock: true },
  { name: 'Unt 82%', amount: '200g', category: 'Lactate & Ouă', inStock: true },
  { name: 'Ouă proaspete', amount: '10 buc', category: 'Lactate & Ouă', inStock: true },
];

export class CookbookDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  shoppingList!: Table<ShoppingItem, string>;
  categories!: Table<CategoryItem, string>;
  mealPlans!: Table<MealPlanEntry, string>;
  pantry!: Table<PantryItem, string>;

  constructor() {
    super('CookbookDB');
    this.version(1).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, createdAt',
    });
    this.version(2).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, createdAt',
      categories: 'id, label, order',
    });
    this.version(3).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, aisle, createdAt',
      categories: 'id, label, order',
      mealPlans: 'id, date, mealType, recipeId, createdAt',
    });
    this.version(4).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, aisle, createdAt',
      categories: 'id, label, order',
      mealPlans: 'id, date, mealType, recipeId, createdAt',
      pantry: 'id, name, category, inStock, updatedAt',
    });
  }
}

export const db = new CookbookDatabase();

// Seed initial recipes, default categories & pantry staples if empty
export async function seedInitialRecipesIfEmpty() {
  try {
    const count = await db.recipes.count();
    if (count === 0) {
      await db.recipes.bulkAdd(SAMPLE_RECIPES);
    }

    const catCount = await db.categories.count();
    if (catCount === 0) {
      await db.categories.bulkAdd(DEFAULT_CATEGORIES);
    }

    const pantryCount = await db.pantry.count();
    if (pantryCount === 0) {
      const initialPantry: PantryItem[] = DEFAULT_PANTRY_ITEMS.map((item, idx) => ({
        id: 'pantry-' + (Date.now() + idx),
        ...item,
        updatedAt: Date.now(),
      }));
      await db.pantry.bulkAdd(initialPantry);
    }
  } catch (error) {
    console.error('Error seeding initial database data:', error);
  }
}

// Reset categories to default set
export async function resetCategoriesToDefault(): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    await db.categories.clear();
    await db.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}

// Add or update a category
export async function saveCategory(category: CategoryItem): Promise<void> {
  await db.categories.put(category);
}

// Delete a category
export async function deleteCategory(id: string): Promise<void> {
  await db.categories.delete(id);
}

// Export entire database as JSON backup
export async function exportDatabaseBackup(): Promise<string> {
  const recipes = await db.recipes.toArray();
  const shoppingList = await db.shoppingList.toArray();
  const categories = await db.categories.toArray();
  const mealPlans = await db.mealPlans.toArray();
  const pantry = await db.pantry.toArray();
  const backup: AppBackup = {
    version: 4,
    exportDate: new Date().toISOString(),
    recipes,
    shoppingList,
    categories,
    mealPlans,
    pantry,
  };
  return JSON.stringify(backup, null, 2);
}

// Import database from JSON backup file
export async function importDatabaseBackup(jsonString: string): Promise<{ success: boolean; importedCount: number; message: string }> {
  try {
    const backup: AppBackup = JSON.parse(jsonString);
    if (!backup.recipes || !Array.isArray(backup.recipes)) {
      throw new Error('Formatul fișierului este invalid (nu conține o listă de rețete validă).');
    }

    await db.transaction('rw', db.recipes, db.shoppingList, db.categories, db.mealPlans, db.pantry, async () => {
      for (const recipe of backup.recipes) {
        await db.recipes.put(recipe);
      }
      if (backup.shoppingList && Array.isArray(backup.shoppingList)) {
        for (const item of backup.shoppingList) {
          await db.shoppingList.put(item);
        }
      }
      if (backup.categories && Array.isArray(backup.categories)) {
        for (const cat of backup.categories) {
          await db.categories.put(cat);
        }
      }
      if (backup.mealPlans && Array.isArray(backup.mealPlans)) {
        for (const mp of backup.mealPlans) {
          await db.mealPlans.put(mp);
        }
      }
      if (backup.pantry && Array.isArray(backup.pantry)) {
        for (const p of backup.pantry) {
          await db.pantry.put(p);
        }
      }
    });

    return {
      success: true,
      importedCount: backup.recipes.length,
      message: `Au fost restaurate cu succes ${backup.recipes.length} rețete!`,
    };
  } catch (error: any) {
    return {
      success: false,
      importedCount: 0,
      message: error?.message || 'Eroare la importul fișierului de backup.',
    };
  }
}
