import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface UserPermission {
  moduleId: number;
  permissionId: number;
  permissionName: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private apiUrl = 'http://localhost:3000/api';
  private userPermissionsSubject = new BehaviorSubject<UserPermission[]>([]);
  public userPermissions$ = this.userPermissionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Esperar a que el usuario esté autenticado antes de cargar permisos
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        // Limpiar permisos anteriores antes de cargar nuevos
        this.userPermissionsSubject.next([]);
        // Cargar permisos del nuevo usuario
        this.loadUserPermissions();
      } else {
        this.userPermissionsSubject.next([]);
      }
    });
  }

  // Cargar permisos del usuario actual
  public loadUserPermissions(): void {
    this.getUserPermissions().subscribe({
      next: (permissions) => {
        this.userPermissionsSubject.next(permissions);
        
        // Forzar recarga de permisos después de un breve delay para asegurar que se apliquen
        setTimeout(() => {
          this.verifyPermissionsLoaded();
        }, 100);
      },
      error: (error) => {
        this.userPermissionsSubject.next([]);
      }
    });
  }

  // Verificar que los permisos se hayan cargado correctamente
  private verifyPermissionsLoaded(): void {
    const currentPermissions = this.userPermissionsSubject.value;
    
    if (currentPermissions.length === 0) {
      this.forceReloadComplete();
    }
  }

  // Obtener permisos del usuario desde el backend
  getUserPermissions(): Observable<UserPermission[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/permissions`).pipe(
      map((response: any[]) => {
        const permissions = response.map(item => ({
          moduleId: item.module_id,
          permissionId: item.permission_id,
          permissionName: item.Permission?.nombre || ''
        }));
        return permissions;
      })
    );
  }

  // Verificar si el usuario tiene un permiso específico para un módulo
  hasPermission(moduleId: number, permissionName: string): boolean {
    const currentPermissions = this.userPermissionsSubject.value;
    
    // Mostrar permisos específicos para este módulo
    const modulePermissions = currentPermissions.filter(p => p.moduleId === moduleId);
    
    const hasPermission = currentPermissions.some(permission => 
      permission.moduleId === moduleId && 
      permission.permissionName === permissionName
    );
    
    return hasPermission;
  }

  // Verificar si el usuario tiene permiso de agregar
  canAdd(moduleId: number): boolean {
    return this.hasPermission(moduleId, 'AGREGAR');
  }

  // Verificar si el usuario tiene permiso de ver (acceso al módulo)
  canView(moduleId: number): boolean {
    return this.hasPermission(moduleId, 'VER');
  }

  // Verificar si el usuario tiene permiso de editar/actualizar
  canEdit(moduleId: number): boolean {
    return this.hasPermission(moduleId, 'EDITAR');
  }

  // Verificar si el usuario tiene permiso de reporte
  canReport(moduleId: number): boolean {
    return this.hasPermission(moduleId, 'REPORTE');
  }

  // Verificar si el usuario tiene permiso de eliminar
  canDelete(moduleId: number): boolean {
    return this.hasPermission(moduleId, 'BORRAR');
  }

  // Obtener permisos actuales
  getCurrentPermissions(): UserPermission[] {
    return this.userPermissionsSubject.value;
  }

  // Forzar recarga de permisos (útil para debugging)
  forceReloadPermissions(): void {
    this.loadUserPermissions();
  }

  // Recargar permisos (útil después de cambios)
  reloadPermissions(): void {
    this.loadUserPermissions();
  }

  // Limpiar permisos (útil al cambiar de usuario)
  clearPermissions(): void {
    this.userPermissionsSubject.next([]);
  }

  // Forzar recarga completa de permisos (útil para debugging)
  forceReloadComplete(): void {
    this.userPermissionsSubject.next([]);
    this.loadUserPermissions();
  }
}
