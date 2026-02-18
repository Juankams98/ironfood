
import { Component, ChangeDetectionStrategy, input, inject, signal, ViewChild, ElementRef, output, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { GeminiService } from '../../services/gemini.service';
import { FoodItem, MealType } from '../../models/app.models';

type LoggerState = 'selectingMeal' | 'idle' | 'capturing' | 'loading' | 'success' | 'error' | 'savedList';

@Component({
  selector: 'app-food-logger',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './food-logger.component.html',
  styleUrls: ['./food-logger.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FoodLoggerComponent implements OnDestroy {
  logDate = input.required<Date>();
  closeRequest = output<void>();
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  private dataService = inject(DataService);
  private geminiService = inject(GeminiService);

  status = signal<LoggerState>('selectingMeal');
  errorMessage = signal<string | null>(null);
  analyzedFoods = signal<Omit<FoodItem, 'id'>[]>([]);
  imagePreviewUrl = signal<string | null>(null);
  private mediaStream = signal<MediaStream | null>(null);
  selectedMealType = signal<MealType | null>(null);

  savedFoods = this.dataService.savedFoods;
  justSavedItemNames = signal(new Set<string>());

  constructor() {
    effect(() => {
        const stream = this.mediaStream();
        if (this.videoElement?.nativeElement) {
            this.videoElement.nativeElement.srcObject = stream;
        }
    });
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  selectMealType(mealType: MealType) {
    this.selectedMealType.set(mealType);
    this.status.set('idle');
  }
  
  showMealSelection() {
    this.status.set('selectingMeal');
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviewUrl.set(e.target?.result as string);
        this.analyzeImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  }

  async startCamera() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        this.status.set('capturing');
        this.mediaStream.set(stream);
      } catch (err) {
        console.error("Error accessing camera: ", err);
        this.errorMessage.set('Could not access the camera. Please check permissions.');
        this.status.set('error');
      }
    } else {
        this.errorMessage.set('Camera not supported on this device.');
        this.status.set('error');
    }
  }

  stopCamera() {
    this.mediaStream()?.getTracks().forEach(track => track.stop());
    this.mediaStream.set(null);
  }

  cancelCapture() {
    this.stopCamera();
    this.status.set('idle');
  }

  capturePhoto() {
    if (!this.videoElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        this.imagePreviewUrl.set(dataUrl);
        this.stopCamera();
        
        const base64 = dataUrl.split(',')[1];
        this.startAnalysis(base64);
    }
  }

  private async analyzeImageFile(file: File) {
    try {
        const base64Image = await this.fileToBase64(file);
        await this.startAnalysis(base64Image);
    } catch(err) {
        this.errorMessage.set("Could not read the selected file.");
        this.status.set('error');
    }
  }

  private async startAnalysis(base64Image: string) {
    this.status.set('loading');
    this.errorMessage.set(null);
    this.analyzedFoods.set([]);

    try {
      const results = await this.geminiService.getMacrosFromImage(base64Image);
      
      if(results.length === 0){
        this.errorMessage.set("AI couldn't identify any food. Please try a clearer photo.");
        this.status.set('error');
      } else {
        this.analyzedFoods.set(results);
        this.status.set('success');
      }
    } catch (error: any) {
      this.errorMessage.set(error.message || 'An unknown error occurred.');
      this.status.set('error');
    }
  }

  addAnalyzedFoodsToLog() {
    const mealType = this.selectedMealType();
    if (this.analyzedFoods().length > 0 && mealType) {
      this.dataService.addFoodItems(this.logDate(), this.analyzedFoods(), mealType);
      this.resetLogger();
      this.closeRequest.emit();
    }
  }
  
  addSavedFoodToLog(food: FoodItem) {
    const mealType = this.selectedMealType();
    if (mealType) {
      const { id, ...foodToAdd } = food;
      this.dataService.addFoodItems(this.logDate(), [foodToAdd], mealType);
      this.closeRequest.emit();
    }
  }

  saveFoodForLater(food: Omit<FoodItem, 'id'>) {
    this.dataService.saveFoodItem(food);
    this.justSavedItemNames.update(set => {
        set.add(food.name);
        return new Set(set);
    });
  }

  removeSavedFood(itemId: string | undefined) {
    if (itemId) {
      this.dataService.removeSavedFoodItem(itemId);
    }
  }

  showSavedList() {
    this.status.set('savedList');
  }

  showIdle() {
    this.status.set('idle');
  }

  cancel() {
    this.resetLogger();
    this.closeRequest.emit();
  }

  resetLogger() {
    this.stopCamera();
    this.status.set('selectingMeal');
    this.selectedMealType.set(null);
    this.errorMessage.set(null);
    this.analyzedFoods.set([]);
    this.imagePreviewUrl.set(null);
    this.justSavedItemNames.set(new Set());
    if(this.fileInput) {
        this.fileInput.nativeElement.value = '';
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove the data URL prefix e.g. "data:image/jpeg;base64,"
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  }
}