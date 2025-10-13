import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MesasService } from '../../../services/mesas.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { PermissionsService } from '../../../services/permissions.service';
import { Subscription } from 'rxjs';

interface MesaBorrada {
  id: number;
  nombre: string;
  activo: number;
  created_at: string;
  updated_at: string;
  Sala?: {
    id: number;
    nombre: string;
  };
  Juego?: {
    id: number;
    nombre: string;
  };
}

@Component({
  selector: 'app-mesas-borradas',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mesas-borradas-container">
      <div class="header">
        <h2>Mesas Borradas</h2>
        <p class="subtitle">Lista de mesas eliminadas del sistema</p>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Juego</th>
              <th>Fecha Eliminación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let mesa of mesas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ mesa.nombre }}</td>
              <td>{{ mesa.Sala?.nombre || 'Sin asignar' }}</td>
              <td>{{ mesa.Juego?.nombre || 'Sin asignar' }}</td>
              <td>{{ formatDate(mesa.updated_at) }}</td>
              <td>
                <button 
                  class="btn btn-success btn-sm"
                  (click)="activarMesa(mesa)"
                  [disabled]="!canActivate()"
                  title="Activar mesa"
                >
                  Activar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="mesas.length === 0" class="no-data">
        <p>No hay mesas borradas</p>
      </div>
    </div>
  `,
  styles: [`
    .mesas-borradas-container {
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
export class MesasBorradasComponent implements OnInit, OnDestroy {
  mesas: MesaBorrada[] = [];
  loading = false;
  
  private permissionsSubscription?: Subscription;
  private MESAS_MODULE_ID = 3; // ID del módulo de Mesas

  constructor(
    private mesasService: MesasService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.loadMesasBorradas();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadMesasBorradas(): void {
    this.loading = true;
    this.mesasService.getMesasBorradas().subscribe({
      next: (mesas: any[]) => {
        this.mesas = mesas as MesaBorrada[];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando mesas borradas:', error);
        this.loading = false;
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las mesas borradas'
        });
      }
    });
  }

  activarMesa(mesa: MesaBorrada): void {
    this.confirmModalService.showConfirmModal({
      title: 'Activar Mesa',
      message: `¿Está seguro de que desea activar la mesa "${mesa.nombre}"?`,
      entity: {
        id: mesa.id,
        nombre: mesa.nombre,
        tipo: 'Mesa'
      },
      warningText: 'La mesa volverá a estar activa en el sistema.',
      onConfirm: () => {
        this.ejecutarActivacionMesa(mesa);
      }
    });
  }

  private ejecutarActivacionMesa(mesa: MesaBorrada): void {
    this.mesasService.activarMesa(mesa.id).subscribe({
      next: (response) => {
        // Remover la mesa de la lista
        this.mesas = this.mesas.filter(m => m.id !== mesa.id);
        
        // Mostrar mensaje de éxito
        console.log('Mesa activada exitosamente');
      },
      error: (error) => {
        console.error('Error activando mesa:', error);
        
        if (error.status === 400 && error.error?.relations) {
          // Mostrar modal de error con relaciones
          this.errorModalService.showErrorModal({
            title: 'No se puede activar la mesa',
            message: 'No se puede activar esta mesa porque tiene las siguientes relaciones:',
            relations: error.error.relations
          });
        } else {
          // Mostrar modal de error genérico
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo activar la mesa'
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
    return this.permissionsService.hasPermission(this.MESAS_MODULE_ID, 'EDITAR');
  }
}
