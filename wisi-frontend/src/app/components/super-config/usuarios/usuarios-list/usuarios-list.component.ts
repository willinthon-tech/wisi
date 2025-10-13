import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService, User } from '../../../../services/user.service';
import { ErrorModalService } from '../../../../services/error-modal.service';
import { ConfirmModalService } from '../../../../services/confirm-modal.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="usuarios-container">
      <div class="header-section">
        <button class="btn-primary" (click)="navigateToCreate()">
          Agregar
        </button>
      </div>

      <div class="list-section" *ngIf="!loading">
        <div class="usuarios-grid" *ngIf="usuarios.length > 0">
          <div class="usuario-card" [class.super-usuario]="usuario.nivel === 'TODO'" *ngFor="let usuario of usuarios">
            <div class="usuario-info">
              <h3>{{ usuario.nombre_apellido }}</h3>
              <p class="usuario-details">
                <strong>Usuario:</strong> {{ usuario.usuario }}<br>
                <strong>Contraseña:</strong> {{ usuario.password_plain || 'No disponible' }}
              </p>
              
              <div class="asignaciones">
                <div class="salas-assigned" *ngIf="usuario.Salas && usuario.Salas.length > 0">
                  <strong>Salas asignadas:</strong>
                  <div class="tags-container">
                    <span class="sala-tag" *ngFor="let sala of usuario.Salas">{{ sala.nombre }}</span>
                  </div>
                </div>
                <div class="no-salas" *ngIf="!usuario.Salas || usuario.Salas.length === 0">
                  <span class="no-assignments">Sin salas asignadas</span>
                </div>

                <div class="accesos-section" *ngIf="getUserAccesses(usuario).length > 0">
                  <strong>Accesos:</strong>
                  <div class="accesos-container">
                    <div class="page-group" *ngFor="let pageGroup of getUserAccesses(usuario)">
                      <div class="page-name">📄 {{ pageGroup.pageName }}</div>
                      <div class="modules-list">
                        <div class="module-item" *ngFor="let module of pageGroup.modules">
                          <div class="module-name">→ {{ module.moduleName }}</div>
                          <div class="permissions-list">
                            <span class="permission-tag" 
                                  [class.ver-permission]="permission.name === 'VER'"
                                  *ngFor="let permission of module.permissions">
                              {{ permission.name }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="no-accesos" *ngIf="getUserAccesses(usuario).length === 0">
                  <span class="no-assignments">Sin accesos asignados</span>
                </div>
              </div>
            </div>
            
            <div class="usuario-actions">
              <button class="btn-edit" (click)="navigateToEdit(usuario.id)">
                Editar
              </button>
              <button class="btn-delete" (click)="deleteUser(usuario)" *ngIf="usuario.nivel !== 'TODO'">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="usuarios.length === 0">
          <h3>No hay usuarios registrados</h3>
          <p>Comienza creando tu primer usuario</p>
          <button class="btn-primary" (click)="navigateToCreate()">
            Agregar
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando usuarios...</p>
      </div>
    </div>
  `,
  styles: [`
    .usuarios-container {
      padding: 20px;
      max-height: 560px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Scroll invisible para usuarios */
    .usuarios-container::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }

    .usuarios-container::-moz-scrollbar {
      width: 0px;
      background: transparent;
    }

    .usuarios-container {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }

    .header-section h2 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      font-size: 14px;
    }

    .btn-primary:hover {
      background: #45a049;
      transform: translateY(-2px);
    }


    .usuarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      padding-bottom: 20px;
    }

    .usuario-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .usuario-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .usuario-card.super-usuario {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
      border: 2px solid #f8bbd9;
      box-shadow: 0 4px 6px rgba(244, 67, 54, 0.1);
    }

    .usuario-card.super-usuario:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(244, 67, 54, 0.2);
      border-color: #e91e63;
    }

    .usuario-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .usuario-details {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.6;
    }

    .asignaciones {
      margin: 15px 0;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .salas-assigned strong {
      display: block;
      margin-bottom: 8px;
      color: #333;
    }

    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .sala-tag {
      background: #4CAF50;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .no-assignments {
      color: #dc3545;
      font-style: italic;
      font-size: 14px;
    }

    .accesos-section {
      margin-top: 15px;
    }

    .accesos-section strong {
      display: block;
      margin-bottom: 10px;
      color: #333;
      font-size: 14px;
    }

    .accesos-container {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 12px;
      border: 1px solid #e9ecef;
    }

    .page-group {
      margin-bottom: 12px;
    }

    .page-group:last-child {
      margin-bottom: 0;
    }

    .page-name {
      font-weight: bold;
      color: #495057;
      font-size: 13px;
      margin-bottom: 6px;
      padding-left: 8px;
      border-left: 3px solid #007bff;
    }

    .modules-list {
      margin-left: 15px;
    }

    .module-item {
      margin-bottom: 8px;
    }

    .module-item:last-child {
      margin-bottom: 0;
    }

    .module-name {
      font-weight: 500;
      color: #6c757d;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .permissions-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-left: 15px;
    }

    .permission-tag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
      font-weight: 500;
      border: 1px solid #bbdefb;
    }

    .permission-tag.ver-permission {
      background: #e8f5e8;
      color: #2e7d32;
      border: 1px solid #a5d6a7;
      font-weight: 600;
    }

    .usuario-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 10px;
    }

    .usuario-status.active {
      background: #d4edda;
      color: #155724;
    }

    .usuario-status.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .usuario-actions {
      display: flex;
      gap: 10px;
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    }

    .btn-edit, .btn-delete {
      flex: 1;
      padding: 10px 15px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      font-size: 13px;
    }

    .btn-edit {
      background: #ffc107;
      color: #333;
    }

    .btn-edit:hover {
      background: #e0a800;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
    }

    .empty-state p {
      margin: 0 0 30px 0;
      color: #666;
      font-size: 16px;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
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
      .usuarios-grid {
        grid-template-columns: 1fr;
      }
      
      .header-section {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }
    }
  `]
})
export class UsuariosListComponent implements OnInit {
  usuarios: User[] = [];
  pages: any[] = [];
  modules: any[] = [];
  permissions: any[] = [];
  loading = true;

  constructor(
    private userService: UserService,
    private router: Router,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    
    // Cargar usuarios, páginas, módulos y permisos en paralelo
    this.userService.getUsers().subscribe({
      next: (usuarios) => {
        // Filtrar al creador (nivel 'TODO') de la lista
        this.usuarios = (usuarios || []).filter(usuario => usuario.nivel !== 'TODO');
        this.checkLoadingComplete();
      },
      error: (error) => {
        alert('Error cargando usuarios: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });

    this.userService.getPages().subscribe({
      next: (pages) => {
        this.pages = pages || [];
        this.checkLoadingComplete();
      },
      error: (error) => {
        this.pages = [];
        this.checkLoadingComplete();
      }
    });

    this.userService.getModules().subscribe({
      next: (modules) => {
        this.modules = modules || [];
        this.checkLoadingComplete();
      },
      error: (error) => {
        this.modules = [];
        this.checkLoadingComplete();
      }
    });

    this.userService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions || [];
        this.checkLoadingComplete();
      },
      error: (error) => {
        this.permissions = [];
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete() {
    // Solo marcar como cargado cuando todos los servicios hayan respondido
    if (this.usuarios.length >= 0 && this.pages.length >= 0 && 
        this.modules.length >= 0 && this.permissions.length >= 0) {
      this.loading = false;
    }
  }

  navigateToCreate() {
    this.router.navigate(['/super-config/usuarios/crear']);
  }

  navigateToEdit(usuarioId: number) {
    this.router.navigate(['/super-config/usuarios/editar', usuarioId]);
  }

  deleteUser(usuario: User) {
    if (usuario.nivel === 'TODO') {
      alert('No se puede eliminar al usuario creador');
      return;
    }

    console.log('Mostrando modal de confirmación para usuario:', usuario.id);

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este usuario?',
      entity: {
        id: usuario.id,
        nombre: usuario.nombre_apellido || 'Usuario',
        tipo: 'Usuario'
      },
      warningText: 'Esta acción eliminará permanentemente el usuario y todos sus datos asociados.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionUsuario(usuario);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionUsuario(usuario: User) {
    console.log('Ejecutando eliminación de usuario:', usuario.id);
    
    this.userService.deleteUser(usuario.id).subscribe({
      next: (response) => {
        console.log('Usuario eliminado correctamente:', response);
        alert('Usuario eliminado exitosamente');
        this.loadData(); // Recargar la lista
      },
      error: (error) => {
        console.error('Error eliminando usuario:', error);
        
        // Si es error 400 con relaciones, mostrar modal global
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el usuario',
            message: error.error.message,
            entity: {
              id: error.error.user?.id || usuario.id,
              nombre: error.error.user?.nombre || usuario.nombre_apellido || 'Usuario',
              tipo: 'Usuario'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este usuario, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          alert('Error eliminando usuario: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      }
    });
  }

  getLevelText(level: string): string {
    switch (level) {
      case 'TODO': return 'Creador';
      case 'ADMINISTRADOR': return 'Administrador';
      case 'USUARIO_ACCESO': return 'Usuario de Acceso';
      default: return 'Usuario';
    }
  }

  getPageName(pageId: number): string {
    const page = this.pages.find(p => p.id === pageId);
    return page ? page.nombre : 'Página desconocida';
  }

  getModuleName(moduleId: number): string {
    const module = this.modules.find(m => m.id === moduleId);
    return module ? module.nombre : 'Módulo desconocido';
  }

  getPermissionName(permissionId: number): string {
    const permission = this.permissions.find(p => p.id === permissionId);
    return permission ? permission.nombre : 'Permiso desconocido';
  }

  getUserAccesses(usuario: User): any[] {
    if (!usuario.UserModulePermissions || usuario.UserModulePermissions.length === 0) {
      return [];
    }

    // Agrupar por página
    const pageGroups: { [key: number]: any } = {};
    
    usuario.UserModulePermissions.forEach((ump: any) => {
      if (ump.Module) {
        const pageId = ump.Module.page_id;
        if (!pageGroups[pageId]) {
          pageGroups[pageId] = {
            pageId: pageId,
            pageName: this.getPageName(pageId),
            modules: []
          };
        }
        
        // Buscar si ya existe el módulo en esta página
        let moduleGroup = pageGroups[pageId].modules.find((m: any) => m.moduleId === ump.module_id);
        if (!moduleGroup) {
          moduleGroup = {
            moduleId: ump.module_id,
            moduleName: ump.Module.nombre,
            permissions: []
          };
          pageGroups[pageId].modules.push(moduleGroup);
        }
        
        // Agregar el permiso
        if (ump.Permission) {
          moduleGroup.permissions.push({
            id: ump.permission_id,
            name: ump.Permission.nombre
          });
        }
      }
    });

    // Ordenar permisos para que VER aparezca primero
    Object.values(pageGroups).forEach((pageGroup: any) => {
      pageGroup.modules.forEach((module: any) => {
        module.permissions.sort((a: any, b: any) => {
          if (a.name === 'VER') return -1;
          if (b.name === 'VER') return 1;
          return a.name.localeCompare(b.name);
        });
      });
    });

    return Object.values(pageGroups);
  }
}
