import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    console.log('🔐 AuthGuard - Verificando autenticación...');
    
    const token = this.authService.getToken();
    if (!token) {
      console.log('❌ AuthGuard - No hay token, redirigiendo al login');
      this.router.navigate(['/login']);
      return of(false);
    }
    
    console.log('🔐 AuthGuard - Token presente, verificando...');
    
    // Si ya tenemos el usuario, permitir acceso inmediatamente
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      console.log('✅ AuthGuard - Usuario ya cargado, permitiendo acceso');
      return of(true);
    }
    
    // Si no tenemos el usuario, esperar a que se complete la verificación
    console.log('⏳ AuthGuard - Esperando verificación del token...');
    
    // Esperar un poco para que la verificación se complete
    return new Observable(observer => {
      let timeoutId: any;
      let subscription: any;
      
      // Timeout de 3 segundos
      timeoutId = setTimeout(() => {
        console.log('⏰ AuthGuard - Timeout esperando verificación');
        this.router.navigate(['/login']);
        observer.next(false);
        observer.complete();
      }, 3000);
      
      // Suscribirse al observable del usuario
      subscription = this.authService.currentUser$.subscribe({
        next: (user) => {
          if (user) {
            console.log('✅ AuthGuard - Usuario verificado, permitiendo acceso');
            clearTimeout(timeoutId);
            observer.next(true);
            observer.complete();
          }
        },
        error: (error) => {
          console.error('❌ AuthGuard - Error en verificación:', error);
          clearTimeout(timeoutId);
          this.router.navigate(['/login']);
          observer.next(false);
          observer.complete();
        }
      });
      
      // Cleanup function
      return () => {
        clearTimeout(timeoutId);
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  }
}

