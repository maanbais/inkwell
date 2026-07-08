import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

/**
 * Functional route guard that protects routes from unauthenticated users.
 * If no session exists, redirects to /login.
 */
export const authGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data: { session } } = await supabaseService.client.auth.getSession();

  if (session) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

/**
 * Functional route guard that prevents authenticated users from
 * visiting login/signup pages. Redirects to /dashboard instead.
 */
export const guestGuard: CanActivateFn = async () => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data: { session } } = await supabaseService.client.auth.getSession();

  if (session) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
