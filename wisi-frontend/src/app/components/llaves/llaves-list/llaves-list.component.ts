import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LlavesService } from '../../../services/llaves.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-llaves-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="llaves-container">
      <div class="header">
        <button
          class="btn btn-success"
          [class.disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="canAdd() ? showCreateModal() : null">
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
            <tr *ngFor="let llave of llaves; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ llave.nombre }}</td>
              <td>{{ llave.Sala?.nombre || 'Sin sala' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editLlave(llave) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-warning btn-sm me-1" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? borrarLlave(llave.id) : null">
                  Borrar llave
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteLlave(llave.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="llaves.length === 0" class="no-data">
          <p>No hay llaves registradas</p>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar llave -->
    <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ isEditMode ? 'Editar Llave' : 'Crear Nueva Llave' }}</h3>
          <button class="close-btn" (click)="closeModal()">&times;</button>
        </div>
        <div class="modal-body">
          <form (ngSubmit)="saveLlave()" #llaveForm="ngForm">
            <div class="form-group">
              <label for="nombre">Nombre de la Llave:</label>
              <input 
                type="text" 
                id="nombre" 
                name="nombre"
                [(ngModel)]="llaveData.nombre" 
                class="form-control"
                placeholder="Ingrese el nombre de la llave"
                required
              />
            </div>
            
            <div class="form-group">
              <label for="sala_id">Sala:</label>
              <select 
                id="sala_id" 
                name="sala_id"
                [(ngModel)]="llaveData.sala_id" 
                class="form-control"
                required
              >
                <option value="">Seleccione una sala</option>
                <option *ngFor="let sala of salas" [value]="sala.id">
                  {{ sala.nombre }}
                </option>
              </select>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">
                Cancelar
              </button>
              <button type="submit" class="btn btn-success" [disabled]="!llaveForm.form.valid">
                {{ isEditMode ? 'Actualizar Llave' : 'Guardar Llave' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .llaves-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      max-width: 600px;
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

    /* Estilos para el formulario */
    .form-group {
      margin-bottom: 20px;
    }

    .form-label {
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
      border-color: #17a2b8;
      box-shadow: 0 0 0 3px rgba(23, 162, 184, 0.1);
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
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

    .modal.show {
      display: block !important;
    }
    
    .modal-backdrop.show {
      display: block !important;
    }
  `]
})
export class LlavesListComponent implements OnInit, OnDestroy {
  llaves: any[] = [];
  salas: any[] = [];
  showModal = false;
  isEditMode = false;
  editingLlaveId: number | null = null;
  
  llaveData = {
    nombre: '',
    sala_id: null as number | null
  };
  
  private readonly LLAVES_MODULE_ID = 19; // ID del módulo Llaves
  private permissionsSubscription?: Subscription;

  constructor(
    private llavesService: LlavesService,
    private userService: UserService,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.loadLlaves();
    this.loadSalas();
    this.loadPermissions();
  }

  ngOnDestroy() {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadLlaves() {
    this.llavesService.getLlaves().subscribe({
      next: (llaves) => {
        this.llaves = llaves;
      },
      error: (error) => {
        
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las llaves'
        });
      }
    });
  }

  loadSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas) => {
        this.salas = salas;
      },
      error: (error) => {
        
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las salas'
        });
      }
    });
  }

  loadPermissions() {
    // Verificar si es superusuario (nivel TODO)
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      // Superusuario tiene acceso a todo
      return;
    }
    
    // Para usuarios normales, verificar permisos específicos
    this.permissionsService.getUserPermissions().subscribe((permissions: any) => {
      const hasAccess = permissions.some((p: any) => p.Module?.id === this.LLAVES_MODULE_ID);
      if (!hasAccess) {
        this.errorModalService.showErrorModal({
          title: 'Acceso Denegado',
          message: 'No tienes permisos para acceder a este módulo'
        });
      }
    });
  }

  canAdd(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      return true; // Superusuario puede hacer todo
    }
    // TODO: Implementar verificación de permisos específicos para usuarios normales
    return true;
  }

  canEdit(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      return true; // Superusuario puede hacer todo
    }
    // TODO: Implementar verificación de permisos específicos para usuarios normales
    return true;
  }

  canDelete(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      return true; // Superusuario puede hacer todo
    }
    // TODO: Implementar verificación de permisos específicos para usuarios normales
    return true;
  }

  showCreateModal() {
    this.isEditMode = false;
    this.editingLlaveId = null;
    this.llaveData = {
      nombre: '',
      sala_id: null
    };
    this.showModal = true;
  }

  editLlave(llave: any) {
    this.isEditMode = true;
    this.editingLlaveId = llave.id;
    this.llaveData = {
      nombre: llave.nombre,
      sala_id: llave.sala_id
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.llaveData = {
      nombre: '',
      sala_id: null
    };
  }

  saveLlave() {
    if (this.isEditMode && this.editingLlaveId) {
      this.llavesService.updateLlave(this.editingLlaveId, this.llaveData).subscribe({
        next: () => {
          this.loadLlaves();
          this.closeModal();
        },
        error: (error) => {
          
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo actualizar la llave'
          });
        }
      });
    } else {
      this.llavesService.createLlave(this.llaveData).subscribe({
        next: () => {
          this.loadLlaves();
          this.closeModal();
        },
        error: (error) => {
          
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo crear la llave'
          });
        }
      });
    }
  }

  borrarLlave(id: number) {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Borrado',
      message: '¿Está seguro de que desea borrar esta llave?',
      entity: {
        id: id,
        nombre: 'Llave',
        tipo: 'Llave'
      },
      warningText: 'Esta acción marcará la llave como borrada (soft delete).',
      onConfirm: () => {
        this.llavesService.borrarLlave(id).subscribe({
          next: () => {
            this.loadLlaves();
          },
          error: (error) => {
            
            this.errorModalService.showErrorModal({
              title: 'Error',
              message: 'No se pudo borrar la llave'
            });
          }
        });
      }
    });
  }

  deleteLlave(id: number) {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta llave?',
      entity: {
        id: id,
        nombre: 'Llave',
        tipo: 'Llave'
      },
      warningText: 'Esta acción eliminará permanentemente la llave.',
      onConfirm: () => {
        this.llavesService.deleteLlave(id).subscribe({
          next: () => {
            this.loadLlaves();
          },
          error: (error) => {
            
            this.errorModalService.showErrorModal({
              title: 'Error',
              message: 'No se pudo eliminar la llave'
            });
          }
        });
      }
    });
  }
}
