import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NovedadesMaquinasService, NovedadMaquina } from '../../../services/novedades-maquinas.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-novedades-maquinas-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="novedades-container">
      <div class="header">
        <button 
          class="btn btn-success"
          [class.disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="canAdd() ? showSalaSelector() : null">
          Agregar Novedad
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
            <tr *ngFor="let novedad of novedades; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ novedad.nombre }}</td>
              <td>{{ novedad.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1"
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editNovedad(novedad) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm"
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteNovedad(novedad.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="novedades.length === 0" class="no-data">
        <p>No hay novedades registradas</p>
      </div>

      <!-- Modal para crear novedad -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedNovedad ? 'Editar Novedad' : 'Crear Nueva Novedad' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createNovedad()" #novedadForm="ngForm">
              <div class="form-group">
                <label for="nombreNovedad">Nombre de la Novedad:</label>
                <input 
                  type="text" 
                  id="nombreNovedad" 
                  name="nombreNovedad"
                  [(ngModel)]="nuevaNovedad.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre de la novedad"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedNovedad">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="salaSelect"
                  [(ngModel)]="nuevaNovedad.sala_id"
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
                <button type="submit" class="btn btn-success" [disabled]="!novedadForm.form.valid">
                  {{ selectedNovedad ? 'Actualizar Novedad' : 'Guardar Novedad' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userSalas.length === 0 && !selectedNovedad" class="no-salas">
              <p>No tienes salas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .novedades-container {
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

    .btn:disabled,
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
export class NovedadesMaquinasListComponent implements OnInit, OnDestroy {
  novedades: NovedadMaquina[] = [];
  userSalas: any[] = [];
  showSalaModal = false;
  selectedNovedad: any = null;
  nuevaNovedad = {
    nombre: '',
    sala_id: null
  };

  private readonly NOVEDADES_MAQUINAS_MODULE_ID = 16; // ID del módulo Gestion de Novedades de Maquinas
  private permissionsSubscription?: Subscription;

  constructor(
    private novedadesService: NovedadesMaquinasService,
    private userService: UserService,
    private permissionsService: PermissionsService
  ) { }

  ngOnInit() {
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      console.log('🔄 Permisos actualizados en Novedades Máquinas List:', permissions);
    });

    this.loadNovedades();
    this.loadUserSalas();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadNovedades() {
    this.novedadesService.getNovedadesMaquinas().subscribe({
      next: (novedades: NovedadMaquina[]) => {
        this.novedades = novedades;
        console.log('Novedades cargadas:', this.novedades);
      },
      error: (error: any) => {
        console.error('Error cargando novedades:', error);
        alert('Error cargando novedades');
      }
    });
  }

  loadUserSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.userSalas = salas;
        console.log('Salas del usuario cargadas:', this.userSalas);
      },
      error: (error: any) => {
        console.error('Error cargando salas del usuario:', error);
        alert('Error cargando salas del usuario');
      }
    });
  }

  showSalaSelector() {
    this.showSalaModal = true;
    this.resetForm();
  }

  closeSalaSelector() {
    this.showSalaModal = false;
    this.selectedNovedad = null;
    this.resetForm();
  }

  resetForm() {
    this.nuevaNovedad = {
      nombre: '',
      sala_id: null
    };
  }

  createNovedad() {
    if (!this.nuevaNovedad.nombre) {
      alert('Por favor complete el nombre');
      return;
    }

    if (this.selectedNovedad) {
      // Modo edición - solo actualizar nombre
      const updateData = { nombre: this.nuevaNovedad.nombre };
      this.novedadesService.updateNovedadMaquina(this.selectedNovedad.id, updateData).subscribe({
        next: (novedad: NovedadMaquina) => {
          console.log('Novedad actualizada:', novedad);
          this.loadNovedades();
          this.closeSalaSelector();
          alert('Novedad actualizada correctamente');
        },
        error: (error: any) => {
          console.error('Error actualizando novedad:', error);
          alert('Error actualizando novedad');
        }
      });
    } else {
      // Modo creación - requiere sala_id
      if (!this.nuevaNovedad.sala_id) {
        alert('Por favor seleccione una sala');
        return;
      }
      this.novedadesService.createNovedadMaquina(this.nuevaNovedad).subscribe({
        next: (novedad: NovedadMaquina) => {
          console.log('Novedad creada:', novedad);
          this.loadNovedades();
          this.closeSalaSelector();
          alert('Novedad creada correctamente');
        },
        error: (error: any) => {
          console.error('Error creando novedad:', error);
          alert('Error creando novedad');
        }
      });
    }
  }

  editNovedad(novedad: any): void {
    this.selectedNovedad = novedad;
    this.nuevaNovedad.nombre = novedad.nombre;
    // NO se edita sala_id para evitar errores de asociaciones
    this.showSalaModal = true;
    this.loadUserSalas();
  }

  deleteNovedad(id: number) {
    if (confirm('¿Está seguro de que desea eliminar esta novedad?')) {
      this.novedadesService.deleteNovedadMaquina(id).subscribe({
        next: () => {
          console.log('Novedad eliminada');
          this.loadNovedades();
          alert('Novedad eliminada correctamente');
        },
        error: (error: any) => {
          console.error('Error eliminando novedad:', error);
          alert('Error eliminando novedad');
        }
      });
    }
  }

  // Métodos de verificación de permisos
  canAdd(): boolean {
    return this.permissionsService.canAdd(this.NOVEDADES_MAQUINAS_MODULE_ID);
  }

  canEdit(): boolean {
    return this.permissionsService.canEdit(this.NOVEDADES_MAQUINAS_MODULE_ID);
  }

  canDelete(): boolean {
    return this.permissionsService.canDelete(this.NOVEDADES_MAQUINAS_MODULE_ID);
  }

  canReport(): boolean {
    return this.permissionsService.canReport(this.NOVEDADES_MAQUINAS_MODULE_ID);
  }
}
