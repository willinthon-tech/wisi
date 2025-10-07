import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-permiso-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          ← Volver a Permisos
        </button>
        <h2>Editar Permiso</h2>
      </div>

      <div class="form-section" *ngIf="!loading && permission">
        <form (ngSubmit)="updatePermission()" #permisoForm="ngForm">
          <div class="form-group">
            <label for="nombre">Nombre del Permiso *</label>
            <input 
              type="text" 
              id="nombre"
              [(ngModel)]="permission.nombre" 
              name="nombre"
              class="form-input"
              placeholder="Ej: CREATE, READ, UPDATE, DELETE"
              required
              #nombreInput="ngModel">
            <small class="help-text">
              Usa nombres descriptivos como CREATE, READ, UPDATE, DELETE, MANAGE_USERS, etc.
            </small>
            <div class="error-message" *ngIf="nombreInput.invalid && nombreInput.touched">
              El nombre del permiso es requerido
            </div>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                 
                >
              <span class="checkmark"></span>
              Permiso
            </label>
            <small class="help-text">
              
            </small>
          </div>


          <div class="current-info">
            <h3>Información Actual</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>Creado:</strong> {{ formatDate(permission.created_at) }}
              </div>
              <div class="info-item">
                <strong>Actualizado:</strong> {{ formatDate(permission.updated_at) }}
              </div>
            </div>
          </div>


          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="saving || permisoForm.invalid">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando datos del permiso...</p>
      </div>
    </div>
  `,
  styles: [`
    .edit-container {
      padding: 20px;
      max-width: 800px;
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

    .form-group {
      margin-bottom: 25px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #333;
      font-size: 16px;
    }

    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      font-family: inherit;
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .help-text {
      display: block;
      color: #666;
      font-size: 14px;
      margin-top: 5px;
      font-style: italic;
    }

    .error-message {
      color: #dc3545;
      font-size: 14px;
      margin-top: 5px;
      font-weight: 500;
    }

    .current-info {
      margin: 30px 0;
      padding: 20px;
      background: #e8f5e8;
      border-radius: 8px;
      border: 1px solid #c3e6c3;
    }

    .current-info h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .info-item {
      color: #666;
      font-size: 14px;
    }

    .info-item strong {
      color: #333;
    }

    .preview-section {
      margin: 30px 0;
      padding: 25px;
      background: #f8f9fa;
      border-radius: 10px;
      border: 1px solid #e9ecef;
    }

    .preview-section h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 18px;
    }

    .permission-preview {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .preview-icon {
      font-size: 32px;
      min-width: 40px;
      text-align: center;
    }

    .preview-info {
      flex: 1;
    }

    .preview-info h4 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
      font-weight: bold;
    }

    .preview-info p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.5;
    }

    .preview-tag, .preview-global-tag {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .preview-tag {
      background: #e3f2fd;
      color: #1976d2;
    }

    .preview-global-tag {
      background: #f3e5f5;
      color: #7b1fa2;
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

      .info-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }

      .permission-preview {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class PermisoEditComponent implements OnInit {
  permission: any = null;
  
  loading = true;
  saving = false;
  permisoId: number = 0;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.permisoId = +params['id'];
      this.loadPermission();
    });
  }

  private loadPermission() {
    this.loading = true;
    
    this.userService.getPermissions().subscribe({
      next: (permissions) => {
        const permission = permissions?.find(p => p.id === this.permisoId);
        if (permission) {
          this.permission = permission;
          this.loading = false;
        } else {
          alert('Permiso no encontrado');
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error cargando permiso:', error);
        alert('Error cargando permiso: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.goBack();
      }
    });
  }

  updatePermission() {
    if (this.saving || !this.permission) return;

    if (!this.permission.nombre.trim()) {
      alert('Nombre es requerido');
      return;
    }

    this.saving = true;

    const permissionData = {
      nombre: this.permission.nombre.trim()
    };

    this.userService.updatePermission(this.permission.id, permissionData).subscribe({
      next: (response) => {
        alert('Permiso actualizado exitosamente');
        this.router.navigate(['/super-config/permisos']);
      },
      error: (error) => {
        console.error('Error actualizando permiso:', error);
        alert('Error actualizando permiso: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  getPermissionIcon(nombre: string): string {
    const iconMap: { [key: string]: string } = {
      'CREATE': '➕',
      'READ': '👁️',
      'UPDATE': '✏️',
      'DELETE': '🗑️',
      'MANAGE_USERS': '👥',
      'MANAGE_SALAS': '🏢',
      'MANAGE_MODULES': '📦'
    };
    return iconMap[nombre] || '🔐';
  }


  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack() {
    this.router.navigate(['/super-config/permisos']);
  }
}
