import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenService } from '../services/token.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const token = tokenService.getToken();

  // No interceptar rutas públicas
  if (req.url.includes('/api/public/')) {
    console.log('Interceptor - Ruta pública detectada, no agregando token');
    return next(req);
  }

  console.log('Interceptor - URL:', req.url, 'Token presente:', !!token);
  console.log('Interceptor - Token completo:', token);

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    console.log('Interceptor - Agregando token a petición');
    return next(authReq);
  }

  console.log('Interceptor - Sin token, enviando petición sin autenticación');
  return next(req);
};
