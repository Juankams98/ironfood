
import { Injectable, signal } from '@angular/core';
import { User } from '../models/app.models';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { supabaseConfig } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  currentUser = signal<User | null>(null);

  constructor() {
    this.supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    this.checkSession();

    this.supabase.auth.onAuthStateChange((event, session) => {
      this.handleAuthChange(session);
    });
  }

  private async checkSession(): Promise<void> {
    const { data } = await this.supabase.auth.getSession();
    this.handleAuthChange(data.session);
  }
  
  private handleAuthChange(session: Session | null): void {
      if (session?.user) {
        this.currentUser.set({
          id: session.user.id,
          email: session.user.email!,
        });
      } else {
        this.currentUser.set(null);
      }
  }

  async register(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signUp({
      email: email,
      password: password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
    if (!data.user) {
      throw new Error('Registration failed: no user returned.');
    }

    return { id: data.user.id, email: data.user.email! };
  }

  async login(email: string, password: string): Promise<User> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    
    if (error) {
      throw new Error(error.message);
    }
     if (!data.user) {
      throw new Error('Login failed: no user returned.');
    }
    
    return { id: data.user.id, email: data.user.email! };
  }

  async logout(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
        console.error("Error signing out:", error);
    }
    // The onAuthStateChange listener will handle setting currentUser to null
  }
}