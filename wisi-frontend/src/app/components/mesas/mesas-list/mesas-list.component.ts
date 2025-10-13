import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MesasService } from '../../../services/mesas.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mesas-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mesas-container">
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
              <th>Juego</th>
              <th>Sedes</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let mesa of mesas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ mesa.nombre }}</td>
              <td>{{ mesa.Juego?.nombre || 'Sin asignar' }}</td>
              <td>{{ mesa.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editMesa(mesa) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteMesa(mesa.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="mesas.length === 0" class="no-data">
        <p>No hay mesas registradas</p>
      </div>

      <!-- Modal para crear mesa -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedMesa ? 'Editar Mesa' : 'Crear Nueva Mesa' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createMesa()" #mesaForm="ngForm">
              <div class="form-group">
                <label for="nombreMesa">Nombre de la Mesa:</label>
                <input 
                  type="text" 
                  id="nombreMesa" 
                  name="nombreMesa"
                  [(ngModel)]="nuevaMesa.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre de la mesa"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedMesa">
                <label for="juegoSelect">Juego:</label>
                <select 
                  id="juegoSelect" 
                  name="juegoSelect"
                  [(ngModel)]="nuevaMesa.juego_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione un juego</option>
                  <option *ngFor="let juego of userJuegos" [value]="juego.id">
                    {{ juego.nombre }} - {{ juego.Sala?.nombre }}
                  </option>
                </select>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeSalaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!mesaForm.form.valid">
                  {{ selectedMesa ? 'Actualizar Mesa' : 'Guardar Mesa' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userJuegos.length === 0 && !selectedMesa" class="no-salas">
              <p>No tienes juegos asignados</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .mesas-container {
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
export class MesasListComponent implements OnInit, OnDestroy {
  mesas: any[] = [];
  userJuegos: any[] = [];
  showSalaModal: boolean = false;
  selectedMesa: any = null;
  nuevaMesa: any = {
    nombre: '',
    juego_id: null
  };

  private readonly MESAS_MODULE_ID = 12; // Módulo "Gestion de Mesas"
  private permissionsSubscription?: Subscription;

  constructor(
    private mesasService: MesasService,
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
    
    this.loadMesas();
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


    // Verificar estado de botones

    // Debug adicional para verificar el módulo específico
    const mesasPermissions = allPermissions.filter(p => p.moduleId === 12);
  }

  // Métodos para verificar permisos
  canAdd(): boolean {
    return this.permissionsService.canAdd(this.MESAS_MODULE_ID);
  }

  canEdit(): boolean {
    return this.permissionsService.canEdit(this.MESAS_MODULE_ID);
  }

  canDelete(): boolean {
    return this.permissionsService.canDelete(this.MESAS_MODULE_ID);
  }

  canReport(): boolean {
    return this.permissionsService.canReport(this.MESAS_MODULE_ID);
  }

  forceReloadPermissions(): void {
    this.permissionsService.forceReloadPermissions();
  }

  loadMesas(): void {
    this.mesasService.getMesas().subscribe({
      next: (mesas) => {
        this.mesas = mesas;
      },
      error: (error) => {
      }
    });
  }

  showSalaSelector(): void {
    this.loadUserJuegos();
    this.resetForm();
    this.showSalaModal = true;
  }

  closeSalaSelector(): void {
    this.showSalaModal = false;
    this.selectedMesa = null;
    this.resetForm();
  }

  resetForm(): void {
    this.nuevaMesa = {
      nombre: '',
      juego_id: null
    };
  }

  loadUserJuegos(): void {
    this.mesasService.getUserJuegos().subscribe({
      next: (juegos) => {
        this.userJuegos = juegos;
      },
      error: (error) => {
      }
    });
  }

  createMesa(): void {
    if (!this.nuevaMesa.nombre || !this.nuevaMesa.juego_id) {
      return;
    }

    if (this.selectedMesa) {
      // Modo edición
      this.mesasService.updateMesa(this.selectedMesa.id, this.nuevaMesa).subscribe({
        next: (mesa) => {
          this.loadMesas();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    } else {
      // Modo creación
      this.mesasService.createMesa(this.nuevaMesa).subscribe({
        next: (mesa) => {
          this.loadMesas();
          this.closeSalaSelector();
        },
        error: (error) => {
        }
      });
    }
  }


  editMesa(mesa: any): void {
    this.selectedMesa = mesa;
    this.nuevaMesa.nombre = mesa.nombre;
    this.nuevaMesa.juego_id = mesa.juego_id;
    this.showSalaModal = true;
    this.loadUserJuegos();
  }

  deleteMesa(id: number): void {
    const mesa = this.mesas.find(m => m.id === id);
    console.log('Mostrando modal de confirmación para mesa:', id);
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta mesa?',
      entity: {
        id: id,
        nombre: mesa?.nombre || 'Mesa',
        tipo: 'Mesa'
      },
      warningText: 'Esta acción eliminará permanentemente la mesa y todos sus datos asociados.',
      onConfirm: () => {
        this.ejecutarEliminacionMesa(id, mesa);
      }
    });
  }

  private ejecutarEliminacionMesa(id: number, mesa: any) {
    console.log('Ejecutando eliminación de mesa:', id);
    this.mesasService.deleteMesa(id).subscribe({
      next: () => {
        console.log('Mesa eliminada correctamente');
        this.loadMesas();
        alert('Mesa eliminada correctamente');
      },
      error: (error) => {
        console.error('Error eliminando mesa:', error);
        if (error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar la mesa',
            message: 'Esta mesa tiene relaciones que impiden su eliminación.',
            entity: {
              id: id,
              nombre: mesa?.nombre || 'Mesa',
              tipo: 'mesa'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar esta mesa, primero debe eliminar o reasignar los elementos relacionados.'
          });
        } else {
          alert('Error eliminando mesa: ' + (error.error?.message || 'Error desconocido'));
        }
      }
    });
  }
}
