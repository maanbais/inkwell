import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthResponse {
  success: boolean;
  error: string | null;
  session: Session | null;
  needsEmailConfirmation?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  // Reactive state using Angular Signals
  currentUser = signal<User | null>(null);
  currentSession = signal<Session | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isLoading = signal(true);

  constructor() {
    this.initAuthListener();
  }

  /**
   * Listen for auth state changes (login, logout, token refresh).
   * This runs once on app start and keeps the user signal in sync.
   */
  private initAuthListener() {
    // Get the initial session on app load
    this.supabaseService.client.auth.getSession().then(({ data: { session } }) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
    });

    // Listen for all future auth changes
    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      this.isLoading.set(false);
    });
  }

  /**
   * Sign up with email, password, and full name.
   * The full_name is stored in user_metadata, and the DB trigger
   * auto-creates a profile row.
   */
  async signUp(email: string, password: string, fullName: string): Promise<AuthResponse> {
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim()
        }
      }
    });

    if (error) {
      return { success: false, error: error.message, session: null };
    }

    return {
      success: true,
      error: null,
      session: data.session,
      needsEmailConfirmation: !data.session
    };
  }

  /**
   * Sign in with email and password.
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) {
      return { success: false, error: error.message, session: null };
    }

    return { success: true, error: null, session: data.session };
  }

  /**
   * Sign out the current user and redirect to landing page.
   */
  async signOut(): Promise<void> {
    await this.supabaseService.client.auth.signOut();
    this.router.navigate(['/']);
  }

  /**
   * Get the current user's profile from the profiles table.
   */
  async getProfile() {
    const user = this.currentUser();
    if (!user) return null;

    const { data, error } = await this.supabaseService.client
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error.message);
      return null;
    }

    return data;
  }
}
