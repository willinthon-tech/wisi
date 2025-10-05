import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-pagina-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="create-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          Volver a Páginas
        </button>
        <h2>Crear Nueva Página</h2>
      </div>

      <div class="form-section">
        <form (ngSubmit)="createPage()" #pageForm="ngForm">
          <div class="form-group">
            <label for="nombre">Nombre de la Página *</label>
            <input 
              type="text" 
              id="nombre"
              [(ngModel)]="page.nombre" 
              name="nombre"
              class="form-input"
              placeholder="Ej: ADMINISTRACIÓN, OPERACIONES, etc."
              required
              #nombreInput="ngModel">
            <div class="error-message" *ngIf="nombreInput.invalid && nombreInput.touched">
              El nombre de la página es requerido
            </div>
          </div>



          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="loading || pageForm.invalid">
              {{ loading ? 'Creando...' : 'Crear Página' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-container {
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

    .modules-selection {
      max-height: 300px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 15px;
      background: #f8f9fa;
    }

    .module-item {
      margin-bottom: 10px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 10px;
      border-radius: 6px;
      transition: background-color 0.3s;
    }

    .checkbox-label:hover {
      background: #e9ecef;
    }

    .checkbox-label input[type="checkbox"] {
      margin-right: 10px;
      transform: scale(1.2);
    }

    .module-info {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
    }

    .module-icon {
      font-size: 20px;
    }

    .module-name {
      font-weight: bold;
      color: #333;
    }

    .module-desc {
      color: #666;
      font-size: 14px;
    }

    .no-modules {
      text-align: center;
      padding: 20px;
      color: #666;
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

    .page-preview {
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
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    .preview-order {
      color: #007bff;
      font-size: 13px;
      font-weight: 500;
      background: #e3f2fd;
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
    }

    .preview-status.active {
      background: #d4edda;
      color: #155724;
    }

    .preview-modules h5 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 14px;
      font-weight: bold;
    }

    .modules-preview {
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

      .form-actions {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }

      .page-preview {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class PaginaCreateComponent implements OnInit {
  page = {
    nombre: ''
  };
  loading = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    // No need to load modules anymore
  }

  createPage() {
    if (this.loading) return;

    if (!this.page.nombre.trim()) {
      alert('Nombre es requerido');
      return;
    }

    this.loading = true;

    const pageData = {
      nombre: this.page.nombre.trim(),
      icono: 'file',
      orden: 0
    };

    this.userService.createPage(pageData).subscribe({
      next: (response) => {
        alert('Página creada exitosamente');
        this.router.navigate(['/super-config/paginas']);
      },
      error: (error) => {
        console.error('Error creando página:', error);
        alert('Error creando página: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }


  goBack() {
    this.router.navigate(['/super-config/paginas']);
  }
}
