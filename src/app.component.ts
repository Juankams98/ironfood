
import { Component, signal, inject } from '@angular/core';
import { ChangeDetectionStrategy } from '@angular/core';
import { CalendarComponent } from './components/calendar/calendar.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { FoodLoggerComponent } from './components/food-logger/food-logger.component';
import { CommonModule } from '@angular/common';
import { ProfileComponent } from './components/profile/profile.component';
import { AuthService } from './services/auth.service';
import { AuthComponent } from './components/auth/auth.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    CalendarComponent,
    DashboardComponent,
    FoodLoggerComponent,
    ProfileComponent,
    AuthComponent,
  ]
})
export class AppComponent {
  private authService = inject(AuthService);
  currentUser = this.authService.currentUser;
  
  title = 'IronFood';
  selectedDate = signal(new Date());
  currentView = signal<'dashboard' | 'calendar' | 'profile'>('dashboard');
  isLoggerOpen = signal(false);

  handleDateSelected(date: Date) {
    this.selectedDate.set(date);
    this.changeView('dashboard');
  }

  changeView(view: 'dashboard' | 'calendar' | 'profile') {
    this.currentView.set(view);
  }

  openLogger() {
    this.isLoggerOpen.set(true);
  }

  closeLogger() {
    this.isLoggerOpen.set(false);
  }
}
