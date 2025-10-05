import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-modulo-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          Volver a Módulos
        </button>
        <h2>Editar Módulo</h2>
      </div>

      <div class="form-section" *ngIf="!loading && module">
        <form (ngSubmit)="updateModule()" #moduleForm="ngForm">
          <div class="form-group">
            <label for="nombre">Nombre del Módulo *</label>
            <input 
              type="text" 
              id="nombre"
              [(ngModel)]="module.nombre" 
              name="nombre"
              class="form-input"
              placeholder="Ej: INVENTARIO, VENTAS, etc."
              required
              #nombreInput="ngModel">
            <div class="error-message" *ngIf="nombreInput.invalid && nombreInput.touched">
              El nombre del módulo es requerido
            </div>
          </div>

          <div class="form-group">
            <label for="page_id">Página Asignada</label>
            <select 
              id="page_id"
              [(ngModel)]="module.page_id" 
              name="page_id"
              class="form-select"
              [disabled]="availablePages.length === 0">
              <option value="">Seleccionar página...</option>
              <option *ngFor="let page of availablePages" [value]="page.id">
                {{ page.nombre }}
              </option>
            </select>
            <small class="help-text" *ngIf="availablePages.length > 0">
              Selecciona la página a la que pertenece este módulo
            </small>
            <small class="help-text" *ngIf="availablePages.length === 0" style="color: #dc3545;">
              Cargando páginas disponibles...
            </small>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                [(ngModel)]="module.activo" 
                name="activo">
              <span class="checkmark"></span>
              Módulo activo
            </label>
            <small class="help-text">
              Los módulos inactivos no aparecerán disponibles para asignar a usuarios
            </small>
          </div>

          <div class="current-info">
            <h3>Información del Módulo</h3>
            <div class="info-grid">
              <div class="info-item">
                <strong>Creado:</strong> {{ formatDate(module.created_at) }}
              </div>
              <div class="info-item">
                <strong>Actualizado:</strong> {{ formatDate(module.updated_at) }}
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
              [disabled]="saving || moduleForm.invalid">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando datos del módulo...</p>
      </div>
    </div>
  `,
  styles: [`
    .edit-container {
      padding: 20px;
      max-width: 900px;
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
      min-height: 100px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 500;
      color: #333;
      font-size: 16px;
    }

    .checkbox-label input[type="checkbox"] {
      margin-right: 10px;
      transform: scale(1.2);
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

    .module-preview {
      display: flex;
      align-items: flex-start;
      gap: 20px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .preview-icon {
      font-size: 48px;
      min-width: 60px;
      text-align: center;
    }

    .preview-info {
      flex: 1;
    }

    .preview-info h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
      font-weight: bold;
    }

    .preview-info p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.5;
    }

    .preview-meta {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .preview-route {
      color: #007bff;
      font-size: 13px;
      font-weight: 500;
    }

    .preview-page {
      color: #28a745;
      font-size: 13px;
      font-weight: 500;
      background: #d4edda;
      padding: 4px 8px;
      border-radius: 12px;
    }

    .preview-status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      align-self: flex-start;
    }

    .preview-status.active {
      background: #d4edda;
      color: #155724;
    }

    .preview-status.inactive {
      background: #f8d7da;
      color: #721c24;
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

      .form-row {
        grid-template-columns: 1fr;
        gap: 15px;
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

      .module-preview {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class ModuloEditComponent implements OnInit {
  module: any = null;
  availablePages: any[] = [];
  loading = true;
  saving = false;
  moduleId: number = 0;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.moduleId = +params['id'];
      this.loadPages();
      this.loadModule();
    });
  }

  private loadPages() {
    this.userService.getAllPages().subscribe({
      next: (pages) => {
        this.availablePages = pages || [];
      },
      error: (error) => {
        console.error('Error cargando páginas:', error);
        alert('Error cargando páginas: ' + (error.error?.message || error.message || 'Error desconocido'));
      }
    });
  }

  private loadModule() {
    this.loading = true;
    
    this.userService.getAllModules().subscribe({
      next: (modules) => {
        const module = modules.find(m => m.id === this.moduleId);
        if (module) {
          this.module = { ...module };
          this.loading = false;
        } else {
          alert('Módulo no encontrado');
          this.goBack();
        }
      },
      error: (error) => {
        console.error('Error cargando módulo:', error);
        alert('Error cargando módulo: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.goBack();
      }
    });
  }

  updateModule() {
    if (this.saving || !this.module) return;

    if (!this.module.nombre.trim()) {
      alert('Nombre es requerido');
      return;
    }

    this.saving = true;

    const moduleData = {
      nombre: this.module.nombre.trim(),
      icono: 'settings',
      ruta: `/${this.module.nombre.toLowerCase().replace(/\s+/g, '-')}`,
      activo: this.module.activo,
      page_id: this.module.page_id || null
    };

    this.userService.updateModule(this.module.id, moduleData).subscribe({
      next: (response) => {
        alert('Módulo actualizado exitosamente');
        this.router.navigate(['/super-config/modulos']);
      },
      error: (error) => {
        console.error('Error actualizando módulo:', error);
        alert('Error actualizando módulo: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.saving = false;
      }
    });
  }

  getSelectedPage(): any {
    return this.availablePages.find(page => page.id == this.module.page_id);
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
    this.router.navigate(['/super-config/modulos']);
  }
}
