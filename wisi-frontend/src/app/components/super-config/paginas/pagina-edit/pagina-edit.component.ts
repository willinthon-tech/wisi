import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-pagina-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          Volver a Páginas
        </button>
        <h2>Editar Página</h2>
      </div>

      <div class="form-section" *ngIf="!loading && page">
        <form (ngSubmit)="updatePage()" #pageForm="ngForm">
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
              [disabled]="saving || pageForm.invalid">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando datos de la página...</p>
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

    .modules-section {
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .modules-section h3 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }

    .modules-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .module-item {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 15px;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .module-icon {
      font-size: 24px;
      min-width: 30px;
      text-align: center;
    }

    .module-info {
      flex: 1;
    }

    .module-info h4 {
      margin: 0 0 5px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .module-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .module-status {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
    }

    .module-status.active {
      background: #d4edda;
      color: #155724;
    }

    .module-status.inactive {
      background: #f8d7da;
      color: #721c24;
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

    .preview-status.inactive {
      background: #f8d7da;
      color: #721c24;
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

      .page-preview {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class PaginaEditComponent implements OnInit {
  page: any = null;
  loading = true;
  saving = false;
  pageId: number = 0;

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.pageId = +params['id'];
      this.loadPage();
    });
  }

  private loadPage() {
    this.loading = true;
    
    this.userService.getAllPages().subscribe({
      next: (pages) => {
        const page = pages.find(p => p.id === this.pageId);
        if (page) {
          this.page = { ...page };
          this.loading = false;
        } else {
          
          this.goBack();
        }
      },
      error: (error) => {
        
        this.goBack();
      }
    });
  }

  updatePage() {
    if (this.saving || !this.page) return;

    if (!this.page.nombre.trim()) {
      
      return;
    }

    this.saving = true;

    const pageData = {
      nombre: this.page.nombre.trim(),
      icono: 'file',
      orden: 0};

    this.userService.updatePage(this.page.id, pageData).subscribe({
      next: (response) => {
        
        this.router.navigate(['/super-config/paginas']);
      },
      error: (error) => {
        
        this.saving = false;
      }
    });
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
    this.router.navigate(['/super-config/paginas']);
  }
}