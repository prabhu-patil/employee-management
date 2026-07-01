import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('access_token');
  const apiUrl = environment.apiUrl;

  let clonedReq = req;
  if (token && req.url.startsWith(apiUrl)) {
    clonedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(clonedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      const isRefreshRequest = req.url.includes('/auth/refresh');
      const isLoginRequest = req.url.includes('/auth/login');

      if (
        error.status === 401 &&
        localStorage.getItem('refresh_token') &&
        !isRefreshRequest &&
        !isLoginRequest
      ) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newToken = localStorage.getItem('access_token');
            const retryReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${newToken}`
              }
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            authService.logout();
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => error);
    })
  );
};

export default jwtInterceptor;
