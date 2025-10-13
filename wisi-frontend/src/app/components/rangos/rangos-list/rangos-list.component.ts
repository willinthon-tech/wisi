import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RangosService } from '../../../services/rangos.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rangos-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rangos-container">
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
              <th>Sedes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let rango of rangos; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ rango.nombre }}</td>
              <td>{{ rango.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editRango(rango) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteRango(rango.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="rangos.length === 0" class="no-data">
        <p>No hay rangos registrados</p>
      </div>

      <!-- Modal para crear rango -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedRango ? 'Editar Rango' : 'Crear Nuevo Rango' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createRango()" #rangoForm="ngForm">
              <div class="form-group">
                <label for="nombreRango">Nombre del Rango:</label>
                <input 
                  type="text" 
                  id="nombreRango" 
                  name="nombreRango"
                  [(ngModel)]="nuevoRango.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del rango"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedRango">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="salaSelect"
                  [(ngModel)]="nuevoRango.sala_id"
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
                <button type="submit" class="btn btn-success" [disabled]="!rangoForm.form.valid">
                  {{ selectedRango ? 'Actualizar Rango' : 'Guardar Rango' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userSalas.length === 0 && !selectedRango" class="no-salas">
              <p>No tienes salas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rangos-container {
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
export class RangosListComponent implements OnInit, OnDestroy {
  rangos: any[] = [];
  userSalas: any[] = [];
  showSalaModal: boolean = false;
  selectedRango: any = null;
  nuevoRango: any = {
    nombre: '',
    sala_id: null
  };

  private readonly RANGOS_MODULE_ID = 6; // ID del módulo de configuración (donde están los rangos)
  private permissionsSubscription?: Subscription;

  constructor(
    private rangosService: RangosService,
    private router: Router,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) { }

  ngOnInit(): void {
    // Suscribirse a cambios de permisos
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      this.debugPermissions();
    });

    // Debug inicial
    this.debugPermissions();
    
    this.loadRangos();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  debugPermissions(): void {
    const allPermissions = this.permissionsService.getCurrentPermissions();

    // Mostrar todos los módulos únicos que tiene el usuario
    const uniqueModules = [...new Set(allPermissions.map(p => p.moduleId))];

    // Mostrar permisos por módulo
    uniqueModules.forEach(moduleId => {
      const modulePermissions = allPermissions.filter(p => p.moduleId === moduleId);
    });


    // Debug adicional para verificar el módulo específico
    const rangosPermissions = allPermissions.filter(p => p.moduleId === 4);
  }

  // Métodos para verificar permisos
  canAdd(): boolean {
    return this.permissionsService.canAdd(this.RANGOS_MODULE_ID);
  }

  canEdit(): boolean {
    return this.permissionsService.canEdit(this.RANGOS_MODULE_ID);
  }

  canDelete(): boolean {
    return this.permissionsService.canDelete(this.RANGOS_MODULE_ID);
  }

  canReport(): boolean {
    return this.permissionsService.canReport(this.RANGOS_MODULE_ID);
  }


  loadRangos(): void {
    this.rangosService.getRangos().subscribe({
      next: (rangos) => {
        this.rangos = rangos;
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
    this.selectedRango = null;
    this.resetForm();
  }

  resetForm(): void {
    this.nuevoRango = {
      nombre: '',
      sala_id: null
    };
  }

  loadUserSalas(): void {
    this.rangosService.getUserSalas().subscribe({
      next: (salas) => {
        this.userSalas = salas;
        if (salas.length === 0) {
        }
      },
      error: (error) => {
      }
    });
  }

  createRango(): void {
    if (!this.nuevoRango.nombre || !this.nuevoRango.sala_id) {
      return;
    }

    if (this.selectedRango) {
      // Modo edición
      this.rangosService.updateRango(this.selectedRango.id, this.nuevoRango).subscribe({
        next: (rango) => {
          this.loadRangos();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    } else {
      // Modo creación
      this.rangosService.createRango(this.nuevoRango).subscribe({
        next: (rango) => {
          this.loadRangos();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    }
  }


  editRango(rango: any): void {
    this.selectedRango = rango;
    this.nuevoRango.nombre = rango.nombre;
    this.nuevoRango.sala_id = rango.sala_id;
    this.showSalaModal = true;
  }

  deleteRango(id: number): void {
    const rango = this.rangos.find(r => r.id === id);
    
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este rango?',
      entity: {
        id: id,
        nombre: rango?.nombre || 'Rango',
        tipo: 'Rango'
      },
      warningText: 'Esta acción eliminará permanentemente el rango y todos sus datos asociados.',
      onConfirm: () => {
        this.ejecutarEliminacionRango(id, rango);
      }
    });
  }

  private ejecutarEliminacionRango(id: number, rango: any) {
    
    this.rangosService.deleteRango(id).subscribe({
      next: () => {
        
        this.loadRangos();
        
      },
      error: (error) => {
        
        if (error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el rango',
            message: 'Este rango tiene relaciones que impiden su eliminación.',
            entity: {
              id: id,
              nombre: rango?.nombre || 'Rango',
              tipo: 'rango'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este rango, primero debe eliminar o reasignar los elementos relacionados.'
          });
        } else {
          
        }
      }
    });
  }
}
