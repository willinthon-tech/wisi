import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../../../services/user.service';

@Component({
  selector: 'app-salas-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="salas-container">
      <div class="header-section">
        <button class="btn-primary" (click)="navigateToCreate()">
          Crear Nueva Sala
        </button>
      </div>

      <div class="list-section" *ngIf="!loading">
        <div class="salas-grid" *ngIf="salas.length > 0">
          <div class="sala-card" *ngFor="let sala of salas">
            <div class="sala-info">
              <h3>{{ sala.nombre }}</h3>
            </div>
            <div class="sala-actions">
              <button class="btn-edit" (click)="navigateToEdit(sala.id)">
                Editar
              </button>
              <button class="btn-delete" (click)="deleteSala(sala)">
                Eliminar
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="salas.length === 0">
          <h3>No hay salas registradas</h3>
          <p>Comienza creando tu primera sala</p>
          <button class="btn-primary" (click)="navigateToCreate()">
            Crear Primera Sala
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando salas...</p>
      </div>
    </div>
  `,
  styles: [`
    .salas-container {
      padding: 20px;
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

    .salas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
    }

    .sala-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      transition: all 0.3s;
    }

    .sala-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .sala-info h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .sala-info p {
      margin: 0 0 15px 0;
      color: #666;
      line-height: 1.5;
    }


    .sala-actions {
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
  `]
})
export class SalasListComponent implements OnInit {
  salas: any[] = [];
  loading = true;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadSalas();
  }

  private loadSalas() {
    this.loading = true;
    this.userService.getSalas().subscribe({
      next: (salas) => {
        this.salas = salas || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando salas:', error);
        alert('Error cargando salas: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  navigateToCreate() {
    this.router.navigate(['/super-config/salas/crear']);
  }

  navigateToEdit(salaId: number) {
    this.router.navigate(['/super-config/salas/editar', salaId]);
  }

  deleteSala(sala: any) {
    if (confirm(`¿Estás seguro de que quieres eliminar la sala "${sala.nombre}"?`)) {
      this.userService.deleteSala(sala.id).subscribe({
        next: (response) => {
          alert('Sala eliminada exitosamente');
          this.loadSalas(); // Recargar la lista
        },
        error: (error) => {
          console.error('Error eliminando sala:', error);
          alert('Error eliminando sala: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      });
    }
  }
}
