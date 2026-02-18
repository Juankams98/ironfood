
import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { DayLog, FoodItem, MealType } from '../models/app.models';
import { AuthService } from './auth.service';

interface UserData {
  logs: [string, DayLog][];
  savedFoods: FoodItem[];
  goals: { calories: number; protein: number; carbs: number; fat: number; };
}

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private authService = inject(AuthService);
  private currentUser = this.authService.currentUser;

  private logs = signal<Map<string, DayLog>>(new Map());
  private _savedFoods = signal<FoodItem[]>([]);
  public readonly savedFoods = this._savedFoods.asReadonly();

  private _userGoals = signal({ calories: 2500, protein: 180, carbs: 250, fat: 70 });
  public readonly userGoals = this._userGoals.asReadonly();

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.loadUserData(user.id);
      } else {
        this.clearUserData();
      }
    });
  }

  private getUserDataKey(userId: string): string {
    return `ironfood_userdata_${userId}`;
  }

  private loadUserData(userId: string): void {
    const dataKey = this.getUserDataKey(userId);
    const storedData = localStorage.getItem(dataKey);

    if (storedData) {
      const data: UserData = JSON.parse(storedData);
      this.logs.set(new Map(data.logs));
      this._savedFoods.set(data.savedFoods || []);
      this._userGoals.set(data.goals || { calories: 2500, protein: 180, carbs: 250, fat: 70 });
    } else {
      // New user, set defaults
      this.clearUserData(); // Clear any previous state
      this.initializeNewUserData(userId);
    }
  }

  private saveUserData(): void {
    const user = this.currentUser();
    if (!user) return;

    const data: UserData = {
      logs: Array.from(this.logs().entries()),
      savedFoods: this.savedFoods(),
      goals: this.userGoals()
    };
    
    localStorage.setItem(this.getUserDataKey(user.id), JSON.stringify(data));
  }

  private clearUserData(): void {
    this.logs.set(new Map());
    this._savedFoods.set([]);
    this._userGoals.set({ calories: 2500, protein: 180, carbs: 250, fat: 70 });
  }

  private initializeNewUserData(userId: string): void {
    // Add some mock data for a new user
    const today = this.formatDate(new Date());
    const initialLog: DayLog = {
      date: today,
      breakfast: [
        { id: '1', name: 'Welcome Shake', calories: 250, protein: 40, carbs: 10, fat: 5, sugar: 5, sodium: 150 },
      ],
      lunch: [],
      snack: [],
      dinner: []
    };
    this.logs.set(new Map([[today, initialLog]]));
    this._savedFoods.set([
      { id: 'sv1', name: 'Quick Protein Oats', calories: 400, protein: 30, carbs: 55, fat: 8, fiber: 9, sugar: 10 },
    ]);
    this.saveUserData();
  }

  getLogForDate(date: Date) {
    const dateString = this.formatDate(date);
    return computed(() => this.logs().get(dateString));
  }
  
  updateGoals(newGoals: { calories: number; protein: number; carbs: number; fat: number; }) {
    this._userGoals.set(newGoals);
    this.saveUserData();
  }

  saveFoodItem(foodToSave: Omit<FoodItem, 'id'>) {
    this._savedFoods.update(currentSaved => {
      if (currentSaved.some(item => item.name.toLowerCase() === foodToSave.name.toLowerCase())) {
        return currentSaved;
      }
      const newSavedItem: FoodItem = { ...foodToSave, id: crypto.randomUUID() };
      return [...currentSaved, newSavedItem];
    });
    this.saveUserData();
  }

  removeSavedFoodItem(itemId: string) {
    this._savedFoods.update(currentSaved => currentSaved.filter(item => item.id !== itemId));
    this.saveUserData();
  }

  addFoodItems(date: Date, newItems: Omit<FoodItem, 'id'>[], mealType: MealType) {
    this.logs.update(currentLogs => {
      const dateString = this.formatDate(date);
      const dayLog = currentLogs.get(dateString) || {
        date: dateString,
        breakfast: [], lunch: [], snack: [], dinner: [],
      };
      
      const itemsToAdd: FoodItem[] = newItems.map(item => ({ ...item, id: crypto.randomUUID() }));
      const mealKey = mealType.toLowerCase() as keyof Omit<DayLog, 'date'>;
      
      const updatedLog = { ...dayLog, [mealKey]: [...dayLog[mealKey], ...itemsToAdd] };
      currentLogs.set(dateString, updatedLog);
      return new Map(currentLogs);
    });
    this.saveUserData();
  }
  
  removeFoodItem(date: Date, itemId: string, mealType: MealType) {
    this.logs.update(currentLogs => {
      const dateString = this.formatDate(date);
      const dayLog = currentLogs.get(dateString);

      if (dayLog) {
        const mealKey = mealType.toLowerCase() as keyof Omit<DayLog, 'date'>;
        const updatedItems = dayLog[mealKey].filter(item => item.id !== itemId);
        const updatedLog = { ...dayLog, [mealKey]: updatedItems };
        currentLogs.set(dateString, updatedLog);
      }
      return new Map(currentLogs);
    });
    this.saveUserData();
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}
