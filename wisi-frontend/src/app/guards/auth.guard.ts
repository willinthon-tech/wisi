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
    
    // Si no tenemos el usuario, permitir acceso de todas formas
    // Los permisos se cargarán en background
    return of(true);
  }
}

