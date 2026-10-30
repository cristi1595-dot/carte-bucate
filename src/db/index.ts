import Dexie, { type Table } from 'dexie';
import type { Recipe, ShoppingItem, AppBackup, CategoryItem } from '../types/recipe';
import { DEFAULT_CATEGORIES } from '../types/recipe';
import { SAMPLE_RECIPES } from './sampleRecipes';

export class CookbookDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  shoppingList!: Table<ShoppingItem, string>;
  categories!: Table<CategoryItem, string>;

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
  }
}

export const db = new CookbookDatabase();

// Seed initial recipes & default categories if empty
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
  const backup: AppBackup = {
    version: 2,
    exportDate: new Date().toISOString(),
    recipes,
    shoppingList,
    categories,
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

    await db.transaction('rw', db.recipes, db.shoppingList, db.categories, async () => {
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
