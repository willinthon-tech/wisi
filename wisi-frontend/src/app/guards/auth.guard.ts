import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { PermissionsService } from '../services/permissions.service';
import { Observable, of, combineLatest, timer } from 'rxjs';
import { map, take, switchMap, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    const token = this.authService.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return of(false);
    }
    
    // Esperar tanto al usuario como a los permisos
    return combineLatest([
      this.authService.currentUser$,
      this.permissionsService.userPermissions$
    ]).pipe(
      take(1),
      switchMap(([user, permissions]) => {
        if (user && permissions.length > 0) {
          return of(true);
        } else if (user && permissions.length === 0) {
          // Usuario autenticado pero sin permisos aún, esperar un poco más
          return this.permissionsService.userPermissions$.pipe(
            timeout(3000), // Timeout de 3 segundos
            map(perms => perms.length > 0),
            take(1)
          );
        } else {
          this.router.navigate(['/login']);
          return of(false);
        }
      })
    );
  }
}

