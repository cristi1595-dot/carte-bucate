import Dexie, { type Table } from 'dexie';
import type { Recipe, ShoppingItem, AppBackup } from '../types/recipe';
import { SAMPLE_RECIPES } from './sampleRecipes';

export class CookbookDatabase extends Dexie {
  recipes!: Table<Recipe, string>;
  shoppingList!: Table<ShoppingItem, string>;

  constructor() {
    super('CookbookDB');
    this.version(1).stores({
      recipes: 'id, title, category, *tags, isFavorite, createdAt, updatedAt',
      shoppingList: 'id, name, checked, createdAt',
    });
  }
}

export const db = new CookbookDatabase();

// Seed initial recipes if database is empty on first launch
export async function seedInitialRecipesIfEmpty() {
  try {
    const count = await db.recipes.count();
    if (count === 0) {
      await db.recipes.bulkAdd(SAMPLE_RECIPES);
    }
  } catch (error) {
    console.error('Error seeding initial recipes:', error);
  }
}

// Export entire database as JSON backup
export async function exportDatabaseBackup(): Promise<string> {
  const recipes = await db.recipes.toArray();
  const shoppingList = await db.shoppingList.toArray();
  const backup: AppBackup = {
    version: 1,
    exportDate: new Date().toISOString(),
    recipes,
    shoppingList,
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

    await db.transaction('rw', db.recipes, db.shoppingList, async () => {
      for (const recipe of backup.recipes) {
        await db.recipes.put(recipe);
      }
      if (backup.shoppingList && Array.isArray(backup.shoppingList)) {
        for (const item of backup.shoppingList) {
          await db.shoppingList.put(item);
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
