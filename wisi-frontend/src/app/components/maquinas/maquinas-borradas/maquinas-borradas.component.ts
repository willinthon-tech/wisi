import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaquinasService } from '../../../services/maquinas.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { PermissionsService } from '../../../services/permissions.service';
import { Subscription } from 'rxjs';

interface MaquinaBorrada {
  id: number;
  nombre: string;
  activo: number;
  created_at: string;
  updated_at: string;
  Sala?: {
    id: number;
    nombre: string;
  };
  Rango?: {
    id: number;
    nombre: string;
  };
}

@Component({
  selector: 'app-maquinas-borradas',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="maquinas-borradas-container">
      <div class="header">
        <h2>Máquinas Borradas</h2>
        <p class="subtitle">Lista de máquinas eliminadas del sistema</p>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Rango</th>
              <th>Fecha Eliminación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let maquina of maquinas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ maquina.nombre }}</td>
              <td>{{ maquina.Sala?.nombre || 'Sin asignar' }}</td>
              <td>{{ maquina.Rango?.nombre || 'Sin asignar' }}</td>
              <td>{{ formatDate(maquina.updated_at) }}</td>
              <td>
                <button 
                  class="btn btn-success btn-sm"
                  (click)="activarMaquina(maquina)"
                  [disabled]="!canActivate()"
                  title="Activar máquina"
                >
                  Activar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="maquinas.length === 0" class="no-data">
        <p>No hay máquinas borradas</p>
      </div>
    </div>
  `,
  styles: [`
    .maquinas-borradas-container {
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
export class MaquinasBorradasComponent implements OnInit, OnDestroy {
  maquinas: MaquinaBorrada[] = [];
  loading = false;
  
  private permissionsSubscription?: Subscription;
  private MAQUINAS_MODULE_ID = 2; // ID del módulo de Máquinas

  constructor(
    private maquinasService: MaquinasService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.loadMaquinasBorradas();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadMaquinasBorradas(): void {
    this.loading = true;
    this.maquinasService.getMaquinasBorradas().subscribe({
      next: (maquinas: any[]) => {
        this.maquinas = maquinas as MaquinaBorrada[];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando máquinas borradas:', error);
        this.loading = false;
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las máquinas borradas'
        });
      }
    });
  }

  activarMaquina(maquina: MaquinaBorrada): void {
    this.confirmModalService.showConfirmModal({
      title: 'Activar Máquina',
      message: `¿Está seguro de que desea activar la máquina "${maquina.nombre}"?`,
      entity: {
        id: maquina.id,
        nombre: maquina.nombre,
        tipo: 'Máquina'
      },
      warningText: 'La máquina volverá a estar activa en el sistema.',
      onConfirm: () => {
        this.ejecutarActivacionMaquina(maquina);
      }
    });
  }

  private ejecutarActivacionMaquina(maquina: MaquinaBorrada): void {
    this.maquinasService.activarMaquina(maquina.id).subscribe({
      next: (response) => {
        // Remover la máquina de la lista
        this.maquinas = this.maquinas.filter(m => m.id !== maquina.id);
        
        // Mostrar mensaje de éxito
        console.log('Máquina activada exitosamente');
      },
      error: (error) => {
        console.error('Error activando máquina:', error);
        
        if (error.status === 400 && error.error?.relations) {
          // Mostrar modal de error con relaciones
          this.errorModalService.showErrorModal({
            title: 'No se puede activar la máquina',
            message: 'No se puede activar esta máquina porque tiene las siguientes relaciones:',
            relations: error.error.relations
          });
        } else {
          // Mostrar modal de error genérico
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo activar la máquina'
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
    return this.permissionsService.hasPermission(this.MAQUINAS_MODULE_ID, 'EDITAR');
  }
}
