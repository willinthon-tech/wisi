import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService, User, ModulePermission } from '../../../../services/user.service';

@Component({
  selector: 'app-usuario-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          ← Volver a Usuarios
        </button>
        <h2>Editar Usuario</h2>
      </div>

      <div class="form-section" *ngIf="!loading && user">
        <form (ngSubmit)="updateUser()" #userForm="ngForm">
          <div class="user-info-section">
            <h3>Información del Usuario</h3>
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
                <label for="password">Nueva Contraseña</label>
                <input 
                  type="password" 
                  id="password"
                  [(ngModel)]="newPassword" 
                  name="password"
                  class="form-input"
                  placeholder="Dejar vacío para mantener la actual">
                <div class="help-text">
                  Deja este campo vacío si no quieres cambiar la contraseña
                </div>
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
              No hay salas disponibles
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
                        <label class="select-all-checkbox" 
                               [class.disabled]="!isModuleSelected(module.id)">
                          <input 
                            type="checkbox" 
                            [disabled]="!isModuleSelected(module.id)"
                            [checked]="areAllPermissionsSelected(module.id)"
                            (change)="toggleAllPermissions(module.id, $event)">
                          <span class="select-all-text">Seleccionar todos</span>
                        </label>
                      </div>
                      <div class="permissions-grid">
                        <div class="permission-item" *ngFor="let permission of getVisiblePermissions()">
                          <label class="permission-checkbox-label" 
                                 [class.disabled]="!isModuleSelected(module.id)">
                            <input 
                              type="checkbox" 
                              [value]="permission.id"
                              [disabled]="!isModuleSelected(module.id)"
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
            
            <div class="empty-message" *ngIf="availableModules.length === 0">
              No hay módulos disponibles
            </div>
          </div>


          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="saving">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando datos del usuario...</p>
      </div>
    </div>
  `,
  styles: [`
    .edit-container {
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

    .user-info-section {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border: 1px solid #e9ecef;
    }

    .user-info-section h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 20px;
    }

    .user-info-section p {
      margin: 8px 0;
      color: #666;
      font-size: 16px;
    }

    .form-row {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
    }

    .form-row .form-group {
      flex: 1;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 500;
      color: #333;
      font-size: 14px;
    }

    .form-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .form-input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    }

    .error-message {
      color: #dc3545;
      font-size: 12px;
      margin-top: 5px;
    }

    .help-text {
      color: #6c757d;
      font-size: 12px;
      margin-top: 5px;
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

    .current-assignments {
      margin: 20px 0;
      padding: 20px;
      background: #e8f5e8;
      border-radius: 8px;
      border: 1px solid #c3e6c3;
    }

    .current-assignments h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }

    .current-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .current-tag {
      background: #4CAF50;
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 13px;
      font-weight: bold;
    }

    .permission-tag {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-right: 6px;
      margin-bottom: 4px;
      display: inline-block;
    }

    .current-module-permissions {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .current-module {
      padding: 15px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .current-module strong {
      display: block;
      color: #333;
      margin-bottom: 8px;
      font-size: 16px;
    }

    .current-permissions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
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
      cursor: pointer;
      padding: 5px;
    }

    .module-info:hover {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 4px;
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

    .permission-checkbox-label.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .permission-checkbox-label input[type="checkbox"] {
      margin-right: 12px;
      margin-top: 2px;
      transform: scale(1.2);
    }

    .select-all-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px 12px;
      border-radius: 6px;
      transition: all 0.3s;
      background: #e3f2fd;
      border: 1px solid #bbdefb;
    }

    .select-all-checkbox:hover:not(.disabled) {
      background: #bbdefb;
      border-color: #90caf9;
    }

    .select-all-checkbox.disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: #f5f5f5;
      border-color: #e0e0e0;
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

    .empty-message {
      text-align: center;
      color: #666;
      font-style: italic;
      padding: 20px;
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
      .edit-container {
        padding: 15px;
      }

      .form-section {
        padding: 20px;
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
export class UsuarioEditComponent implements OnInit {
  user: User | null = null;
  selectedSalas: number[] = [];
  modulePermissions: ModulePermission[] = [];
  selectedPages: number[] = [];
  expandedPages: number[] = [];
  expandedModules: number[] = [];
  availableSalas: any[] = [];
  availablePages: any[] = [];
  availableModules: any[] = [];
  availablePermissions: any[] = [];
  newPassword: string = '';
  
  loading = true;
  saving = false;
  userId: number = 0;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      this.loadData();
    });
  }

  private loadData() {
    this.loading = true;
    
    Promise.all([
      this.userService.getUserById(this.userId).toPromise(),
      this.userService.getSalas().toPromise(),
      this.userService.getPages().toPromise(),
      this.userService.getModules().toPromise(),
      this.userService.getPermissions().toPromise()
    ]).then(([user, salas, pages, modules, permissions]) => {
      this.user = user || null;
      this.availableSalas = salas || [];
      this.availablePages = pages?.filter(p => p.activo) || [];
      this.availableModules = modules?.filter(m => m.activo) || [];
      this.availablePermissions = permissions || [];
      
      // Inicializar selecciones
      if (this.user) {
        this.selectedSalas = this.user.Salas?.map((sala: any) => sala.id) || [];
        
        // Inicializar páginas seleccionadas basadas en los módulos del usuario
        this.selectedPages = [];
        if (this.user.UserModulePermissions) {
          const pageIds = new Set<number>();
          this.user.UserModulePermissions.forEach((ump: any) => {
            if (ump.Module.page_id) {
              pageIds.add(ump.Module.page_id);
            }
          });
          this.selectedPages = Array.from(pageIds);
        }
        
        // Inicializar permisos por módulo desde UserModulePermissions
        this.modulePermissions = [];
        if (this.user.UserModulePermissions) {
          const modulePermissionsMap = new Map<number, number[]>();
          
          // Agrupar permisos por módulo
          this.user.UserModulePermissions.forEach((ump: any) => {
            const moduleId = ump.Module.id;
            const permissionId = ump.Permission.id;
            
            if (!modulePermissionsMap.has(moduleId)) {
              modulePermissionsMap.set(moduleId, []);
            }
            modulePermissionsMap.get(moduleId)!.push(permissionId);
          });
          
          // Convertir a array de ModulePermission
          modulePermissionsMap.forEach((permissions, moduleId) => {
            this.modulePermissions.push({ moduleId, permissions });
          });
        }
      }
      
      this.loading = false;
    }).catch(error => {
      console.error('Error cargando datos:', error);
      alert('Error cargando datos: ' + (error.error?.message || error.message || 'Error desconocido'));
      this.goBack();
    });
  }

  toggleSala(salaId: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedSalas.includes(salaId)) {
        this.selectedSalas.push(salaId);
      }
    } else {
      this.selectedSalas = this.selectedSalas.filter((id: number) => id !== salaId);
    }
  }

  togglePageExpansion(pageId: number) {
    if (this.expandedPages.includes(pageId)) {
      this.expandedPages = this.expandedPages.filter((id: number) => id !== pageId);
      // Colapsar también todos los módulos de esta página
      const pageModules = this.getPageModules(pageId);
      pageModules.forEach(module => {
        this.expandedModules = this.expandedModules.filter((id: number) => id !== module.id);
      });
    } else {
      this.expandedPages.push(pageId);
    }
  }

  toggleModuleExpansion(moduleId: number) {
    if (this.expandedModules.includes(moduleId)) {
      this.expandedModules = this.expandedModules.filter((id: number) => id !== moduleId);
    } else {
      this.expandedModules.push(moduleId);
    }
  }

  toggleModule(moduleId: number, event: any) {
    console.log('🔄 Toggle módulo (VER):', moduleId, 'checked:', event.target.checked);
    console.log('📋 modulePermissions antes:', this.modulePermissions);
    
    if (event.target.checked) {
      // Agregar módulo con permiso "VER" por defecto
      if (!this.modulePermissions.find(mp => mp.moduleId === moduleId)) {
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        const defaultPermissionId = verPermission ? verPermission.id : 6;
        
        this.modulePermissions.push({ 
          moduleId, 
          permissions: [defaultPermissionId]
        });
        console.log('✅ Módulo agregado con permiso VER:', moduleId);
      } else {
        // Si el módulo ya existe, agregar VER si no está presente
        const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (modulePermission && verPermission && !modulePermission.permissions.includes(verPermission.id)) {
          modulePermission.permissions.push(verPermission.id);
          console.log('✅ Permiso VER agregado al módulo existente:', moduleId);
        }
      }
    } else {
      // Desmarcar VER: eliminar TODOS los permisos del módulo
      this.modulePermissions = this.modulePermissions.filter(mp => mp.moduleId !== moduleId);
      console.log('❌ Módulo removido completamente (VER desmarcado):', moduleId);
    }
    
    console.log('📋 modulePermissions después:', this.modulePermissions);
  }

  toggleModulePermission(moduleId: number, permissionId: number, event: any) {
    console.log('🔐 Toggle permiso:', moduleId, permissionId, 'checked:', event.target.checked);
    console.log('📋 modulePermissions antes del toggle:', this.modulePermissions);
    
    // Verificar que el módulo tenga permiso VER primero
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    if (!modulePermission) {
      console.log('❌ No se puede seleccionar permiso: el módulo no tiene VER');
      event.target.checked = false; // Desmarcar el checkbox
      alert('Primero debe seleccionar el módulo (VER) para poder asignar otros permisos');
      return;
    }
    
    // Verificar que tenga el permiso VER
    const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
    if (verPermission && !modulePermission.permissions.includes(verPermission.id)) {
      console.log('❌ No se puede seleccionar permiso: el módulo no tiene VER');
      event.target.checked = false; // Desmarcar el checkbox
      alert('Primero debe seleccionar el módulo (VER) para poder asignar otros permisos');
      return;
    }
    
    this.processPermissionToggle(modulePermission, permissionId, event.target.checked);
  }

  private processPermissionToggle(modulePermission: any, permissionId: number, isChecked: boolean) {
    console.log('🔄 Procesando toggle para modulePermission:', modulePermission);
    
    if (isChecked) {
      if (!modulePermission.permissions.includes(permissionId)) {
        modulePermission.permissions.push(permissionId);
        console.log('✅ Permiso agregado:', permissionId);
        
        // Agregar permiso VER automáticamente si no existe
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (verPermission && !modulePermission.permissions.includes(verPermission.id)) {
          modulePermission.permissions.push(verPermission.id);
          console.log('✅ Permiso VER agregado automáticamente');
        }
      }
    } else {
      modulePermission.permissions = modulePermission.permissions.filter((id: number) => id !== permissionId);
      console.log('❌ Permiso removido:', permissionId);
      
      // Si no quedan permisos visibles, remover también VER
      const visiblePermissions = this.getVisiblePermissions();
      const hasVisiblePermissions = visiblePermissions.some(p => 
        modulePermission.permissions.includes(p.id)
      );
      
      if (!hasVisiblePermissions) {
        const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
        if (verPermission) {
          modulePermission.permissions = modulePermission.permissions.filter((id: number) => id !== verPermission.id);
          console.log('❌ Permiso VER removido (no hay permisos visibles)');
        }
      }
    }
    
    console.log('📋 modulePermissions después del toggle:', this.modulePermissions);
  }

  isModuleSelected(moduleId: number): boolean {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    if (!modulePermission) return false;
    
    // Verificar si tiene el permiso VER (acceso al menú)
    const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
    return verPermission ? modulePermission.permissions.includes(verPermission.id) : false;
  }

  hasModulePermission(moduleId: number, permissionId: number): boolean {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    return modulePermission ? modulePermission.permissions.includes(permissionId) : false;
  }

  updateUser() {
    if (this.saving || !this.user) return;

    this.saving = true;

    console.log('💾 Guardando usuario:', this.user.id);
    console.log('📋 Salas seleccionadas:', this.selectedSalas);
    console.log('📋 Módulos y permisos:', this.modulePermissions);

    // Preparar datos: enviar todos los módulos que tienen al menos un permiso
    const modulePermissionsToSend = this.modulePermissions.filter(mp => mp.permissions.length > 0);

    const assignments = {
      salas: this.selectedSalas,
      modulePermissions: modulePermissionsToSend,
      nombre_apellido: this.user.nombre_apellido,
      usuario: this.user.usuario,
      password: this.newPassword // Incluir la nueva contraseña si se proporcionó
    };

    console.log('📤 Datos a enviar:', assignments);

    this.userService.updateUserAssignments(this.user.id, assignments).subscribe({
      next: (response) => {
        console.log('Usuario actualizado:', response);
        alert('Asignaciones del usuario actualizadas exitosamente');
        this.router.navigate(['/super-config/usuarios']);
      },
      error: (error) => {
        console.error('Error actualizando usuario:', error);
        alert('Error actualizando usuario: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  getCurrentModulePermissions() {
    if (!this.user || !this.user.UserModulePermissions) return [];
    
    const modulePermissionsMap = new Map();
    
    this.user.UserModulePermissions.forEach((ump: any) => {
      const moduleId = ump.Module.id;
      
      if (!modulePermissionsMap.has(moduleId)) {
        modulePermissionsMap.set(moduleId, {
          module: ump.Module,
          permissions: []
        });
      }
      
      modulePermissionsMap.get(moduleId).permissions.push(ump.Permission);
    });
    
    return Array.from(modulePermissionsMap.values());
  }

  getPermissionIcon(nombre: string): string {
    const iconMap: { [key: string]: string } = {
      'AGREGAR': '➕',
      'EDITAR': '✏️',
      'BORRAR': '🗑️',
      'REPORTE': '📊',
      'VER': '👁️' // Icono para el permiso oculto VER
    };
    return iconMap[nombre] || '🔐';
  }

  // Filtrar permisos visibles (ocultar VER)
  getVisiblePermissions(): any[] {
    return this.availablePermissions.filter(permission => permission.nombre !== 'VER');
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
    console.log('🔍 Buscando página con ID:', pageId);
    console.log('📋 Páginas disponibles:', this.availablePages);
    const page = this.availablePages.find(p => p.id === pageId);
    console.log('📄 Página encontrada:', page);
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
    const visiblePermissionIds = visiblePermissions.map(p => p.id);
    
    // Verificar que TODOS los permisos visibles estén seleccionados
    const allVisibleSelected = visiblePermissionIds.every(permissionId => 
      modulePermission.permissions.includes(permissionId)
    );
    
    console.log(`🔍 Verificando "Seleccionar todos" para módulo ${moduleId}:`);
    console.log(`📋 Permisos visibles:`, visiblePermissionIds);
    console.log(`📋 Permisos seleccionados:`, modulePermission.permissions);
    console.log(`✅ Todos visibles seleccionados:`, allVisibleSelected);
    
    return allVisibleSelected;
  }

  toggleAllPermissions(moduleId: number, event: any) {
    const modulePermission = this.modulePermissions.find(mp => mp.moduleId === moduleId);
    const visiblePermissions = this.getVisiblePermissions();
    const verPermission = this.availablePermissions.find(p => p.nombre === 'VER');
    
    // Verificar que el módulo tenga VER primero
    if (!modulePermission || !verPermission || !modulePermission.permissions.includes(verPermission.id)) {
      console.log('❌ No se puede seleccionar todos: el módulo no tiene VER');
      event.target.checked = false;
      alert('Primero debe seleccionar el módulo (VER) para poder usar "Seleccionar todos"');
      return;
    }
    
    if (event.target.checked) {
      // Seleccionar solo los permisos visibles (NO incluir VER)
      const visiblePermissionIds = visiblePermissions.map(p => p.id);
      
      // Mantener VER y agregar permisos visibles
      modulePermission.permissions = [...visiblePermissionIds];
      if (verPermission) {
        modulePermission.permissions.push(verPermission.id);
      }
      console.log('✅ Todos los permisos visibles seleccionados (VER mantenido)');
    } else {
      // Deseleccionar solo permisos visibles, mantener VER
      modulePermission.permissions = verPermission ? [verPermission.id] : [];
      console.log('❌ Solo permisos visibles deseleccionados (VER mantenido)');
    }
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'TODO': return 'Creador';
      case 'ADMINISTRADOR': return 'Administrador';
      case 'USUARIO_ACCESO': return 'Usuario de Acceso';
      default: return 'Usuario';
    }
  }

  goBack() {
    this.router.navigate(['/super-config/usuarios']);
  }

  debugCurrentState(): void {
    console.log('🔍 === DEBUG ESTADO ACTUAL ===');
    console.log('👤 Usuario:', this.user);
    console.log('📋 modulePermissions:', this.modulePermissions);
    console.log('🔐 availablePermissions:', this.availablePermissions);
    console.log('📋 selectedSalas:', this.selectedSalas);
    
    // Verificar cada módulo
    this.availablePages.forEach(page => {
      const modules = this.getPageModules(page.id);
      modules.forEach(module => {
        const modulePermission = this.modulePermissions.find(mp => mp.moduleId === module.id);
        console.log(`📦 Módulo ${module.nombre} (ID: ${module.id}):`, modulePermission);
        
        if (modulePermission) {
          const permissionNames = modulePermission.permissions.map(permId => {
            const perm = this.availablePermissions.find(p => p.id === permId);
            return perm ? perm.nombre : `ID:${permId}`;
          });
          console.log(`  🔐 Permisos asignados:`, permissionNames);
        }
      });
    });
    
    console.log('🔍 === FIN DEBUG ===');
  }
}
