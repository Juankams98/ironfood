import { Injectable, signal, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private platformId = inject(PLATFORM_ID);
  private installPromptEvent: any = null;

  canInstall = signal(false);
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
        window.addEventListener('beforeinstallprompt', (event) => {
            // Prevent the mini-infobar from appearing on mobile
            event.preventDefault();
            // Stash the event so it can be triggered later.
            this.installPromptEvent = event;
            // Update UI to notify the user they can add to home screen
            this.canInstall.set(true);
        });

        window.addEventListener('appinstalled', () => {
            // Hide the app-provided install promotion
            this.canInstall.set(false);
            // Clear the deferred prompt
            this.installPromptEvent = null;
            console.log('PWA was installed');
        });
    }
  }

  promptInstall(): void {
    if (this.installPromptEvent) {
      this.installPromptEvent.prompt();
      // Wait for the user to respond to the prompt
      this.installPromptEvent.userChoice.then((choiceResult: { outcome: string }) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        this.canInstall.set(false);
        this.installPromptEvent = null;
      });
    }
  }
}
