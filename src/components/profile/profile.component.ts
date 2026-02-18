
import { Component, ChangeDetectionStrategy, inject, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;
  closeProfile = output<void>();
  saveStatus = signal<'idle' | 'saved'>('idle');
  userGoals = this.dataService.userGoals;

  goalsForm = this.fb.group({
    calories: [0, [Validators.required, Validators.min(0)]],
    protein: [0, [Validators.required, Validators.min(0)]],
    carbs: [0, [Validators.required, Validators.min(0)]],
    fat: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    effect(() => {
        this.goalsForm.patchValue(this.userGoals(), { emitEvent: false });
    });
  }

  saveGoals() {
    if (this.goalsForm.valid) {
      const formValue = this.goalsForm.value;
      const newGoals = {
        calories: Number(formValue.calories),
        protein: Number(formValue.protein),
        carbs: Number(formValue.carbs),
        fat: Number(formValue.fat),
      };
      this.dataService.updateGoals(newGoals);
      this.saveStatus.set('saved');
      setTimeout(() => this.saveStatus.set('idle'), 2000); // Reset after 2s
    }
  }

  goBack() {
    this.closeProfile.emit();
  }

  logout() {
    this.authService.logout();
  }
}