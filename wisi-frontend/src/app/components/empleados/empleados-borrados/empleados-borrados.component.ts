import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionsService } from '../../../services/permissions.service';
import { Subscription } from 'rxjs';

interface EmpleadoBorrado {
  id: number;
  foto: string;
  nombre: string;
  cedula: string;
  fecha_ingreso: string;
  fecha_cumpleanos: string;
  sexo: string;
  activo: number;
  created_at: string;
  updated_at: string;
  Cargo?: {
    id: number;
    nombre: string;
    Departamento?: {
      id: number;
      nombre: string;
      Area?: {
        id: number;
        nombre: string;
        Sala?: {
          id: number;
          nombre: string;
        }
      }
    }
  };
  dispositivos?: any[];
}

@Component({
  selector: 'app-empleados-borrados',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="empleados-borrados-container">
      <div class="header">
        <h2>Empleados Borrados</h2>
        <p class="subtitle">Lista de empleados eliminados del sistema</p>
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
              <th>Fecha Eliminación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img 
                  *ngIf="empleado.foto" 
                  [src]="'data:image/jpeg;base64,' + empleado.foto" 
                  alt="Foto del empleado"
                  class="employee-photo"
                />
                <span *ngIf="!empleado.foto" class="no-photo">Sin foto</span>
              </td>
              <td>{{ empleado.nombre }}</td>
              <td>{{ empleado.cedula }}</td>
              <td>{{ empleado.Cargo?.nombre || 'Sin asignar' }}</td>
              <td>{{ formatDate(empleado.updated_at) }}</td>
              <td>
                <button 
                  class="btn btn-success btn-sm"
                  (click)="activarEmpleado(empleado)"
                  [disabled]="!canActivate()"
                  title="Activar empleado"
                >
                  Activar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="empleados.length === 0" class="no-data">
        <p>No hay empleados borrados</p>
      </div>
    </div>
  `,
  styles: [`
    .empleados-borrados-container {
      padding: 20px;
      background-color: #f8f9fa;
      min-height: 100vh;
    }

    .header {
      margin-bottom: 30px;
    }

    .header h2 {
      color: #333;
      margin-bottom: 5px;
    }

    .subtitle {
      color: #666;
      margin: 0;
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
    }

    .table-wrapper::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .table {
      margin: 0;
      border: none;
      width: 100%;
      background: white;
    }

    .table th {
      background-color: #343a40;
      color: white;
      border: none;
      padding: 15px 12px;
      font-weight: 600;
      text-align: left;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .table td {
      padding: 12px;
      vertical-align: middle;
      border-top: 1px solid #dee2e6;
      font-size: 14px;
    }

    .table tbody tr:hover {
      background-color: #f8f9fa;
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

    .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
    }

    .btn-success {
      background-color: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background-color: #218838;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .no-data {
      padding: 40px;
      text-align: center;
      color: #666;
    }

    .no-data p {
      margin: 0;
      font-size: 16px;
    }

    @media (max-width: 768px) {
      .table-wrapper {
        overflow-x: auto;
      }
      
      .table {
        min-width: 600px;
      }
    }
  `]
})
export class EmpleadosBorradosComponent implements OnInit, OnDestroy {
  empleados: EmpleadoBorrado[] = [];
  loading = false;
  
  private permissionsSubscription?: Subscription;
  private EMPLEADOS_MODULE_ID = 1; // ID del módulo de empleados

  constructor(
    private empleadosService: EmpleadosService,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.loadEmpleadosBorrados();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadEmpleadosBorrados(): void {
    this.loading = true;
    this.empleadosService.getEmpleadosBorrados().subscribe({
      next: (empleados: any[]) => {
        this.empleados = empleados as EmpleadoBorrado[];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando empleados borrados:', error);
        this.loading = false;
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar los empleados borrados'
        });
      }
    });
  }

  activarEmpleado(empleado: EmpleadoBorrado): void {
    this.confirmModalService.showConfirmModal({
      title: 'Activar Empleado',
      message: `¿Está seguro de que desea activar al empleado "${empleado.nombre}"?`,
      entity: {
        id: empleado.id,
        nombre: empleado.nombre,
        tipo: 'Empleado'
      },
      warningText: 'El empleado volverá a estar activo en el sistema.',
      onConfirm: () => {
        this.ejecutarActivacionEmpleado(empleado);
      }
    });
  }

  private ejecutarActivacionEmpleado(empleado: EmpleadoBorrado): void {
    this.empleadosService.activarEmpleado(empleado.id).subscribe({
      next: (response) => {
        // Remover el empleado de la lista
        this.empleados = this.empleados.filter(e => e.id !== empleado.id);
        
        // Mostrar mensaje de éxito
        console.log('Empleado activado exitosamente');
      },
      error: (error) => {
        console.error('Error activando empleado:', error);
        
        if (error.status === 400 && error.error?.relations) {
          // Mostrar modal de error con relaciones
          this.errorModalService.showErrorModal({
            title: 'No se puede activar el empleado',
            message: 'No se puede activar este empleado porque tiene las siguientes relaciones:',
            relations: error.error.relations
          });
        } else {
          // Mostrar modal de error genérico
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo activar el empleado'
          });
        }
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  canActivate(): boolean {
    return this.permissionsService.hasPermission(this.EMPLEADOS_MODULE_ID, 'EDITAR');
  }
}
