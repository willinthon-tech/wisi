import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-sala-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="edit-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          Volver a Salas
        </button>
        <h2>Editar Sala</h2>
      </div>

      <div class="form-section" *ngIf="!loading">
        <form (ngSubmit)="updateSala()" #salaForm="ngForm">
          <div class="form-group">
            <label for="nombre">Nombre de la Sala *</label>
            <input 
              type="text" 
              id="nombre"
              [(ngModel)]="sala.nombre" 
              name="nombre"
              class="form-input"
              placeholder="Ingresa el nombre de la sala"
              required
              #nombreInput="ngModel">
            <div class="error-message" *ngIf="nombreInput.invalid && nombreInput.touched">
              El nombre de la sala es requerido
            </div>
          </div>

          <div class="form-group">
            <label for="nombre_comercial">Nombre Comercial</label>
            <input 
              type="text" 
              id="nombre_comercial"
              [(ngModel)]="sala.nombre_comercial" 
              name="nombre_comercial"
              class="form-input"
              placeholder="Ingresa el nombre comercial (opcional)">
          </div>

          <div class="form-group">
            <label for="rif">RIF</label>
            <input 
              type="text" 
              id="rif"
              [(ngModel)]="sala.rif" 
              name="rif"
              class="form-input"
              placeholder="Ingresa el RIF (opcional)">
          </div>

          <div class="form-group">
            <label for="ubicacion">Ubicación</label>
            <textarea 
              id="ubicacion"
              [(ngModel)]="sala.ubicacion" 
              name="ubicacion"
              class="form-textarea"
              placeholder="Ingresa la ubicación física (opcional)"></textarea>
          </div>

          <div class="form-group">
            <label for="correo">Correo Electrónico</label>
            <input 
              type="email" 
              id="correo"
              [(ngModel)]="sala.correo" 
              name="correo"
              class="form-input"
              placeholder="Ingresa el correo electrónico (opcional)">
          </div>

          <div class="form-group">
            <label for="telefono">Teléfono</label>
            <input 
              type="tel" 
              id="telefono"
              [(ngModel)]="sala.telefono" 
              name="telefono"
              class="form-input"
              placeholder="Ingresa el teléfono (opcional)">
          </div>

          <div class="form-group">
            <label for="logo">Logo</label>
            <input 
              type="file" 
              id="logo"
              (change)="onLogoSelected($event)"
              accept="image/*"
              class="form-input file-input">
            <div class="file-info" *ngIf="logoPreview">
              <p>✅ Imagen seleccionada: {{ logoFileName }}</p>
              <img [src]="logoPreview" alt="Preview" class="logo-preview">
            </div>
            <div class="current-logo" *ngIf="sala.logo && !logoPreview">
              <p>📷 Logo actual:</p>
              <img [src]="sala.logo" alt="Logo actual" class="logo-preview">
            </div>
          </div>



          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="saving || salaForm.invalid">
              {{ saving ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </div>
        </form>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando datos de la sala...</p>
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

    .form-input, .form-textarea {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
      font-family: inherit;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }

    .file-input {
      padding: 8px 12px;
      border: 2px dashed #ddd;
      background: #f9f9f9;
      cursor: pointer;
    }

    .file-input:hover {
      border-color: #4CAF50;
      background: #f0f8f0;
    }

    .file-info, .current-logo {
      margin-top: 10px;
      padding: 10px;
      background: #e8f5e8;
      border-radius: 6px;
      border: 1px solid #4CAF50;
    }

    .file-info p, .current-logo p {
      margin: 0 0 10px 0;
      color: #2e7d32;
      font-weight: 500;
    }

    .logo-preview {
      max-width: 150px;
      max-height: 100px;
      border-radius: 6px;
      border: 2px solid #4CAF50;
      object-fit: cover;
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
      font-weight: normal;
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
      .edit-container {
        padding: 15px;
      }

      .form-section {
        padding: 20px;
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
export class SalaEditComponent implements OnInit {
  sala = {
    id: 0,
    nombre: '',
    nombre_comercial: '',
    rif: '',
    ubicacion: '',
    correo: '',
    telefono: '',
    logo: ''
  };
  loading = true;
  saving = false;
  salaId: number = 0;
  logoPreview: string | null = null;
  logoFileName: string = '';

  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.salaId = +params['id'];
      this.loadSala();
    });
  }

  private loadSala() {
    this.loading = true;
    
    // Como no tenemos un endpoint específico para obtener una sala por ID,
    // cargamos todas las salas y filtramos
    this.userService.getSalas().subscribe({
      next: (salas) => {
        const sala = salas.find(s => s.id === this.salaId);
        if (sala) {
          this.sala = { ...sala };
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

  updateSala() {
    if (this.saving) return;

    if (!this.sala.nombre.trim()) {
      return;
    }

    this.saving = true;

    this.userService.updateSala(this.sala.id, {
      nombre: this.sala.nombre,
      nombre_comercial: this.sala.nombre_comercial?.trim() || null,
      rif: this.sala.rif?.trim() || null,
      ubicacion: this.sala.ubicacion?.trim() || null,
      correo: this.sala.correo?.trim() || null,
      telefono: this.sala.telefono?.trim() || null,
      logo: this.sala.logo?.trim() || null
    }).subscribe({
      next: (response) => {
        this.router.navigate(['/super-config/salas']);
      },
      error: (error) => {
        
        this.saving = false;
      }
    });
  }

  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.logoFileName = file.name;
      
      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
        this.sala.logo = e.target.result; // Guardar el base64
      };
      reader.readAsDataURL(file);
    }
  }

  goBack() {
    this.router.navigate(['/super-config/salas']);
  }
}
