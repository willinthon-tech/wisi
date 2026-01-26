import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { HorariosService } from '../../../services/horarios.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { AreasService } from '../../../services/areas.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';
import { PlantillasHorariosService } from '../../../services/plantillas-horarios.service';

@Component({
  selector: 'app-horarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feriados-container">
      <div class="header">
        <button 
          class="btn btn-success" 
          [disabled]="!canAdd()"
          (click)="canAdd() ? openModal() : null">
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
              <th>Fecha (Día/Mes)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of feriados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ f?.nombre }}</td>
              <td>
                <span *ngIf="!f?.sala_id" class="badge badge-nacional">NACIONAL</span>
                <span *ngIf="f?.sala_id">{{ f?.Sala?.nombre || 'Sin asignar' }}</span>
              </td>
              <td>
                <span class="fecha-texto">
                  <strong>{{ f?.dia ? (f.dia < 10 ? '0'+f.dia : f.dia) : '00' }}</strong> / {{ getNombreMes(f?.mes) }}
                </span>
              </td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit() || !f?.sala_id"
                  [disabled]="!canEdit() || !f?.sala_id"
                  (click)="canEdit() && f?.sala_id ? editFeriado(f) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete() || !f?.sala_id"
                  [disabled]="!canDelete() || !f?.sala_id"
                  (click)="canDelete() && f?.sala_id ? deleteFeriado(f?.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="feriados.length === 0" class="no-data">
        <p>No hay feriados registrados</p>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedFeriado ? 'Editar Feriado' : 'Crear Nuevo Feriado' }}</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveFeriado()" #fForm="ngForm">
              <div class="form-group">
                <label for="nombreFeriado">Nombre del Feriado:</label>
                <input 
                  type="text" 
                  id="nombreFeriado" 
                  name="n"
                  [(ngModel)]="form.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del feriado"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="s"
                  [(ngModel)]="form.sala_id"
                  class="form-control"
                  required
                >
                  <option [ngValue]="null">Seleccione una sala</option>
                  <option *ngFor="let s of userSalas" [ngValue]="s.id">
                    {{ s.nombre }}
                  </option>
                </select>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Mes:</label>
                    <select name="m" [(ngModel)]="form.mes" class="form-control" required>
                      <option [ngValue]="null">Seleccione mes</option>
                      <option *ngFor="let m of meses" [ngValue]="m.id">{{ m.nombre }}</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Día:</label>
                    <input 
                      type="number" 
                      name="d"
                      [(ngModel)]="form.dia"
                      class="form-control"
                      min="1"
                      max="31"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!fForm.form.valid">
                  {{ selectedFeriado ? 'Actualizar Feriado' : 'Guardar Feriado' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feriados-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header { margin-bottom: 20px; }

    .header .btn {
      padding: 12px 24px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .header .btn-success { background: #28a745; color: white; }

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
      scrollbar-width: none;
    }

    .table-wrapper::-webkit-scrollbar { display: none; }

    .table { margin: 0; border: none; width: 100%; background: white; }

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

    .table tbody tr:hover { background-color: #f8f9fa; }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      margin: 2px;
      transition: all 0.2s ease;
    }

    .btn-info { background: #17a2b8; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-danger { background: #dc3545; color: white; }

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

    .badge-nacional {
      background-color: #0d6efd;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }

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

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }

    .modal-body { padding: 20px; }

    .form-group { margin-bottom: 20px; }

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

    .btn:disabled, .btn.disabled {
      opacity: 0.4;
      cursor: not-allowed !important;
      pointer-events: none;
    }

    .me-1 { margin-right: 0.25rem; }
    .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; padding-right: 15px; padding-left: 15px; }
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
  plantillasSala: any[] = [];

  private permissionsSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private horariosService: HorariosService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private areasService: AreasService,
    private router: Router,
    private route: ActivatedRoute,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService,
    private cdr: ChangeDetectorRef,
    private plantillasService: PlantillasHorariosService
  ) {}

  ngOnInit(): void {
    // Cargar módulos primero
    this.modulesService.loadModules();
    
    this.loadHorarios();
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(() => {
      // Los permisos se actualizan automáticamente
    });
  }

  isFormValid(): boolean {
    // En creación se requiere al menos 1 bloque; en edición se permite 0 bloques
    if (this.selectedHorario) {
      return !!(this.nuevoHorario.nombre && this.nuevoHorario.sala_id);
    }
    return !!(
      this.nuevoHorario.nombre &&
      this.nuevoHorario.sala_id &&
      this.bloques.length > 0 &&
      this.bloques.every(b => !!b.plantilla_horario_id)
    );
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  canAdd(): boolean {
    return this.permissionsService.canAddByName('Horarios');
  }

  canEdit(): boolean {
    return this.permissionsService.canEditByName('Horarios');
  }

  canDelete(): boolean {
    return this.permissionsService.canDeleteByName('Horarios');
  }

  loadHorarios(): void {
    this.horariosService.getHorarios().subscribe({
      next: (horarios) => {
        this.horarios = horarios;
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
    this.selectedHorario = null;
    this.resetForm();
  }

  loadUserSalas(): void {
    this.areasService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.userSalas = salas;
      },
      error: (error: any) => {
        
      }
    });
  }

  resetForm(): void {
    this.nuevoHorario = {
      id: null,
      nombre: '',
      sala_id: null
    };
    this.cantidadBloques = 0;
    this.bloques = [];
    this.plantillasSala = [];
  }

  onSalaChange(value: any): void {
    this.plantillasSala = [];
    this.cantidadBloques = 0;
    this.bloques = [];
    if (value) {
      // cargar plantillas por sala
      this.plantillasService.getPlantillasHorariosBySala(value).subscribe({
        next: (pls) => {
          this.plantillasSala = pls || [];
        },
        error: () => {}
      });
    }
  }

  onCantidadBloquesChange(): void {
    const cantidad = Math.max(0, this.cantidadBloques || 0);
    this.cantidadBloques = cantidad;
    // Ajustar array de bloques
    while (this.bloques.length < cantidad) {
      this.bloques.push({
        plantilla_horario_id: ''
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
    if (bloque.turno === 'LIBRE' || bloque.turno === 'PERMISO' || bloque.turno === 'SUSPENDIDO') {
      // Limpiar las horas cuando es libre, permiso o suspendido
      bloque.hora_entrada = '';
      bloque.hora_salida = '';
      bloque.hora_entrada_descanso = '';
      bloque.hora_salida_descanso = '';
      bloque.tiene_descanso = '';
    }
  }

  onDescansoChange(bloque: any): void {
    
    if (bloque.tiene_descanso !== 'true') {
      // Limpiar las horas de descanso cuando se desactiva
      
      bloque.hora_entrada_descanso = '';
      bloque.hora_salida_descanso = '';
    } else {
      
    }
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // Función helper para verificar si los campos de descanso deben estar deshabilitados
  isDescansoDisabled(bloque: any): boolean {
    const isDisabled = bloque.turno === 'LIBRE' || bloque.turno === 'PERMISO' || bloque.turno === 'SUSPENDIDO' || bloque.tiene_descanso !== 'true';
    
    return isDisabled;
  }


  createHorario(): void {
    if (!this.isFormValid()) {
      return;
    }

    const horarioData = {
      ...this.nuevoHorario,
      bloques: this.bloques.map((bloque, index) => ({
        plantilla_horario_id: bloque.plantilla_horario_id,
        orden: index + 1
      }))
    };

    if (this.selectedHorario && this.nuevoHorario.id) {
      this.horariosService.updateHorario(this.nuevoHorario.id, horarioData).subscribe({
        next: () => {
          this.loadHorarios();
          this.closeSalaSelector();
        },
        error: () => {}
      });
    } else {
      this.horariosService.createHorario(horarioData).subscribe({
        next: () => {
          this.loadHorarios();
          this.closeSalaSelector();
        },
        error: () => {}
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
    this.onSalaChange(this.nuevoHorario.sala_id);
    // Convertir bloques existentes al nuevo formato
    this.bloques = (horario.bloques || []).map((b: any) => ({
      plantilla_horario_id: b.plantilla_horario_id
    }));
    this.cantidadBloques = this.bloques.length;
    this.showSalaModal = true;
  }

  deleteHorario(id: number | null): void {
    if (!id) return;
    
    

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este horario?',
      entity: {
        id: id,
        nombre: 'Horario',
        tipo: 'Horario'
      },
      warningText: 'Esta acción eliminará permanentemente el horario y todos sus bloques.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionHorario(id);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionHorario(id: number) {
    
    
    this.horariosService.deleteHorario(id).subscribe({
      next: (response) => {
        
        this.horarios = this.horarios.filter(horario => horario.id !== id);
        
      },
      error: (error: any) => {
        // Extraer información del error de forma robusta
        const errorStatus = error?.status || error?.statusCode || 500;
        const errorBody = error?.error || error?.body || {};
        const errorMessage = errorBody?.message || error?.message || '';
        const relations = errorBody?.relations || [];
        const horarioInfo = errorBody?.horario || {};
        
        // Si es error 400, SIEMPRE mostrar modal
        if (errorStatus === 400) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el horario',
            message: errorMessage || 'No se puede eliminar el horario porque tiene elementos asociados.',
            entity: {
              id: horarioInfo.id || id,
              nombre: horarioInfo.nombre || 'Horario',
              tipo: 'Horario'
            },
            relations: Array.isArray(relations) ? relations : [],
            helpText: relations.length > 0 
              ? 'Para eliminar este horario, primero debe eliminar todos los elementos asociados listados arriba.'
              : 'Para eliminar este horario, primero debe eliminar todos los elementos asociados.'
          });
        } else if (errorStatus === 500) {
          // Si es error 500, es probable que sea por relaciones (foreign key constraint)
          // Buscar el horario en la lista local para obtener su nombre
          const horarioLocal = this.horarios.find(h => h.id === id);
          
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el horario',
            message: errorMessage || 'No se puede eliminar el horario porque tiene elementos asociados.',
            entity: {
              id: id,
              nombre: horarioLocal?.nombre || horarioInfo?.nombre || 'Horario',
              tipo: 'Horario'
            },
            relations: Array.isArray(relations) && relations.length > 0 ? relations : [
              { table_name: 'Elementos asociados', count: 'Tiene registros relacionados' }
            ],
            helpText: 'Para eliminar este horario, primero debe eliminar todos los elementos asociados.'
          });
        }
      }
    });
  }

  getBloqueText(turno: string): string {
    const turnos: { [key: string]: string } = {
      'DIURNO': 'D',
      'NOCTURNO': 'N',
      'LIBRE': 'L',
      'PERMISO': 'P',
      'SUSPENDIDO': 'S'
    };
    return turnos[turno] || turno;
  }

  getBloqueBadgeClass(turno: string): string {
    if (!turno) return 'badge-secondary';
    const clases: { [key: string]: string } = {
      'DIURNO': 'badge-diurno',
      'NOCTURNO': 'badge-nocturno',
      'LIBRE': 'badge-libre',
      'PERMISO': 'badge-permiso',
      'SUSPENDIDO': 'badge-suspendido'
    };
    return clases[turno] || 'badge-secondary';
  }

  getBloquesOrdenados(bloques: any[]): any[] {
    if (!bloques || !Array.isArray(bloques)) {
      return [];
    }
    return [...bloques].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  getContrastColor(hexColor: string): string {
    if (!hexColor || hexColor === '#ffffff') return '#000000';
    // Convertir hex a RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // Calcular luminosidad relativa
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Si es claro, usar texto negro; si es oscuro, usar texto blanco
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}