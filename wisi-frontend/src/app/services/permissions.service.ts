import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface UserPermission {
  id: number;
  user_id: number;
  module_id: number;
  permission_id: number;
  Module?: {
    id: number;
    nombre: string;
    icono: string;
    ruta: string;
  };
  Permission?: {
    id: number;
    nombre: string;
  };
  // Compatibilidad con código existente
  moduleId?: number;
  permissionId?: number;
  permissionName?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PermissionsService {
  private apiUrl = environment.apiUrl;
  private userPermissionsSubject = new BehaviorSubject<UserPermission[]>([]);
  public userPermissions$ = this.userPermissionsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Usar los permisos que vienen del login directamente
    this.authService.userPermissions$.subscribe(permissions => {
      // Transformar permisos para incluir compatibilidad
      const transformedPermissions = permissions.map(permission => ({
        ...permission,
        // Compatibilidad con código existente
        moduleId: permission.module_id,
        permissionId: permission.permission_id,
        permissionName: permission.Permission?.nombre || ''
      }));
      this.userPermissionsSubject.next(transformedPermissions);
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
          id: item.id,
          user_id: item.user_id,
          module_id: item.module_id,
          permission_id: item.permission_id,
          Module: item.Module,
          Permission: item.Permission,
          // Compatibilidad
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
    
    // Buscar en la nueva estructura de permisos del login
    const hasPermission = currentPermissions.some(permission => {
      // Verificar si el módulo coincide
      const moduleMatches = permission.Module && permission.Module.id === moduleId;
      // Verificar si el permiso coincide
      const permissionMatches = permission.Permission && permission.Permission.nombre === permissionName;
      
      return moduleMatches && permissionMatches;
    });
    
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
