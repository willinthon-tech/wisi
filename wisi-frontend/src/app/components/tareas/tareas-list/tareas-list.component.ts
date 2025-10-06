import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tareas-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tareas-container">
      <div class="header">
        <button class="btn btn-secondary" (click)="goBack()">
          ← Volver
        </button>
        <h2>Gestión de Tareas</h2>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre Empleado</th>
              <th>Cédula</th>
              <th>Cargo</th>
              <th>Sala</th>
              <th>Área</th>
              <th>Departamento</th>
              <th>IP Dispositivo</th>
              <th>Acción</th>
              <th>Marcaje Inicio</th>
              <th>Marcaje Fin</th>
              <th>Fecha Creación</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tarea of tareas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img 
                  *ngIf="tarea.foto_empleado" 
                  [src]="'data:image/jpeg;base64,' + tarea.foto_empleado" 
                  alt="Foto del empleado"
                  class="employee-photo"
                />
                <span *ngIf="!tarea.foto_empleado" class="no-photo">Sin foto</span>
              </td>
              <td>{{ tarea.nombre_empleado }}</td>
              <td>{{ tarea.numero_cedula_empleado }}</td>
              <td>{{ tarea.nombre_cargo }}</td>
              <td>{{ tarea.nombre_sala }}</td>
              <td>{{ tarea.nombre_area }}</td>
              <td>{{ tarea.nombre_departamento }}</td>
              <td>{{ tarea.ip_publica_dispositivo }}</td>
              <td>{{ tarea.accion_realizar }}</td>
              <td>{{ tarea.marcaje_empleado_inicio_dispositivo }}</td>
              <td>{{ tarea.marcaje_empleado_fin_dispositivo }}</td>
              <td>{{ formatDate(tarea.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        
        <div *ngIf="tareas.length === 0" class="no-data">
          <p>No hay tareas registradas</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tareas-container {
      padding: 20px;
      max-width: 100%;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }

    .header h2 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .table-wrapper {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      overflow-x: auto;
    }

    .table {
      width: 100%;
      margin-bottom: 0;
    }

    .table-dark {
      background-color: #343a40;
      color: white;
    }

    .table-dark th {
      border: none;
      padding: 15px 10px;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
    }

    .table tbody tr {
      transition: all 0.3s;
    }

    .table tbody tr:hover {
      background-color: #f8f9fa;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .table tbody td {
      padding: 12px 10px;
      vertical-align: middle;
      text-align: center;
      border-top: 1px solid #dee2e6;
    }

    .employee-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .no-photo {
      color: #6c757d;
      font-style: italic;
      font-size: 12px;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    .no-data p {
      margin: 0;
      font-size: 18px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .table {
        min-width: 1200px;
      }
    }
  `]
})
export class TareasListComponent implements OnInit {
  tareas: any[] = [];
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadTareas();
      }
    });
  }

  loadTareas(): void {
    this.http.get(`/api/tareas-dispositivo-usuarios/user/${this.userId}`).subscribe({
      next: (response: any) => {
        this.tareas = response.data || response;
        console.log('Tareas cargadas:', this.tareas);
      },
      error: (error) => {
        console.error('Error cargando tareas:', error);
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/super-config/empleados']);
  }
}
