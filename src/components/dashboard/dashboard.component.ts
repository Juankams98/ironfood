
import { Component, ChangeDetectionStrategy, input, computed, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { FoodItem, MealType } from '../../models/app.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  displayDate = input.required<Date>();
  private dataService = inject(DataService);
  
  dailyLog = computed(() => this.dataService.getLogForDate(this.displayDate())());
  expandedItemId = signal<string | null>(null);

  constructor() {
    effect(() => {
        // When the input date changes, trigger a data load for that date.
        this.dataService.loadLogForDate(this.displayDate());
    });
  }

  totals = computed(() => {
    const log = this.dailyLog();
    if (!log) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    const allItems = [...log.breakfast, ...log.lunch, ...log.snack, ...log.dinner];
    return allItems.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  });
  
  goals = this.dataService.userGoals;

  // Computed signals for progress percentages
  caloriesProgress = computed(() => {
    const goals = this.goals();
    return Math.min((this.totals().calories / (goals.calories || 1)) * 100, 100);
  });
  proteinProgress = computed(() => {
    const goals = this.goals();
    return Math.min((this.totals().protein / (goals.protein || 1)) * 100, 100);
  });
  carbsProgress = computed(() => {
    const goals = this.goals();
    return Math.min((this.totals().carbs / (goals.carbs || 1)) * 100, 100);
  });
  fatProgress = computed(() => {
    const goals = this.goals();
    return Math.min((this.totals().fat / (goals.fat || 1)) * 100, 100);
  });

  hasItems = computed(() => {
    const log = this.dailyLog();
    if (!log) return false;
    return log.breakfast.length > 0 || log.lunch.length > 0 || log.snack.length > 0 || log.dinner.length > 0;
  });

  getFormattedDate(): string {
    return this.displayDate().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onRemoveItem(item: FoodItem, mealType: MealType) {
    if (item.id) {
        this.dataService.removeFoodItem(this.displayDate(), item.id, mealType);
    }
  }

  toggleItemDetail(itemId: string | undefined) {
    if (!itemId) return;
    this.expandedItemId.update(currentId => currentId === itemId ? null : itemId);
  }
}