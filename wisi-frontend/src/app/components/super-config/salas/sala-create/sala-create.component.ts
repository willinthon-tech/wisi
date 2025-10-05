import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-sala-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="create-container">
      <div class="header-section">
        <button class="btn-back" (click)="goBack()">
          Volver a Salas
        </button>
        <h2>Crear Nueva Sala</h2>
      </div>

      <div class="form-section">
        <form (ngSubmit)="createSala()" #salaForm="ngForm">
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


          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button 
              type="submit" 
              class="btn-primary" 
              [disabled]="loading || salaForm.invalid">
              {{ loading ? 'Creando...' : 'Crear Sala' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .create-container {
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

    /* Responsive */
    @media (max-width: 768px) {
      .create-container {
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
export class SalaCreateComponent {
  sala = {
    nombre: ''
  };
  loading = false;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  createSala() {
    if (this.loading) return;

    if (!this.sala.nombre.trim()) {
      alert('El nombre de la sala es requerido');
      return;
    }

    this.loading = true;

    const salaData = {
      nombre: this.sala.nombre.trim(),
    };
    
    this.userService.createSala(salaData).subscribe({
      next: (response) => {
        alert('Sala creada exitosamente');
        this.router.navigate(['/super-config/salas']);
      },
      error: (error) => {
        console.error('Error creando sala:', error);
        alert('Error creando sala: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/super-config/salas']);
  }
}
