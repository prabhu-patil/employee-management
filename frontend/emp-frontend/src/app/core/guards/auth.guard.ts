import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.ensureAuthenticated().pipe(
    map((isAuthenticated) => isAuthenticated || router.createUrlTree(['/login'])),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    return authService.ensureAuthenticated().pipe(
      map((isAuthenticated) => {
        if (!isAuthenticated) {
          return router.createUrlTree(['/login']);
        }

        const userRole = authService.getUserRole();
        return userRole && allowedRoles.includes(userRole)
          ? true
          : router.createUrlTree(['/unauthorized']);
      }),
      catchError(() => of(router.createUrlTree(['/login'])))
    );
  };
};
