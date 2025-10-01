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
        console.log('👤 Usuario autenticado, cargando permisos...', user);
        // Limpiar permisos anteriores antes de cargar nuevos
        this.userPermissionsSubject.next([]);
        // Cargar permisos del nuevo usuario
        this.loadUserPermissions();
      } else {
        console.log('❌ Usuario no autenticado, limpiando permisos');
        this.userPermissionsSubject.next([]);
      }
    });
  }

  // Cargar permisos del usuario actual
  public loadUserPermissions(): void {
    console.log('🔄 Iniciando carga de permisos del usuario...');
    this.getUserPermissions().subscribe({
      next: (permissions) => {
        console.log('🔍 Permisos cargados en el servicio:', permissions);
        console.log('📊 Total de permisos:', permissions.length);
        console.log('📋 Detalle de permisos:', permissions.map(p => ({
          moduleId: p.moduleId,
          permissionName: p.permissionName
        })));
        this.userPermissionsSubject.next(permissions);
        
        // Forzar recarga de permisos después de un breve delay para asegurar que se apliquen
        setTimeout(() => {
          console.log('🔄 Verificando permisos después de la carga...');
          this.verifyPermissionsLoaded();
        }, 100);
      },
      error: (error) => {
        console.error('❌ Error cargando permisos del usuario:', error);
        console.log('🔄 Estableciendo permisos vacíos debido al error');
        this.userPermissionsSubject.next([]);
      }
    });
  }

  // Verificar que los permisos se hayan cargado correctamente
  private verifyPermissionsLoaded(): void {
    const currentPermissions = this.userPermissionsSubject.value;
    console.log('🔍 Verificación de permisos cargados:', currentPermissions.length);
    
    if (currentPermissions.length === 0) {
      console.log('⚠️ No se cargaron permisos, intentando recarga...');
      this.forceReloadComplete();
    }
  }

  // Obtener permisos del usuario desde el backend
  getUserPermissions(): Observable<UserPermission[]> {
    console.log('🌐 Haciendo petición a:', `${this.apiUrl}/user/permissions`);
    return this.http.get<any[]>(`${this.apiUrl}/user/permissions`).pipe(
      map((response: any[]) => {
        console.log('📥 Respuesta del backend:', response);
        const permissions = response.map(item => ({
          moduleId: item.module_id,
          permissionId: item.permission_id,
          permissionName: item.Permission?.nombre || ''
        }));
        console.log('🔄 Permisos mapeados:', permissions);
        return permissions;
      })
    );
  }

  // Verificar si el usuario tiene un permiso específico para un módulo
  hasPermission(moduleId: number, permissionName: string): boolean {
    const currentPermissions = this.userPermissionsSubject.value;
    console.log(`🔍 Verificando permiso: módulo ${moduleId}, acción ${permissionName}`);
    console.log('📋 Permisos actuales:', currentPermissions);
    console.log('📋 Total de permisos:', currentPermissions.length);
    
    // Mostrar permisos específicos para este módulo
    const modulePermissions = currentPermissions.filter(p => p.moduleId === moduleId);
    console.log(`📋 Permisos para módulo ${moduleId}:`, modulePermissions);
    
    const hasPermission = currentPermissions.some(permission => 
      permission.moduleId === moduleId && 
      permission.permissionName === permissionName
    );
    
    console.log(`✅ Tiene permiso ${permissionName} para módulo ${moduleId}:`, hasPermission);
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
    console.log('🔄 Forzando recarga de permisos...');
    this.loadUserPermissions();
  }

  // Recargar permisos (útil después de cambios)
  reloadPermissions(): void {
    this.loadUserPermissions();
  }

  // Limpiar permisos (útil al cambiar de usuario)
  clearPermissions(): void {
    console.log('🧹 Limpiando permisos...');
    this.userPermissionsSubject.next([]);
  }

  // Forzar recarga completa de permisos (útil para debugging)
  forceReloadComplete(): void {
    console.log('🔄 Forzando recarga completa de permisos...');
    this.userPermissionsSubject.next([]);
    this.loadUserPermissions();
  }
}
