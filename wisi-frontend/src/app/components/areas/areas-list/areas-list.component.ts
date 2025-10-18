import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AreasService } from '../../../services/areas.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-areas-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="areas-container">
      <div class="header">
        <button 
          class="btn btn-success" 
          [class.disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="canAdd() ? showSalaSelector() : null">
          Agregar
        </button>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let area of areas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ area.nombre }}</td>
              <td>{{ area.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editArea(area) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteArea(area.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="areas.length === 0" class="no-data">
        <p>No hay áreas registradas</p>
      </div>

      <!-- Modal para crear área -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedArea ? 'Editar Área' : 'Crear Nueva Área' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createArea()" #areaForm="ngForm">
              <div class="form-group">
                <label for="nombreArea">Nombre del Área:</label>
                <input 
                  type="text" 
                  id="nombreArea" 
                  name="nombreArea"
                  [(ngModel)]="nuevaArea.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del área"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedArea">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="salaSelect"
                  [(ngModel)]="nuevaArea.sala_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione una sala</option>
                  <option *ngFor="let sala of userSalas" [value]="sala.id">
                    {{ sala.nombre }}
                  </option>
                </select>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeSalaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!areaForm.form.valid">
                  {{ selectedArea ? 'Actualizar Área' : 'Guardar Área' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userSalas.length === 0 && !selectedArea" class="no-salas">
              <p>No tienes salas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .areas-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header {
      margin-bottom: 20px;
    }

    .header .btn {
      padding: 12px 24px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .header .btn-success {
      background: #28a745;
      color: white;
    }

    .header .btn-success:hover {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
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
      font-size: 14px;
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

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      margin: 2px;
      transition: all 0.2s ease;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: #212529;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-sm:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .me-1 {
      margin-right: 0.25rem;
    }

    .mb-1 {
      margin-bottom: 0.25rem;
    }

    /* Estilos para el modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .close-btn:hover {
      color: #dc3545;
    }

    .modal-body {
      padding: 20px;
    }

    .salas-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    }

    .sala-option {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .sala-option:hover {
      border-color: #28a745;
      background: #f0f8f0;
    }

    .sala-option h4 {
      margin: 0;
      color: #333;
    }

    .no-salas {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    /* Estilos para el formulario */
    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn.disabled:hover {
      transform: none;
      box-shadow: none;
    }
  `]
})
export class AreasListComponent implements OnInit, OnDestroy {
  areas: any[] = [];
  userSalas: any[] = [];
  showSalaModal = false;
  selectedArea: any = null;
  nuevaArea = {
    nombre: '',
    sala_id: null
  };

  private permissionsSubscription?: Subscription;

  constructor(
    private areasService: AreasService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private router: Router,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    // Cargar módulos primero
    this.modulesService.loadModules();
    
    this.loadAreas();
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(() => {
      // Los permisos se actualizan automáticamente
    });
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  canAdd(): boolean {
    return this.permissionsService.canAddByName('Areas');
  }

  canEdit(): boolean {
    return this.permissionsService.canEditByName('Areas');
  }

  canDelete(): boolean {
    return this.permissionsService.canDeleteByName('Areas');
  }

  loadAreas(): void {
    this.areasService.getAreas().subscribe({
      next: (areas) => {
        this.areas = areas;
      },
      error: (error) => {
        
      }
    });
  }

  showSalaSelector(): void {
    this.loadUserSalas();
    this.resetForm();
    this.showSalaModal = true;
  }

  closeSalaSelector(): void {
    this.showSalaModal = false;
    this.selectedArea = null;
    this.resetForm();
  }

  loadUserSalas(): void {
    this.areasService.getUserSalas().subscribe({
      next: (salas) => {
        this.userSalas = salas;
      },
      error: (error) => {
        
      }
    });
  }

  resetForm(): void {
    this.nuevaArea = {
      nombre: '',
      sala_id: null
    };
  }

  createArea(): void {
    if (this.selectedArea) {
      // Actualizar área existente
      this.areasService.updateArea(this.selectedArea.id, this.nuevaArea).subscribe({
        next: (area) => {
          const index = this.areas.findIndex(a => a.id === area.id);
          if (index !== -1) {
            this.areas[index] = area;
          }
          this.closeSalaSelector();
        },
        error: (error) => {
          
        }
      });
    } else {
      // Crear nueva área
      this.areasService.createArea(this.nuevaArea).subscribe({
        next: (area) => {
          this.areas.unshift(area);
          this.closeSalaSelector();
        },
        error: (error) => {
          
        }
      });
    }
  }

  editArea(area: any): void {
    this.selectedArea = area;
    this.nuevaArea = {
      nombre: area.nombre,
      sala_id: area.sala_id
    };
    this.showSalaModal = true;
  }

  deleteArea(id: number): void {
    const area = this.areas.find(a => a.id === id);
    
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta área?',
      entity: {
        id: id,
        nombre: area?.nombre || 'Área',
        tipo: 'Área'
      },
      warningText: 'Esta acción eliminará permanentemente el área y todos sus datos asociados.',
      onConfirm: () => {
        this.ejecutarEliminacionArea(id, area);
      }
    });
  }

  private ejecutarEliminacionArea(id: number, area: any) {
    
    this.areasService.deleteArea(id).subscribe({
      next: () => {
        
        this.areas = this.areas.filter(area => area.id !== id);
        
      },
      error: (error) => {
        
        // Si es error 400 con relaciones, mostrar modal global
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el área',
            message: error.error.message,
            entity: {
              id: error.error.area?.id || id,
              nombre: error.error.area?.nombre || area?.nombre || 'Área',
              tipo: 'Área'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este área, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          
        }
      }
    });
  }
}
