
import { Injectable, signal, effect } from '@angular/core';
import { User } from '../models/app.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USERS_KEY = 'ironfood_users';
  private readonly SESSION_KEY = 'ironfood_session';

  currentUser = signal<User | null>(null);

  constructor() {
    this.checkSession();

    // Effect to update session storage when user changes
    effect(() => {
      const user = this.currentUser();
      if (user) {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify({ userId: user.id }));
      } else {
        localStorage.removeItem(this.SESSION_KEY);
      }
    });
  }

  private getUsers(): Map<string, { id: string, email: string, passwordHash: string }> {
    const usersJson = localStorage.getItem(this.USERS_KEY);
    if (!usersJson) {
      return new Map();
    }
    // Stored as array of [email, userObject]
    return new Map(JSON.parse(usersJson));
  }

  private saveUsers(users: Map<string, any>): void {
    // Convert map to array for JSON serialization
    localStorage.setItem(this.USERS_KEY, JSON.stringify(Array.from(users.entries())));
  }

  private checkSession(): void {
    const sessionJson = localStorage.getItem(this.SESSION_KEY);
    if (sessionJson) {
      const { userId } = JSON.parse(sessionJson);
      if (userId) {
        const users = this.getUsers();
        const loggedInUser = Array.from(users.values()).find(u => u.id === userId);
        if (loggedInUser) {
          this.currentUser.set({ id: loggedInUser.id, email: loggedInUser.email });
        }
      }
    }
  }

  async register(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    if (users.has(email.toLowerCase())) {
      throw new Error('Email already in use.');
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: email.toLowerCase(),
      passwordHash: password, // In a real app, hash this!
    };

    users.set(newUser.email, newUser);
    this.saveUsers(users);

    const userForApp: User = { id: newUser.id, email: newUser.email };
    this.currentUser.set(userForApp);
    return userForApp;
  }

  async login(email: string, password: string): Promise<User> {
    const users = this.getUsers();
    const userRecord = users.get(email.toLowerCase());

    if (!userRecord || userRecord.passwordHash !== password) {
      throw new Error('Invalid email or password.');
    }

    const userForApp: User = { id: userRecord.id, email: userRecord.email };
    this.currentUser.set(userForApp);
    return userForApp;
  }

  logout(): void {
    this.currentUser.set(null);
  }
}
