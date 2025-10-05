import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-paginas-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="paginas-container">

    <div class="header-section">
        <button class="btn-primary" (click)="navigateToCreate()" *ngIf="isCreator">
            Crear Nueva Página
          </button>
      </div>
      <div class="list-section" *ngIf="!loading">
        <div class="paginas-grid" *ngIf="pages.length > 0">
          <div class="page-card" *ngFor="let page of pages">
            <div class="page-content">
              <div class="page-info">
                <h3>{{ page.nombre }}</h3>
                <div class="page-modules" *ngIf="page.Modules && page.Modules.length > 0">
                  <h4>Módulos asignados:</h4>
                  <div class="modules-list">
                    <span class="module-tag" *ngFor="let module of page.Modules">
                      {{ module.nombre }}
                    </span>
                  </div>
                </div>
                <div class="page-modules" *ngIf="!page.Modules || page.Modules.length === 0">
                  <span class="no-modules">Sin módulos asignados</span>
                </div>
              </div>
            </div>
            <div class="page-actions" *ngIf="isCreator">
              <button class="btn-edit" (click)="navigateToEdit(page.id)">
                Editar
              </button>
              <button class="btn-delete" (click)="deletePage(page)">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="pages.length === 0">
          <h3>No hay páginas registradas</h3>
          <p>Comienza creando tu primera página para organizar los módulos</p>
          <button class="btn-primary" (click)="navigateToCreate()" *ngIf="isCreator">
            Crear Primera Página
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando páginas...</p>
      </div>
    </div>
  `,
  styles: [`
    .paginas-container {
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

    .paginas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 20px;
    }

    .page-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .page-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .page-content {
      margin-bottom: 20px;
    }

    .page-icon {
      font-size: 48px;
      text-align: center;
      margin-bottom: 15px;
    }

    .page-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .page-info p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.5;
    }

    .page-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .page-order {
      color: #007bff;
      font-size: 13px;
      font-weight: 500;
      background: #e3f2fd;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .page-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .page-status.active {
      background: #d4edda;
      color: #155724;
    }

    .page-status.inactive {
      background: #f8d7da;
      color: #721c24;
    }

    .page-modules h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 14px;
      font-weight: bold;
    }

    .modules-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .module-tag {
      background: #f8f9fa;
      color: #495057;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid #dee2e6;
    }

    .no-modules {
      color: #6c757d;
      font-style: italic;
      font-size: 14px;
    }

    .page-actions {
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
      .paginas-grid {
        grid-template-columns: 1fr;
      }
      
      .page-actions {
        flex-direction: column;
      }

      .header-actions {
        flex-direction: column;
        gap: 15px;
        align-items: stretch;
      }

      .modules-list {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `]
})
export class PaginasListComponent implements OnInit {
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
    
    this.loadPages();
  }

  private loadPages() {
    this.loading = true;
    // Usar getAllPages para ver todas las páginas (activas e inactivas)
    const pageService = this.isCreator ? this.userService.getAllPages() : this.userService.getPages();
    
    pageService.subscribe({
      next: (pages) => {
        this.pages = pages || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando páginas:', error);
        alert('Error cargando páginas: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  navigateToCreate() {
    this.router.navigate(['/super-config/paginas/crear']);
  }

  navigateToEdit(pageId: number) {
    this.router.navigate(['/super-config/paginas/editar', pageId]);
  }

  deletePage(page: any) {
    if (confirm(`¿Estás seguro de que quieres eliminar la página "${page.nombre}"?`)) {
      this.userService.deletePage(page.id).subscribe({
        next: (response) => {
          alert('Página eliminada exitosamente');
          this.loadPages(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error eliminando página:', error);
          alert('Error eliminando página: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      });
    }
  }

}
