import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-modulos-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modulos-container">
        <div class="header-section">
            <button class="btn-primary" (click)="navigateToCreate()" *ngIf="isCreator">
            Crear Nuevo Módulo
          </button>
      </div>

      <div class="list-section" *ngIf="!loading">
        <div class="modulos-grid" *ngIf="modules.length > 0">
          <div class="module-card" *ngFor="let module of modules">
            <div class="module-content">
              <div class="module-info">
                <h3>{{ module.nombre }}</h3>
                <div class="module-page-info">
                  <small class="page-badge">{{ getPageName(module.page_id) }}</small>
                </div>
              </div>
            </div>
            <div class="module-actions" *ngIf="isCreator">
              <button class="btn-edit" (click)="navigateToEdit(module.id)">
                Editar
              </button>
              <button class="btn-delete" (click)="deleteModule(module)">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="modules.length === 0">
          <h3>No hay módulos registrados</h3>
          <p>Comienza creando tu primer módulo personalizado</p>
          <button class="btn-primary" (click)="navigateToCreate()" *ngIf="isCreator">
            Crear Primer Módulo
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando módulos...</p>
      </div>
    </div>
  `,
  styles: [`
    .modulos-container {
      padding: 20px;
    }

    .header-section {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }

    .header-section h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 28px;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
      flex: 1;
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
      white-space: nowrap;
    }

    .btn-primary:hover {
      background: #45a049;
      transform: translateY(-2px);
    }

    .modulos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 20px;
    }

    .module-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .module-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .module-content {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      margin-bottom: 20px;
    }

    .module-icon {
      font-size: 48px;
      min-width: 60px;
      text-align: center;
    }

    .module-info {
      flex: 1;
    }

    .module-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .module-info p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.5;
    }

    .module-page-info {
      margin-top: 8px;
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

    .module-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .module-route {
      color: #007bff;
      font-size: 13px;
      font-weight: 500;
    }

    .module-page {
      color: #28a745;
      font-size: 13px;
      font-weight: 500;
      background: #d4edda;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .module-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      align-self: flex-start;
    }

    .module-status.active {
      background: #d4edda;
      color: #155724;
    }

    .module-status.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .module-actions {
      display: flex;
      gap: 10px;
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

    .btn-deactivate {
      background: #dc3545;
      color: white;
    }

    .btn-deactivate:hover {
      background: #c82333;
    }

    .btn-activate {
      background: #28a745;
      color: white;
    }

    .btn-activate:hover {
      background: #218838;
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
      .modulos-grid {
        grid-template-columns: 1fr;
      }
      
      .module-content {
        flex-direction: column;
        text-align: center;
        gap: 15px;
      }

      .module-actions {
        flex-direction: column;
      }

      .header-actions {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }
    }
  `]
})
export class ModulosListComponent implements OnInit {
  modules: any[] = [];
  pages: any[] = [];
  loading = true;
  isCreator = false;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verificar si es creador
    const currentUser = this.authService.getCurrentUser();
    this.isCreator = currentUser?.nivel === 'TODO';
    
    this.loadData();
  }

  private loadData() {
    this.loading = true;
    
    // Cargar módulos y páginas en paralelo
    const moduleService = this.isCreator ? this.userService.getAllModules() : this.userService.getModules();
    const pageService = this.userService.getPages();
    
    moduleService.subscribe({
      next: (modules) => {
        this.modules = modules || [];
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error cargando módulos:', error);
        alert('Error cargando módulos: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
    
    pageService.subscribe({
      next: (pages) => {
        this.pages = pages || [];
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Error cargando páginas:', error);
        this.pages = [];
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete() {
    // Solo marcar como cargado cuando ambos servicios hayan respondido
    if (this.modules.length >= 0 && this.pages.length >= 0) {
      this.loading = false;
    }
  }

  getPageName(pageId: number): string {
    const page = this.pages.find(p => p.id === pageId);
    return page ? page.nombre : 'Página desconocida';
  }

  navigateToCreate() {
    this.router.navigate(['/super-config/modulos/crear']);
  }

  navigateToEdit(moduleId: number) {
    this.router.navigate(['/super-config/modulos/editar', moduleId]);
  }

  deleteModule(module: any) {
    if (confirm(`¿Estás seguro de que quieres eliminar el módulo "${module.nombre}"?`)) {
      this.userService.deleteModule(module.id).subscribe({
        next: (response) => {
          alert('Módulo eliminado exitosamente');
          this.loadData(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error eliminando módulo:', error);
          alert('Error eliminando módulo: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      });
    }
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
}