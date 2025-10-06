import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-tareas-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tareas-container">
      <div class="header">
        <button class="btn btn-warning" (click)="ejecutarTodas()">
          Ejecutar Todo
        </button>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre</th>
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
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-warning {
      background-color: #ffc107;
      color: #212529;
      border: 1px solid #ffc107;
    }

    .btn-warning:hover {
      background-color: #e0a800;
      border-color: #d39e00;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
      border: 1px solid #6c757d;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
      border-color: #545b62;
      transform: translateY(-1px);
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      border: 1px solid #dee2e6;
      overflow: hidden;
    }

    .table {
      width: 100%;
      margin-bottom: 0;
      border-collapse: collapse;
    }

    .table-dark {
      background-color: #343a40;
      color: white;
    }

    .table-dark th {
      border: none;
      padding: 12px 8px;
      font-weight: 600;
      text-align: center;
      vertical-align: middle;
      font-size: 13px;
    }

    .table tbody tr {
      transition: background-color 0.2s ease;
    }

    .table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .table tbody tr:nth-child(even):hover {
      background-color: #e9ecef;
    }

    .table tbody td {
      padding: 10px 8px;
      vertical-align: middle;
      text-align: center;
      border-top: 1px solid #dee2e6;
      font-size: 13px;
    }

    .employee-photo {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .no-photo {
      color: #6c757d;
      font-style: italic;
      font-size: 11px;
    }

    .no-data {
      text-align: center;
      padding: 30px;
      color: #6c757d;
    }

    .no-data p {
      margin: 0;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }

      .table-wrapper {
        overflow-x: auto;
      }

      .table {
        min-width: 1000px;
      }
    }
  `]
})
export class TareasListComponent implements OnInit {
  tareas: any[] = [];
  userId: number | null = null;

  constructor(
    private route: ActivatedRoute,
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
    this.http.get(`http://localhost:3000/api/tareas-dispositivo-usuarios/user/${this.userId}`).subscribe({
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

  ejecutarTodas(): void {
    console.log('🚀 Ejecutando todas las tareas...');
    // Aquí implementarías la lógica para ejecutar todas las tareas
    alert('Funcionalidad de "Ejecutar Todo" en desarrollo');
  }
}
