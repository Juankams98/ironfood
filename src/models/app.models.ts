
export type MealType = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner';

export interface User {
  id: string;
  email: string;
}

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  // Detailed nutritional info
  saturatedFat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number; // in mg
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  breakfast: FoodItem[];
  lunch: FoodItem[];
  snack: FoodItem[];
  dinner: FoodItem[];
}
