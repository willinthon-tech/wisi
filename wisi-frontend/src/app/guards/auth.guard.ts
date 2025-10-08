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
    
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return of(false);
    }
    
    
    // Si ya tenemos el usuario, permitir acceso inmediatamente
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return of(true);
    }
    
    // Si no tenemos el usuario, esperar a que se complete la verificación
    
    // Esperar un poco para que la verificación se complete
    return new Observable(observer => {
      let timeoutId: any;
      let subscription: any;
      
      // Timeout de 3 segundos
      timeoutId = setTimeout(() => {
        this.router.navigate(['/login']);
        observer.next(false);
        observer.complete();
      }, 3000);
      
      // Suscribirse al observable del usuario
      subscription = this.authService.currentUser$.subscribe({
        next: (user) => {
          if (user) {
            clearTimeout(timeoutId);
            observer.next(true);
            observer.complete();
          }
        },
        error: (error) => {
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

