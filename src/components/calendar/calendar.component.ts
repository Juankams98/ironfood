
import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarComponent {
  selectedDate = input.required<Date>();
  dateSelected = output<Date>();

  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  
  weeks: Date[][] = [];
  monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  
  constructor() {
    this.generateCalendar();
  }

  generateCalendar() {
    this.weeks = [];
    const startDate = new Date(this.currentYear, this.currentMonth, 1);
    const endDate = new Date(this.currentYear, this.currentMonth + 1, 0);
    const numDays = endDate.getDate();

    let currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - startDate.getDay());

    while (currentDate <= endDate || this.weeks.length < 6) {
      const week: Date[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      this.weeks.push(week);
      if (currentDate.getMonth() !== this.currentMonth && this.weeks.length >= 4) {
        break;
      }
    }
  }
  
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  isToday(date: Date): boolean {
    return this.isSameDay(date, new Date());
  }

  selectDate(date: Date) {
    if (date.getMonth() === this.currentMonth) {
      this.dateSelected.emit(date);
    }
  }
  
  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }
}