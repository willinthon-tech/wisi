import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MaquinasService } from '../../../services/maquinas.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-maquinas-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="maquinas-container">
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
              <th>Rango</th>
              <th>Sedes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let maquina of maquinas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ maquina.nombre }}</td>
              <td>{{ maquina.Rango?.nombre || 'Sin asignar' }}</td>
              <td>{{ maquina.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editMaquina(maquina) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-warning btn-sm me-1" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? borrarMaquina(maquina.id) : null">
                  Borrar máquina
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteMaquina(maquina.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="maquinas.length === 0" class="no-data">
        <p>No hay máquinas registradas</p>
      </div>

      <!-- Modal para crear máquina -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedMaquina ? 'Editar Máquina' : 'Crear Nueva Máquina' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createMaquina()" #maquinaForm="ngForm">
              <div class="form-group">
                <label for="nombreMaquina">Nombre de la Máquina:</label>
                <input 
                  type="text" 
                  id="nombreMaquina" 
                  name="nombreMaquina"
                  [(ngModel)]="nuevaMaquina.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre de la máquina"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedMaquina">
                <label for="rangoSelect">Rango:</label>
                <select 
                  id="rangoSelect" 
                  name="rangoSelect"
                  [(ngModel)]="nuevaMaquina.rango_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione un rango</option>
                  <option *ngFor="let rango of userRangos" [value]="rango.id">
                    {{ rango.nombre }} - {{ rango.Sala?.nombre }}
                  </option>
                </select>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeSalaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!maquinaForm.form.valid">
                  {{ selectedMaquina ? 'Actualizar Máquina' : 'Guardar Máquina' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userRangos.length === 0 && !selectedMaquina" class="no-salas">
              <p>No tienes rangos asignados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .maquinas-container {
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

    .btn.disabled {
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
export class MaquinasListComponent implements OnInit, OnDestroy {
  maquinas: any[] = [];
  userRangos: any[] = [];
  showSalaModal: boolean = false;
  selectedMaquina: any = null;
  nuevaMaquina: any = {
    nombre: '',
    rango_id: null
  };

  private permissionsSubscription?: Subscription;

  constructor(
    private maquinasService: MaquinasService,
    private router: Router,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) { }

  ngOnInit(): void {
    // Cargar módulos primero
    this.modulesService.loadModules();
    
    // Suscribirse a cambios de permisos
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      this.debugPermissions();
    });

    // Debug inicial
    this.debugPermissions();
    
    this.loadMaquinas();
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
    const maquinasPermissions = allPermissions.filter(p => p.moduleId === 2);
  }

  // Métodos para verificar permisos
  canAdd(): boolean {
    return this.permissionsService.canAddByName('Maquinas');
  }

  canEdit(): boolean {
    return this.permissionsService.canEditByName('Maquinas');
  }

  canDelete(): boolean {
    return this.permissionsService.canDeleteByName('Maquinas');
  }

  canReport(): boolean {
    return this.permissionsService.canReportByName('Maquinas');
  }

  loadMaquinas(): void {
    this.maquinasService.getMaquinas().subscribe({
      next: (maquinas) => {
        this.maquinas = maquinas;
      },
      error: (error) => {
      }
    });
  }

  showSalaSelector(): void {
    this.loadUserRangos();
    this.resetForm();
    this.showSalaModal = true;
  }

  closeSalaSelector(): void {
    this.showSalaModal = false;
    this.selectedMaquina = null;
    this.resetForm();
  }

  resetForm(): void {
    this.nuevaMaquina = {
      nombre: '',
      rango_id: null
    };
  }

  loadUserRangos(): void {
    this.maquinasService.getUserRangos().subscribe({
      next: (rangos) => {
        this.userRangos = rangos;
        if (rangos.length === 0) {
        }
      },
      error: (error) => {
      }
    });
  }

  createMaquina(): void {
    if (!this.nuevaMaquina.nombre || !this.nuevaMaquina.rango_id) {
      return;
    }

    if (this.selectedMaquina) {
      // Modo edición
      this.maquinasService.updateMaquina(this.selectedMaquina.id, this.nuevaMaquina).subscribe({
        next: (maquina) => {
          this.loadMaquinas();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    } else {
      // Modo creación
      this.maquinasService.createMaquina(this.nuevaMaquina).subscribe({
        next: (maquina) => {
          this.loadMaquinas();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    }
  }


  editMaquina(maquina: any): void {
    this.selectedMaquina = maquina;
    this.nuevaMaquina.nombre = maquina.nombre;
    this.nuevaMaquina.rango_id = maquina.rango_id;
    this.showSalaModal = true;
    this.loadUserRangos();
  }

  borrarMaquina(id: number): void {
    const maquina = this.maquinas.find(m => m.id === id);
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Borrado',
      message: '¿Está seguro de que desea borrar esta máquina?',
      entity: {
        id: id,
        nombre: maquina?.nombre || 'Máquina',
        tipo: 'Máquina'
      },
      warningText: 'Esta acción marcará la máquina como borrada pero conservará sus datos.',
      onConfirm: () => {
        this.ejecutarBorradoMaquina(id, maquina);
      }
    });
  }

  private ejecutarBorradoMaquina(id: number, maquina: any) {
    this.maquinasService.borrarMaquina(id).subscribe({
      next: () => {
        this.maquinas = this.maquinas.filter(maquina => maquina.id !== id);
      },
      error: (error) => {
        
        if (error.status === 400 && error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'Error de Borrado',
            message: 'No se puede borrar esta máquina porque tiene las siguientes relaciones:',
            relations: error.error.relations
          });
        } else {
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo borrar la máquina'
          });
        }
      }
    });
  }

  deleteMaquina(id: number): void {
    const maquina = this.maquinas.find(m => m.id === id);
    
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta máquina?',
      entity: {
        id: id,
        nombre: maquina?.nombre || 'Máquina',
        tipo: 'Máquina'
      },
      warningText: 'Esta acción eliminará permanentemente la máquina y todos sus datos asociados.',
      onConfirm: () => {
        this.ejecutarEliminacionMaquina(id, maquina);
      }
    });
  }

  private ejecutarEliminacionMaquina(id: number, maquina: any) {
    
    this.maquinasService.deleteMaquina(id).subscribe({
      next: () => {
        
        this.loadMaquinas();
        
      },
      error: (error) => {
        
        if (error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar la máquina',
            message: 'Esta máquina tiene relaciones que impiden su eliminación.',
            entity: {
              id: id,
              nombre: maquina?.nombre || 'Máquina',
              tipo: 'máquina'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar esta máquina, primero debe eliminar o reasignar los elementos relacionados.'
          });
        } else {
          
        }
      }
    });
  }
}
