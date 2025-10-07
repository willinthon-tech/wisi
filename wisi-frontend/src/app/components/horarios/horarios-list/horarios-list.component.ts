import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { HorariosService } from '../../../services/horarios.service';
import { PermissionsService } from '../../../services/permissions.service';
import { AreasService } from '../../../services/areas.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-horarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="horarios-container">
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
              <th>Bloques</th>
              <th>Patrón</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let horario of horarios; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ horario.nombre }}</td>
              <td>{{ horario.Sala?.nombre || 'Sin asignar' }}</td>
              <td>{{ horario.bloques?.length || 0 }} bloques</td>
              <td>
                <div class="patron-preview">
                  <span *ngFor="let bloque of horario.bloques; let j = index" 
                        class="badge me-1" 
                        [ngClass]="getBloqueBadgeClass(bloque.turno)">
                    {{ getBloqueText(bloque.turno) }}
                  </span>
                </div>
              </td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editHorario(horario) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteHorario(horario.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="horarios.length === 0" class="no-data">
        <p>No hay horarios registrados</p>
      </div>

      <!-- Modal para crear horario -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedHorario ? 'Editar Horario' : 'Crear Nuevo Horario' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createHorario()" #horarioForm="ngForm">
              <div class="form-group">
                <label for="nombreHorario">Nombre del Horario:</label>
                <input 
                  type="text" 
                  id="nombreHorario" 
                  name="nombreHorario"
                  [(ngModel)]="nuevoHorario.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del horario"
                  required
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedHorario">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="salaSelect"
                  [(ngModel)]="nuevoHorario.sala_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione una sala</option>
                  <option *ngFor="let sala of userSalas" [value]="sala.id">
                    {{ sala.nombre }}
                  </option>
                </select>
              </div>


              <!-- Configuración de Bloques -->
              <div class="bloques-section">
                
                <div class="form-group">
                  <label for="cantidadBloques">Cantidad de Bloques:</label>
                  <input 
                    type="number" 
                    id="cantidadBloques" 
                    name="cantidadBloques"
                    [(ngModel)]="cantidadBloques"
                    class="form-control"
                    min="1"
                    (change)="onCantidadBloquesChange()"
                    required
                  />
                </div>

                <!-- Lista de Bloques -->
                <div class="bloques-container" *ngIf="bloques.length > 0">
                  <div class="bloque-item" *ngFor="let bloque of bloques; let i = index">
                    <div class="bloque-header">
                      <h6 class="mb-0">Bloque {{ i + 1 }}</h6>
                    </div>
                    <div class="bloque-body">
                      <div class="row">
                        <div class="col-md-4">
                          <div class="form-group">
                            <label>Hora de Entrada:</label>
                            <input 
                              type="time" 
                              [(ngModel)]="bloque.hora_entrada"
                              name="hora_entrada_{{i}}"
                              class="form-control"
                              [disabled]="bloque.turno === 'LIBRE'"
                              [required]="bloque.turno !== 'LIBRE'"
                            />
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="form-group">
                            <label>Hora de Salida:</label>
                            <input 
                              type="time" 
                              [(ngModel)]="bloque.hora_salida"
                              name="hora_salida_{{i}}"
                              class="form-control"
                              [disabled]="bloque.turno === 'LIBRE'"
                              [required]="bloque.turno !== 'LIBRE'"
                            />
                          </div>
                        </div>
                        <div class="col-md-4">
                          <div class="form-group">
                            <label>Turno:</label>
                            <select 
                              [(ngModel)]="bloque.turno"
                              name="turno_{{i}}"
                              class="form-control"
                              (change)="onTurnoChange(bloque)"
                              required
                            >
                              <option value="">Seleccione turno</option>
                              <option value="DIURNO">Diurno</option>
                              <option value="NOCTURNO">Nocturno</option>
                              <option value="LIBRE">Libre</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeSalaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!horarioForm.form.valid">
                  {{ selectedHorario ? 'Actualizar Horario' : 'Guardar Horario' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userSalas.length === 0 && !selectedHorario" class="no-salas">
              <p>No tienes salas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .horarios-container {
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
      max-width: 800px;
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

    .form-control:disabled {
      background-color: #f8f9fa;
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-group:has(.form-control:disabled) label {
      color: #6c757d;
      opacity: 0.7;
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

    /* Estilos para bloques */
    .bloques-section {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .bloques-section h4 {
      color: #333;
      margin-bottom: 10px;
    }

    .bloques-container {
      margin-top: 15px;
    }

    .bloque-item {
      background: white;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      margin-bottom: 15px;
      padding: 0;
    }

    .bloque-header {
      background: #e9ecef;
      padding: 10px 15px;
      border-bottom: 1px solid #dee2e6;
      border-radius: 6px 6px 0 0;
    }

    .bloque-header h6 {
      margin: 0;
      color: #333;
      font-weight: 600;
    }

    .bloque-body {
      padding: 15px;
    }


    .patron-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .badge-diurno {
      background-color: #ffc107 !important;
      color: #000 !important;
    }

    .badge-nocturno {
      background-color: #6f42c1 !important;
      color: #fff !important;
    }

    .badge-libre {
      background-color: #28a745 !important;
      color: #fff !important;
    }

    .text-success {
      color: #198754 !important;
    }

    .text-muted {
      color: #6c757d !important;
    }

    .small {
      font-size: 0.875em;
    }

    .mb-0 {
      margin-bottom: 0 !important;
    }

    .mb-2 {
      margin-bottom: 0.5rem !important;
    }

    .mb-3 {
      margin-bottom: 1rem !important;
    }

    .me-2 {
      margin-right: 0.5rem !important;
    }

    .ms-2 {
      margin-left: 0.5rem !important;
    }

    .w-100 {
      width: 100% !important;
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      margin-right: -15px;
      margin-left: -15px;
    }

    .col-md-2, .col-md-3, .col-md-4 {
      position: relative;
      width: 100%;
      padding-right: 15px;
      padding-left: 15px;
    }

    @media (min-width: 768px) {
      .col-md-2 {
        flex: 0 0 16.666667%;
        max-width: 16.666667%;
      }
      .col-md-3 {
        flex: 0 0 25%;
        max-width: 25%;
      }
      .col-md-4 {
        flex: 0 0 33.333333%;
        max-width: 33.333333%;
      }
    }
  `]
})
export class HorariosListComponent implements OnInit, OnDestroy {
  horarios: any[] = [];
  userSalas: any[] = [];
  showSalaModal = false;
  selectedHorario: any = null;
  
  // Nuevo sistema de bloques
  nuevoHorario = {
    id: null,
    nombre: '',
    sala_id: null
  };
  
  cantidadBloques = 1;
  bloques: any[] = [];

  private readonly HORARIOS_MODULE_ID = 1; // Módulo RRHH
  private permissionsSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private horariosService: HorariosService,
    private permissionsService: PermissionsService,
    private areasService: AreasService,
    private router: Router,
    private route: ActivatedRoute,
    private errorModalService: ErrorModalService
  ) {}

  ngOnInit(): void {
    this.loadHorarios();
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
    return this.permissionsService.hasPermission(this.HORARIOS_MODULE_ID, 'AGREGAR');
  }

  canEdit(): boolean {
    return this.permissionsService.hasPermission(this.HORARIOS_MODULE_ID, 'EDITAR');
  }

  canDelete(): boolean {
    return this.permissionsService.hasPermission(this.HORARIOS_MODULE_ID, 'BORRAR');
  }

  loadHorarios(): void {
    this.horariosService.getHorarios().subscribe({
      next: (horarios) => {
        this.horarios = horarios;
      },
      error: (error) => {
        console.error('Error cargando horarios:', error);
        alert('Error cargando horarios');
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
    this.selectedHorario = null;
    this.resetForm();
  }

  loadUserSalas(): void {
    this.areasService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.userSalas = salas;
      },
      error: (error: any) => {
        console.error('Error cargando salas:', error);
        alert('Error cargando salas');
      }
    });
  }

  resetForm(): void {
    this.nuevoHorario = {
      id: null,
      nombre: '',
      sala_id: null
    };
    this.cantidadBloques = 1;
    this.bloques = [];
    this.onCantidadBloquesChange();
  }

  onCantidadBloquesChange(): void {
    const cantidad = Math.max(1, this.cantidadBloques);
    this.cantidadBloques = cantidad;
    
    // Ajustar array de bloques
    while (this.bloques.length < cantidad) {
      this.bloques.push({
        hora_entrada: '',
        hora_salida: '',
        turno: ''
      });
    }
    
    while (this.bloques.length > cantidad) {
      this.bloques.pop();
    }
  }

  removeBloque(index: number): void {
    if (this.bloques.length > 1) {
      this.bloques.splice(index, 1);
      this.cantidadBloques = this.bloques.length;
    }
  }

  onTurnoChange(bloque: any): void {
    if (bloque.turno === 'LIBRE') {
      // Limpiar las horas cuando es libre
      bloque.hora_entrada = '';
      bloque.hora_salida = '';
    }
  }

  createHorario(): void {
    if (!this.nuevoHorario.nombre || !this.nuevoHorario.sala_id || this.bloques.length === 0) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    // Validar que todos los bloques tengan datos
    const bloquesInvalidos = this.bloques.some(bloque => {
      if (!bloque.turno) return true;
      // Si no es libre, debe tener horas
      if (bloque.turno !== 'LIBRE') {
        return !bloque.hora_entrada || !bloque.hora_salida;
      }
      return false;
    });

    if (bloquesInvalidos) {
      alert('Por favor complete todos los campos requeridos de los bloques');
      return;
    }

    const horarioData = {
      ...this.nuevoHorario,
      bloques: this.bloques.map((bloque, index) => ({
        ...bloque,
        orden: index + 1
      }))
    };

    if (this.selectedHorario && this.nuevoHorario.id) {
      this.horariosService.updateHorario(this.nuevoHorario.id, horarioData).subscribe({
        next: (response) => {
          this.loadHorarios();
          this.closeSalaSelector();
          console.log('Horario actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando horario:', error);
          alert('Error actualizando horario');
        }
      });
    } else {
      this.horariosService.createHorario(horarioData).subscribe({
        next: (response) => {
          this.loadHorarios();
          this.closeSalaSelector();
          console.log('Horario creado exitosamente');
        },
        error: (error) => {
          console.error('Error creando horario:', error);
          alert('Error creando horario');
        }
      });
    }
  }

  editHorario(horario: any): void {
    this.selectedHorario = horario;
    this.nuevoHorario = {
      id: horario.id,
      nombre: horario.nombre,
      sala_id: horario.sala_id
    };
    
    // Cargar bloques existentes
    this.bloques = horario.bloques ? [...horario.bloques] : [];
    this.cantidadBloques = this.bloques.length;
    
    this.showSalaModal = true;
  }

  deleteHorario(id: number | null): void {
    if (!id) return;
    
    this.horariosService.deleteHorario(id).subscribe({
      next: (response) => {
        this.horarios = this.horarios.filter(horario => horario.id !== id);
        console.log('Horario eliminado:', response);
      },
      error: (error) => {
        console.error('Error eliminando horario:', error);
        
        // Si es error 400 con relaciones, mostrar modal global
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el horario',
            message: error.error.message,
            entity: {
              id: error.error.horario?.id || id,
              nombre: error.error.horario?.nombre || 'Horario',
              tipo: 'Horario'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este horario, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          alert('Error eliminando horario: ' + (error.error?.message || error.message || 'Error desconocido'));
        }
      }
    });
  }

  getBloqueText(turno: string): string {
    const turnos: { [key: string]: string } = {
      'DIURNO': 'D',
      'NOCTURNO': 'N',
      'LIBRE': 'L'
    };
    return turnos[turno] || turno;
  }

  getBloqueBadgeClass(turno: string): string {
    const clases: { [key: string]: string } = {
      'DIURNO': 'badge-diurno',
      'NOCTURNO': 'badge-nocturno',
      'LIBRE': 'badge-libre'
    };
    return clases[turno] || 'badge-secondary';
  }
}