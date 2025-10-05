import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-permisos-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="permisos-container">
        <div class="header-section">
        <button class="btn-primary" (click)="navigateToCreate()" *ngIf="isCreator">
            Crear Nuevo Permiso
          </button>
        </div>
      <div class="list-section" *ngIf="!loading">
        <div class="permisos-grid" *ngIf="permissions.length > 0">
          <div class="permission-card" *ngFor="let permission of permissions">
            <div class="permission-header">
              <div class="permission-info">
                <h3>{{ permission.nombre }}</h3>
              </div>
            </div>
            

            <div class="permission-actions" *ngIf="isCreator">
              <button class="btn-edit" (click)="navigateToEdit(permission.id)">
                Editar
              </button>
              <button class="btn-delete" (click)="deletePermission(permission)">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="permissions.length === 0">
          <h3>No hay permisos registrados</h3>
          <p>Los permisos son configurados automáticamente por el sistema</p>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando permisos...</p>
      </div>
    </div>
  `,
  styles: [`
    .permisos-container {
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

    .permisos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .permission-card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .permission-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .permission-header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 15px;
    }

    .permission-icon {
      font-size: 32px;
      min-width: 40px;
      text-align: center;
    }

    .permission-info {
      flex: 1;
    }

    .permission-info h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
      font-weight: bold;
    }

    .permission-info p {
      margin: 0;
      color: #666;
      line-height: 1.5;
      font-size: 14px;
    }

    .permission-details {
      margin: 15px 0;
    }

    .module-tag, .global-tag {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .module-tag {
      background: #e3f2fd;
      color: #1976d2;
    }

    .global-tag {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .permission-stats {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    }

    .text-muted {
      color: #6c757d;
      font-size: 12px;
    }

    .permission-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #e9ecef;
    }

    .btn-edit, .btn-delete {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      font-size: 12px;
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

    .info-section {
      margin-top: 40px;
    }

    .info-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 25px;
      border: 1px solid #e9ecef;
    }

    .info-card h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 20px;
    }

    .info-card ul {
      margin: 0;
      padding-left: 20px;
    }

    .info-card li {
      margin-bottom: 8px;
      color: #666;
      line-height: 1.5;
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
      margin: 0;
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
      .permisos-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PermisosListComponent implements OnInit {
  permissions: any[] = [];
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
    
    this.loadPermissions();
  }

  private loadPermissions() {
    this.loading = true;
    this.userService.getPermissions().subscribe({
      next: (permissions) => {
        this.permissions = permissions || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando permisos:', error);
        alert('Error cargando permisos: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }


  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  navigateToCreate() {
    this.router.navigate(['/super-config/permisos/crear']);
  }

  navigateToEdit(permisoId: number) {
    this.router.navigate(['/super-config/permisos/editar', permisoId]);
  }

  deletePermission(permission: any) {
    if (confirm(`¿Estás seguro de que quieres eliminar el permiso "${permission.nombre}"?`)) {
      this.userService.deletePermission(permission.id).subscribe({
        next: (response) => {
          alert('Permiso eliminado exitosamente');
          this.loadPermissions(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error eliminando permiso:', error);
          alert('Error eliminando permiso: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      });
    }
  }
}
