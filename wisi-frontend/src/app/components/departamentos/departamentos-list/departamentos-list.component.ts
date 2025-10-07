import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DepartamentosService } from '../../../services/departamentos.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-departamentos-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="departamentos-container">
      <div class="header">
        <button 
          class="btn btn-success" 
          [class.disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="canAdd() ? showAreaSelector() : null">
          Agregar
        </button>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Área</th>
              <th>Sala</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let departamento of departamentos; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ departamento.nombre }}</td>
              <td>{{ departamento.Area?.nombre || 'Sin asignar' }}</td>
              <td>{{ departamento.Area?.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editDepartamento(departamento) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteDepartamento(departamento.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="departamentos.length === 0" class="no-data">
        <p>No hay departamentos registrados</p>
      </div>

      <!-- Modal para crear departamento -->
      <div *ngIf="showAreaModal" class="modal-overlay" (click)="closeAreaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedDepartamento ? 'Editar Departamento' : 'Crear Nuevo Departamento' }}</h3>
            <button class="close-btn" (click)="closeAreaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createDepartamento()" #departamentoForm="ngForm">
              <div class="form-group">
                <label for="nombreDepartamento">Nombre del Departamento:</label>
                <input 
                  type="text" 
                  id="nombreDepartamento" 
                  name="nombreDepartamento"
                  [(ngModel)]="nuevoDepartamento.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del departamento"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedDepartamento">
                <label for="areaSelect">Área:</label>
                <select 
                  id="areaSelect" 
                  name="areaSelect"
                  [(ngModel)]="nuevoDepartamento.area_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione un área</option>
                  <option *ngFor="let area of userAreas" [value]="area.id">
                    {{ area.nombre }} ({{ area.Sala?.nombre || 'Sin sala' }})
                  </option>
                </select>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeAreaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!departamentoForm.form.valid">
                  {{ selectedDepartamento ? 'Actualizar Departamento' : 'Guardar Departamento' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userAreas.length === 0 && !selectedDepartamento" class="no-areas">
              <p>No tienes áreas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .departamentos-container {
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

    .areas-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 15px;
    }

    .area-option {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .area-option:hover {
      border-color: #28a745;
      background: #f0f8f0;
    }

    .area-option h4 {
      margin: 0;
      color: #333;
    }

    .no-areas {
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
export class DepartamentosListComponent implements OnInit, OnDestroy {
  departamentos: any[] = [];
  userAreas: any[] = [];
  showAreaModal = false;
  selectedDepartamento: any = null;
  nuevoDepartamento = {
    nombre: '',
    area_id: null
  };

  private readonly DEPARTAMENTOS_MODULE_ID = 1; // Módulo RRHH
  private permissionsSubscription?: Subscription;

  constructor(
    private departamentosService: DepartamentosService,
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDepartamentos();
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
    return this.permissionsService.hasPermission(this.DEPARTAMENTOS_MODULE_ID, 'AGREGAR');
  }

  canEdit(): boolean {
    return this.permissionsService.hasPermission(this.DEPARTAMENTOS_MODULE_ID, 'EDITAR');
  }

  canDelete(): boolean {
    return this.permissionsService.hasPermission(this.DEPARTAMENTOS_MODULE_ID, 'BORRAR');
  }

  loadDepartamentos(): void {
    this.departamentosService.getDepartamentos().subscribe({
      next: (departamentos) => {
        this.departamentos = departamentos;
      },
      error: (error) => {
        console.error('Error cargando departamentos:', error);
        alert('Error cargando departamentos');
      }
    });
  }

  showAreaSelector(): void {
    this.loadUserAreas();
    this.resetForm();
    this.showAreaModal = true;
  }

  closeAreaSelector(): void {
    this.showAreaModal = false;
    this.selectedDepartamento = null;
    this.resetForm();
  }

  loadUserAreas(): void {
    this.departamentosService.getUserAreas().subscribe({
      next: (areas) => {
        this.userAreas = areas;
      },
      error: (error) => {
        console.error('Error cargando áreas:', error);
        alert('Error cargando áreas');
      }
    });
  }

  resetForm(): void {
    this.nuevoDepartamento = {
      nombre: '',
      area_id: null
    };
  }

  createDepartamento(): void {
    if (this.selectedDepartamento) {
      // Actualizar departamento existente
      this.departamentosService.updateDepartamento(this.selectedDepartamento.id, this.nuevoDepartamento).subscribe({
        next: (departamento) => {
          const index = this.departamentos.findIndex(d => d.id === departamento.id);
          if (index !== -1) {
            this.departamentos[index] = departamento;
          }
          this.closeAreaSelector();
          console.log('Departamento actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando departamento:', error);
          alert('Error actualizando departamento');
        }
      });
    } else {
      // Crear nuevo departamento
      this.departamentosService.createDepartamento(this.nuevoDepartamento).subscribe({
        next: (departamento) => {
          this.departamentos.unshift(departamento);
          this.closeAreaSelector();
          console.log('Departamento creado exitosamente');
        },
        error: (error) => {
          console.error('Error creando departamento:', error);
          alert('Error creando departamento');
        }
      });
    }
  }

  editDepartamento(departamento: any): void {
    this.selectedDepartamento = departamento;
    this.nuevoDepartamento = {
      nombre: departamento.nombre,
      area_id: departamento.area_id
    };
    this.showAreaModal = true;
  }

  deleteDepartamento(id: number): void {
    this.departamentosService.deleteDepartamento(id).subscribe({
      next: () => {
        this.departamentos = this.departamentos.filter(departamento => departamento.id !== id);
        console.log('Departamento eliminado exitosamente');
      },
      error: (error) => {
        console.error('Error eliminando departamento:', error);
        alert('Error eliminando departamento');
      }
    });
  }
}




