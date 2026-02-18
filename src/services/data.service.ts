
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DayLog, FoodItem, MealType } from '../models/app.models';
import { AuthService } from './auth.service';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private authService = inject(AuthService);
  private currentUser = this.authService.currentUser;
  private supabase: SupabaseClient;

  private logs = signal<Map<string, DayLog>>(new Map());
  private _savedFoods = signal<FoodItem[]>([]);
  public readonly savedFoods = this._savedFoods.asReadonly();

  private _userGoals = signal({ calories: 2500, protein: 180, carbs: 250, fat: 70 });
  public readonly userGoals = this._userGoals.asReadonly();

  constructor() {
    this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.loadInitialUserData(user.id);
      } else {
        this.clearUserData();
      }
    });
  }

  private async loadInitialUserData(userId: string): Promise<void> {
    await Promise.all([
      this.loadGoals(userId),
      this.loadSavedFoods(userId),
      this.loadLogForDate(new Date()) // Pre-load today's data
    ]);
  }
  
  private async loadGoals(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('calories_goal, protein_goal, carbs_goal, fat_goal')
      .eq('user_id', userId)
      .single();

    if (data) {
      this._userGoals.set({
        calories: data.calories_goal,
        protein: data.protein_goal,
        carbs: data.carbs_goal,
        fat: data.fat_goal
      });
    } else if (error) {
      console.error('Error fetching user goals:', error);
    }
  }

  private async loadSavedFoods(userId: string): Promise<void> {
    const { data, error } = await this.supabase
      .from('saved_foods')
      .select('*')
      .eq('user_id', userId);

    if (data) {
      const saved: FoodItem[] = data.map(item => ({
        id: item.id,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        saturatedFat: item.saturated_fat,
        fiber: item.fiber,
        sugar: item.sugar,
        sodium: item.sodium,
      }));
      this._savedFoods.set(saved);
    } else if (error) {
        console.error("Error fetching saved foods:", error);
    }
  }
  
  async loadLogForDate(date: Date) {
    const dateString = this.formatDate(date);
    const user = this.currentUser();
    if (!user) return;
    if (this.logs().has(dateString)) return; // Already loaded

    const { data, error } = await this.supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('log_date', dateString);
      
    if (data) {
      const newLog: DayLog = {
          date: dateString,
          breakfast: [], lunch: [], snack: [], dinner: []
      };
      
      for(const item of data) {
          const foodItem: FoodItem = {
              id: item.id,
              name: item.name,
              calories: item.calories, protein: item.protein, carbs: item.carbs, fat: item.fat,
              saturatedFat: item.saturated_fat, fiber: item.fiber, sugar: item.sugar, sodium: item.sodium
          };
          const mealKey = item.meal_type.toLowerCase() as keyof Omit<DayLog, 'date'>;
          if (newLog[mealKey]) {
            newLog[mealKey].push(foodItem);
          }
      }
      this.logs.update(currentLogs => new Map(currentLogs.set(dateString, newLog)));

    } else if(error) {
        console.error(`Error fetching log for ${dateString}:`, error);
    } else {
      // No data, set an empty log to prevent re-fetching
      this.logs.update(currentLogs => new Map(currentLogs.set(dateString, {
          date: dateString,
          breakfast: [], lunch: [], snack: [], dinner: []
      })));
    }
  }

  private clearUserData(): void {
    this.logs.set(new Map());
    this._savedFoods.set([]);
    this._userGoals.set({ calories: 2500, protein: 180, carbs: 250, fat: 70 });
  }

  getLogForDate(date: Date) {
    const dateString = this.formatDate(date);
    return computed(() => this.logs().get(dateString));
  }
  
  async updateGoals(newGoals: { calories: number; protein: number; carbs: number; fat: number; }) {
    const user = this.currentUser();
    if (!user) return;

    this._userGoals.set(newGoals);
    
    const { error } = await this.supabase
      .from('profiles')
      .update({ 
        calories_goal: newGoals.calories,
        protein_goal: newGoals.protein,
        carbs_goal: newGoals.carbs,
        fat_goal: newGoals.fat
      })
      .eq('user_id', user.id);
      
    if (error) console.error("Error updating goals:", error);
  }

  async saveFoodItem(foodToSave: Omit<FoodItem, 'id'>) {
    const user = this.currentUser();
    if (!user) return;
    
    if (this.savedFoods().some(item => item.name.toLowerCase() === foodToSave.name.toLowerCase())) {
      return;
    }
    
    const { data, error } = await this.supabase
      .from('saved_foods')
      .insert({
        user_id: user.id,
        name: foodToSave.name,
        calories: foodToSave.calories,
        protein: foodToSave.protein,
        carbs: foodToSave.carbs,
        fat: foodToSave.fat,
        saturated_fat: foodToSave.saturatedFat,
        fiber: foodToSave.fiber,
        sugar: foodToSave.sugar,
        sodium: foodToSave.sodium
      })
      .select()
      .single();

    if (data) {
      const newSavedItem: FoodItem = { ...foodToSave, id: data.id };
      this._savedFoods.update(currentSaved => [...currentSaved, newSavedItem]);
    } else if (error) {
      console.error("Error saving food item:", error);
    }
  }

  async removeSavedFoodItem(itemId: string) {
    this._savedFoods.update(currentSaved => currentSaved.filter(item => item.id !== itemId));
    
    const { error } = await this.supabase
      .from('saved_foods')
      .delete()
      .eq('id', itemId);
      
    if (error) console.error("Error removing saved food:", error);
  }

  async addFoodItems(date: Date, newItems: Omit<FoodItem, 'id'>[], mealType: MealType) {
    const user = this.currentUser();
    if (!user) return;

    const itemsToInsert = newItems.map(item => ({
        user_id: user.id,
        log_date: this.formatDate(date),
        meal_type: mealType,
        name: item.name,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        saturated_fat: item.saturatedFat,
        fiber: item.fiber,
        sugar: item.sugar,
        sodium: item.sodium
    }));
    
    const { data, error } = await this.supabase
      .from('food_logs')
      .insert(itemsToInsert)
      .select();

    if (data) {
      // Refetch the log for the day to ensure consistency
      this.loadLogForDate(date);
    } else if (error) {
      console.error("Error adding food items:", error);
    }
  }
  
  async removeFoodItem(date: Date, itemId: string, mealType: MealType) {
    // Optimistic update
    const dateString = this.formatDate(date);
    this.logs.update(currentLogs => {
      const dayLog = currentLogs.get(dateString);
      if (dayLog) {
          const mealKey = mealType.toLowerCase() as keyof Omit<DayLog, 'date'>;
          const updatedItems = dayLog[mealKey].filter(item => item.id !== itemId);
          const updatedLog = { ...dayLog, [mealKey]: updatedItems };
          currentLogs.set(dateString, updatedLog);
      }
      return new Map(currentLogs);
    });

    const { error } = await this.supabase
      .from('food_logs')
      .delete()
      .eq('id', itemId);
      
    if (error) {
      console.error("Error removing food item:", error);
      // Revert optimistic update if there was an error
      this.loadLogForDate(date);
    }
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}