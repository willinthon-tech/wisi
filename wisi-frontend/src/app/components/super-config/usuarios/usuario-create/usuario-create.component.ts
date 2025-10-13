import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService, CreateUserRequest, ModulePermission } from '../../../../services/user.service';

@Component({
  selector: 'app-usuario-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="create-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          ← Volver a Usuarios
        </button>
        <h2>Crear Nuevo Usuario</h2>
      </div>

      <div class="form-section" *ngIf="!loadingData">
        <form (ngSubmit)="createUser()" #userForm="ngForm">
          <div class="form-row">
            <div class="form-group">
              <label for="nombre_apellido">Nombre y Apellido *</label>
              <input 
                type="text" 
                id="nombre_apellido"
                [(ngModel)]="user.nombre_apellido" 
                name="nombre_apellido"
                class="form-input"
                placeholder="Ingresa el nombre completo"
                required
                #nombreInput="ngModel">
              <div class="error-message" *ngIf="nombreInput.invalid && nombreInput.touched">
                El nombre y apellido es requerido
              </div>
            </div>

            <div class="form-group">
              <label for="usuario">Usuario *</label>
              <input 
                type="text" 
                id="usuario"
                [(ngModel)]="user.usuario" 
                name="usuario"
                class="form-input"
                placeholder="Nombre de usuario único"
                required
                #usuarioInput="ngModel">
              <div class="error-message" *ngIf="usuarioInput.invalid && usuarioInput.touched">
                El usuario es requerido
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="password">Contraseña *</label>
              <input 
                type="password" 
                id="password"
                [(ngModel)]="user.password" 
                name="password"
                class="form-input"
                placeholder="Contraseña segura"
                required
                #passwordInput="ngModel">
              <div class="error-message" *ngIf="passwordInput.invalid && passwordInput.touched">
                La contraseña es requerida
              </div>
            </div>

          </div>

          <div class="form-section-group">
            <h3>Asignar Salas</h3>
            <div class="selection-grid" *ngIf="availableSalas.length > 0">
              <div class="selection-item" *ngFor="let sala of availableSalas">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    [value]="sala.id"
                    (change)="toggleSala(sala.id, $event)"
                    [checked]="selectedSalas.includes(sala.id)">
                  <span class="checkmark"></span>
                  <div class="item-info">
                    <strong>{{ sala.nombre }}</strong>
                  </div>
                </label>
              </div>
            </div>
            <div class="empty-message" *ngIf="availableSalas.length === 0">
              No hay salas disponibles. <a href="/super-config/salas/crear">Crear una sala primero</a>
            </div>
          </div>

          <div class="form-section-group">
            <h3>Asignar Módulos y Permisos</h3>
            <p class="section-description">
              Selecciona las páginas, módulos y define qué puede hacer el usuario en cada uno
            </p>
            
            <div class="hierarchical-container" *ngIf="availablePages.length > 0">
              <div class="page-section" *ngFor="let page of availablePages">
                <div class="page-header" (click)="togglePageExpansion(page.id)">
                  <div class="page-info">
                    <strong>{{ getPageIcon(page.icono) }} {{ page.nombre }}</strong>
                    <small>{{ getModulesCount(page.id) }} módulos disponibles</small>
                    <span class="expand-icon" [class.expanded]="isPageExpanded(page.id)">▼</span>
                  </div>
                </div>
                
                <div class="modules-container" *ngIf="isPageExpanded(page.id)">
                  <div class="module-section" *ngFor="let module of getPageModules(page.id)">
                    <div class="module-header">
                      <div class="module-controls">
                        <label class="module-checkbox-label">
                          <input 
                            type="checkbox" 
                            [checked]="isModuleSelected(module.id)"
                            (change)="toggleModule(module.id, $event)">
                          <span class="module-checkmark"></span>
                        </label>
                        <div class="module-info" (click)="toggleModuleExpansion(module.id)">
                          <div class="module-title">
                            <strong>{{ getModuleIcon(module.icono) }} {{ module.nombre }}</strong>
                            <span class="expand-icon" [class.expanded]="isModuleExpanded(module.id)">▼</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div class="permissions-section" *ngIf="isModuleExpanded(module.id)">
                      <div class="permissions-header">
                        <h4>¿Qué puede hacer en este módulo?</h4>
                        <label class="select-all-checkbox">
                          <input 
                            type="checkbox" 
                            [checked]="areAllPermissionsSelected(module.id)"
                            (change)="toggleAllPermissions(module.id, $event)">
                          <span class="select-all-text">Seleccionar todos</span>
                        </label>
                      </div>
                      <div class="permissions-grid">
                        <div class="permission-item" *ngFor="let permission of getVisiblePermissions()">
                          <label class="permission-checkbox-label">
                            <input 
                              type="checkbox" 
                              [value]="permission.id"
                              (change)="toggleModulePermission(module.id, permission.id, $event)"
                              [checked]="hasModulePermission(module.id, permission.id)">
                            <span class="permission-checkmark"></span>
                            <div class="permission-info">
                              <strong>{{ getPermissionIcon(permission.nombre) }} {{ permission.nombre }}</strong>
                            </div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="empty-message" *ngIf="availablePages.length === 0">
              No hay páginas disponibles
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="loading || userForm.invalid">
              {{ loading ? 'Creando...' : 'Crear Usuario' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loadingData">
        <div class="spinner"></div>
        <p>Cargando datos...</p>
      </div>
    </div>
  `,
  styles: [`
    .create-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .header-section {
      margin-bottom: 30px;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .btn-back:hover {
      background: #5a6268;
    }

    .header-section h2 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }

    .form-section {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 25px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #333;
      font-size: 16px;
    }

    .form-input, .form-select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      font-family: inherit;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .form-section-group {
      margin: 30px 0;
      padding: 25px;
      background: #f8f9fa;
      border-radius: 10px;
      border: 1px solid #e9ecef;
    }

    .form-section-group h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 20px;
    }

    .selection-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 15px;
    }

    .selection-item {
      background: white;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.3s;
    }

    .selection-item:hover {
      border-color: #4CAF50;
      background: #f0f8f0;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      cursor: pointer;
      width: 100%;
    }

    .checkbox-label input[type="checkbox"] {
      margin-right: 12px;
      margin-top: 2px;
      transform: scale(1.2);
    }

    .item-info {
      flex: 1;
    }

    .item-info strong {
      display: block;
      color: #333;
      margin-bottom: 4px;
    }

    .item-info small {
      color: #666;
      font-size: 13px;
    }

    .empty-message {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 20px;
    }

    .empty-message a {
      color: #4CAF50;
      text-decoration: none;
      font-weight: bold;
    }

    .empty-message a:hover {
      text-decoration: underline;
    }

    .permissions-by-module {
      display: flex;
      flex-direction: column;
      gap: 25px;
    }

    .module-permissions {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
      background: white;
    }

    .module-permissions h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #e9ecef;
    }

    .section-description {
      margin: 0 0 20px 0;
      color: #666;
      font-size: 14px;
      font-style: italic;
    }

    .hierarchical-container {
      display: flex;
      flex-direction: column;
      gap: 25px;
      position: relative;
    }

    .hierarchical-container::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: linear-gradient(to bottom, #4CAF50, #28a745);
      border-radius: 1px;
    }

    .page-section {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      background: white;
      overflow: hidden;
      transition: all 0.3s;
      margin-left: 20px;
      position: relative;
    }

    .page-section::before {
      content: '';
      position: absolute;
      left: -20px;
      top: 50%;
      width: 20px;
      height: 2px;
      background: #4CAF50;
      transform: translateY(-50%);
    }

    .page-section:hover {
      border-color: #4CAF50;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
    }

    .page-header {
      padding: 20px;
      background: #f0f8ff;
      border-bottom: 1px solid #e9ecef;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .page-header:hover {
      background: #e6f3ff;
    }

    .page-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .page-info-content {
      flex: 1;
    }

    .page-info strong {
      display: block;
      color: #333;
      font-size: 20px;
      margin-bottom: 5px;
    }

    .page-info small {
      color: #666;
      font-size: 14px;
    }

    .expand-icon {
      font-size: 16px;
      color: #666;
      transition: transform 0.3s;
      margin-left: 10px;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .modules-container {
      padding: 20px 20px 20px 40px;
      background: #f8f9fa;
      border-left: 3px solid #4CAF50;
      margin-left: 20px;
    }

    .module-section {
      margin-bottom: 15px;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      background: white;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .module-section:last-child {
      margin-bottom: 0;
    }

    .module-header {
      padding: 15px;
      cursor: pointer;
      transition: background-color 0.3s;
    }

    .module-header:hover {
      background: #f8f9fa;
    }

    .module-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }

    .modules-permissions-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .module-permission-card {
      border: 2px solid #e9ecef;
      border-radius: 12px;
      background: white;
      overflow: hidden;
      transition: all 0.3s;
    }

    .module-permission-card:hover {
      border-color: #4CAF50;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.1);
    }

    .module-header {
      padding: 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .module-controls {
      display: flex;
      align-items: center;
      width: 100%;
    }

    .module-checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      margin-right: 15px;
    }

    .module-checkbox-label input[type="checkbox"] {
      margin-right: 8px;
      transform: scale(1.2);
    }

    .module-checkmark {
      margin-right: 5px;
    }

    .module-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .module-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .module-title strong {
      color: #333;
      font-size: 18px;
    }

    .module-page-info {
      margin-top: 5px;
    }

    .page-badge {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #bbdefb;
    }

    .permissions-section {
      padding: 20px 20px 20px 40px;
      background: #f0f8f0;
      border-left: 3px solid #28a745;
      margin-left: 20px;
    }

    .permissions-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .permissions-section h4 {
      margin: 0;
      color: #333;
      font-size: 16px;
    }

    .select-all-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      background: #e8f5e8;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #28a745;
      transition: all 0.3s;
    }

    .select-all-checkbox:hover {
      background: #d4edda;
    }

    .select-all-checkbox input[type="checkbox"] {
      margin-right: 8px;
      transform: scale(1.1);
    }

    .select-all-text {
      font-size: 14px;
      font-weight: 500;
      color: #155724;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-left: 20px;
    }

    .permission-item {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.3s;
    }

    .permission-item:hover {
      border-color: #4CAF50;
      background: #f0f8f0;
    }

    .permission-checkbox-label {
      display: flex;
      align-items: flex-start;
      cursor: pointer;
      width: 100%;
    }

    .permission-checkbox-label input[type="checkbox"] {
      margin-right: 12px;
      margin-top: 2px;
      transform: scale(1.2);
    }

    .permission-info {
      flex: 1;
    }

    .permission-info strong {
      display: block;
      color: #333;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .permission-info small {
      color: #666;
      font-size: 12px;
    }

    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
      font-weight: 500;
    }

    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn-primary, .btn-secondary {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      font-size: 16px;
      min-width: 120px;
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background: #45a049;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #4CAF50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-state p {
      color: #666;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .create-container {
        padding: 15px;
      }

      .form-section {
        padding: 20px;
      }

      .form-row {
        grid-template-columns: 1fr;
        gap: 15px;
      }

      .selection-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class UsuarioCreateComponent implements OnInit {
  user = {
    nombre_apellido: '',
    usuario: '',
    password: '',
    nivel: 'USUARIO_ACCESO'
  };

  selectedSalas: number[] = [];
  modulePermissions: ModulePermission[] = [];
  selectedPages: number[] = [];
  expandedPages: number[] = [];
  expandedModules: number[] = [];
  availableSalas: any[] = [];
  availablePages: any[] = [];
  availableModules: any[] = [];
  availablePermissions: any[] = [];
  
  loading = false;
  loadingData = true;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    // Establecer automáticamente el nivel como Usuario de Acceso
    this.user.nivel = 'USUARIO_ACCESO';
    this.loadData();
  }

  private loadData() {
    this.loadingData = true;
    
    Promise.all([
      this.userService.getSalas().toPromise(),
      this.userService.getPages().toPromise(),
      this.userService.getModules().toPromise(),
      this.userService.getPermissions().toPromise()
    ]).then(([salas, pages, modules, permissions]) => {
      this.availableSalas = salas || [];
      this.availablePages = pages || [];
      this.availableModules = modules || [];
      this.availablePermissions = permissions || [];
      this.loadingData = false;
    }).catch(error => {
      
      this.loadingData = false;
    });
  }

  toggleSala(salaId: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedSalas.includes(salaId)) {
        this.selectedSalas.push(salaId);
      }
    } else {
      this.selectedSalas = this.selectedSalas.filter(id => id !== salaId);
    }
  }

  togglePageExpansion(pageId: number) {
    if (this.expandedPages.includes(pageId)) {
      this.expandedPages = this.expandedPages.filter(id => id !== pageId);
      // Colapsar también todos los módulos de esta página
      const pageModules = this.getPageModules(pageId);
      pageModules.forEach(module => {
        this.expandedModules = this.expandedModules.filter(id => id !== module.id);
      });
    } else {
      this.expandedPages.push(pageId);
    }
  }

  toggleModuleExpansion(moduleId: number) {
    if (this.expandedModules.includes(moduleId)) {
      this.expandedModules = this.expandedModules.filter(id => id !== moduleId);
    } else {
      this.expandedModules.push(moduleId);
    }
  }

  toggleModule(moduleId: number, event: any) {
    
    if (event.target.checked) {
      // Agregar módulo con permiso "VER" por defecto
      if (!this.modulePermissions.find(mp => mp.moduleId === moduleId)) {
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        const defaultPermissionId = verPermission ? verPermission.id : 6;
        
        this.modulePermissions.push({ 
          moduleId, 
          permissions: [defaultPermissionId]
        });
      } else {
        // Si el módulo ya existe, agregar VER si no está presente
        const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (modulePermission && verPermission && !modulePermission.permissions.includes(verPermission.id)) {
          modulePermission.permissions.push(verPermission.id);
        }
      }
    } else {
      // Desmarcar VER: eliminar TODOS los permisos del módulo
      this.modulePermissions = this.modulePermissions.filter(mp => mp.moduleId !== moduleId);
    }
    
  }

  toggleModulePermission(moduleId: number, permissionId: number, event: any) {
    
    let modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    
    if (!modulePermission) {
      
      // Crear modulePermission si no existe
      modulePermission = {
        moduleId: moduleId,
        permissions: []
      };
      this.modulePermissions.push(modulePermission);
    }
    
    this.processPermissionToggle(modulePermission, permissionId, event.target.checked);
  }

  private processPermissionToggle(modulePermission: any, permissionId: number, isChecked: boolean) {
    
    if (isChecked) {
      if (!modulePermission.permissions.includes(permissionId)) {
        modulePermission.permissions.push(permissionId);
        
        // Agregar permiso VER automáticamente si no existe
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (verPermission && !modulePermission.permissions.includes(verPermission.id)) {
          modulePermission.permissions.push(verPermission.id);
        }
      }
    } else {
      modulePermission.permissions = modulePermission.permissions.filter((id: number) => id !== permissionId);
      
      // Si no quedan permisos visibles, remover también VER
      const visiblePermissions = this.getVisiblePermissions();
      const hasVisiblePermissions = visiblePermissions.some(p => 
        modulePermission.permissions.includes(p.id)
      );
      
      if (!hasVisiblePermissions) {
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (verPermission) {
          modulePermission.permissions = modulePermission.permissions.filter((id: number) => id !== verPermission.id);
        }
      }
    }
    
  }

  isModuleSelected(moduleId: number): boolean {
    return this.modulePermissions.some(mp => mp.moduleId === moduleId);
  }

  hasModulePermission(moduleId: number, permissionId: number): boolean {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    return modulePermission ? modulePermission.permissions.includes(permissionId) : false;
  }

  // Filtrar permisos visibles (ocultar VER)
  getVisiblePermissions(): any[] {
    return this.availablePermissions.filter(permission => permission.nombre !== 'VER');
  }

  createUser() {
    if (this.loading) return;

    if (!this.user.nombre_apellido.trim() || !this.user.usuario.trim() || !this.user.password.trim()) {
      
      return;
    }

    this.loading = true;

    // Preparar datos: enviar solo los módulos que tienen al menos un permiso
    const modulePermissionsToSend = this.modulePermissions.filter(mp => mp.permissions.length > 0);

    const userData: CreateUserRequest = {
      nombre_apellido: this.user.nombre_apellido,
      usuario: this.user.usuario,
      password: this.user.password,
      nivel: this.user.nivel,
      salas: this.selectedSalas,
      modulePermissions: modulePermissionsToSend
    };

    this.userService.createUser(userData).subscribe({
      next: (response) => {
        
        this.router.navigate(['/super-config/usuarios']);
      },
      error: (error) => {
        
        this.loading = false;
      }
    });
  }

  getPermissionIcon(nombre: string): string {
    const iconMap: { [key: string]: string } = {
      'AGREGAR': '➕',
      'VER': '👁️',
      'ACTUALIZAR': '✏️',
      'BORRAR': '🗑️'
    };
    return iconMap[nombre] || '🔐';
  }

  getPageIcon(icono: string): string {
    const iconMap: { [key: string]: string } = {
      'file': '📄',
      'users': '👥',
      'gamepad2': '🎮',
      'building': '🏢',
      'settings': '⚙️'
    };
    return iconMap[icono] || '📄';
  }

  getPageName(pageId: number): string {
    const page = this.availablePages.find(p => p.id === pageId);
    return page ? page.nombre : 'Página desconocida';
  }

  getModuleIcon(icono: string): string {
    const iconMap: { [key: string]: string } = {
      'users': '👥',
      'gamepad2': '🎮',
      'building': '🏢',
      'settings': '⚙️'
    };
    return iconMap[icono] || '📦';
  }

  isPageExpanded(pageId: number): boolean {
    return this.expandedPages.includes(pageId);
  }

  isModuleExpanded(moduleId: number): boolean {
    return this.expandedModules.includes(moduleId);
  }

  getPageModules(pageId: number): any[] {
    return this.availableModules.filter(module => module.page_id === pageId);
  }

  getModulesCount(pageId: number): number {
    return this.getPageModules(pageId).length;
  }

  areAllPermissionsSelected(moduleId: number): boolean {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    if (!modulePermission) return false;
    const visiblePermissions = this.getVisiblePermissions();
    return modulePermission.permissions.length === visiblePermissions.length;
  }

  toggleAllPermissions(moduleId: number, event: any) {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    const visiblePermissions = this.getVisiblePermissions();
    const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
    
    if (event.target.checked) {
      // Seleccionar solo los permisos visibles (NO incluir VER)
      const visiblePermissionIds = visiblePermissions.map(p => p.id);
      
      if (modulePermission) {
        // Mantener VER si ya existe, agregar solo permisos visibles
        const existingVer = modulePermission.permissions.includes(verPermission?.id || 0);
        modulePermission.permissions = [...visiblePermissionIds];
        if (existingVer && verPermission) {
          modulePermission.permissions.push(verPermission.id);
        }
      } else {
        // Crear nuevo modulePermission solo con permisos visibles
        this.modulePermissions.push({
          moduleId,
          permissions: visiblePermissionIds
        });
      }
    } else {
      // Deseleccionar solo permisos visibles, mantener VER si existe
      if (modulePermission) {
        const existingVer = modulePermission.permissions.includes(verPermission?.id || 0);
        modulePermission.permissions = existingVer && verPermission ? [verPermission.id] : [];
      }
    }
  }

  goBack() {
    this.router.navigate(['/super-config/usuarios']);
  }
}
