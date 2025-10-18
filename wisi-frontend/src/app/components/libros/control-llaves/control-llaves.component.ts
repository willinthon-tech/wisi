import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { EmpleadosService } from '../../../services/empleados.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
import { LlavesService } from '../../../services/llaves.service';
import { ControlLlavesRegistrosService } from '../../../services/control-llaves-registros.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

interface ControlLlaveRegistro {
  id?: number;
  libro_id: number;
  llave_id: number;
  empleado_id: number;
  hora: string;
  created_at?: string;
  updated_at?: string;
  Llave?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
  Empleado?: {
    id: number;
    nombre: string;
    cedula: string;
  };
}

interface Llave {
  id: number;
  nombre: string;
  Sala?: {
    id: number;
    nombre: string;
  };
}

interface ControlData {
  hora: string;
}

interface Sala {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-control-llaves',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="control-llaves-container" *ngIf="hasAccess">
      <!-- Sección de Llaves (Mitad superior) -->
      <div class="llaves-section">
        <div class="llaves-header">
          <h3>Seleccionar Llaves</h3>
          <div class="llaves-controls">
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="selectAllLlaves()">
              Seleccionar Todas
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="deselectAllLlaves()">
              Deseleccionar Todas
            </button>
            <span class="selected-count">{{ selectedLlaveIds.length }} seleccionadas</span>
          </div>
        </div>
        <div class="llaves-grid-container">
          <div class="llaves-grid">
            <div class="llave-grid-item" *ngFor="let llave of llaves">
              <label class="llave-grid-label">
                <input 
                  type="checkbox" 
                  [value]="llave.id"
                  (change)="toggleLlave(llave.id, $event)"
                  [checked]="selectedLlaveIds.includes(llave.id)">
                <div class="llave-grid-info">
                  <div class="llave-nombre">{{ llave.nombre }}</div>
                  <div class="llave-details">{{ llave.Sala?.nombre }}</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenido principal (Mitad inferior) -->
      <div class="content-wrapper">
        <!-- Formulario de Control (Lado Izquierdo) -->
        <div class="form-section">
          <h3>Control de Llaves</h3>
          <form (ngSubmit)="saveControl()" #controlForm="ngForm">
            <div class="form-group">
              <label for="empleadoInput">Empleado:</label>
              <input 
                type="text" 
                id="empleadoInput" 
                name="empleadoInput"
                [(ngModel)]="empleadoSearchText"
                (input)="onEmpleadoSearch($event)"
                (focus)="onEmpleadoFocus()"
                (blur)="onEmpleadoBlur()"
                class="form-control"
                placeholder="Escribir para buscar empleado..."
                list="empleadosList"
                required
              >
              <datalist id="empleadosList">
                <option *ngFor="let empleado of empleados" [value]="empleado.nombre" [attr.data-id]="empleado.id">
                  {{ empleado.nombre }} - {{ empleado.cedula }}
                </option>
              </datalist>
              <input type="hidden" [(ngModel)]="selectedEmpleadoId" name="empleado_id">
            </div>

            <div class="form-group">
              <label for="horaInput">Hora:</label>
              <input 
                type="time" 
                id="horaInput" 
                name="horaInput"
                [(ngModel)]="controlData.hora"
                class="form-control"
                required
              />
            </div>

            <button type="submit" class="btn btn-success" [disabled]="selectedLlaveIds.length === 0 || !isEmpleadoValid() || !controlData.hora">
              Guardar ({{ selectedLlaveIds.length }} llaves)
            </button>
          </form>
        </div>

        <!-- Tabla de Controles (Lado Derecho) -->
        <div class="table-section">
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr class="sala-header">
                  <th colspan="5" class="sala-title">{{ getSalaName() }} - {{ getLibroFecha() }}</th>
                </tr>
                <tr>
                  <th class="text-center">N°</th>
                  <th class="text-left">Llave</th>
                  <th class="text-center">Empleado</th>
                  <th class="text-center">Hora</th>
                  <th class="text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let evento of controlesAgrupados; let i = index">
                  <td class="text-center">{{ i + 1 }}</td>
                  <td class="text-left">
                    <span *ngIf="!evento.esLote">{{ evento.llaves[0]?.nombre }}</span>
                    <span *ngIf="evento.esLote" class="evento-lote">
                      <button class="btn btn-info btn-sm" (click)="mostrarLlavesAfectadas(evento)">
                        ({{ evento.llaves.length }}) Ver Llaves
                      </button>
                    </span>
                  </td>
                  <td class="text-center">{{ evento.empleado?.nombre }}</td>
                  <td class="text-center">{{ evento.hora }}</td>
                  <td class="text-center">
                    <button class="btn btn-danger btn-sm" (click)="deleteControl(evento)">
                      Eliminar
                    </button>
                  </td>
                </tr>
                <tr *ngIf="controlesAgrupados.length === 0">
                  <td colspan="5" class="no-data">No hay controles registrados</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para mostrar llaves afectadas -->
    <div class="modal-overlay" *ngIf="showLlavesModal" (click)="cerrarModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h4>Llaves Afectadas</h4>
          <button class="btn-close" (click)="cerrarModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="evento-info mb-3">
            <strong>Empleado:</strong> {{ eventoSeleccionado?.empleado?.nombre }}<br>
            <strong>Hora:</strong> {{ eventoSeleccionado?.hora }}
          </div>
          <div class="llaves-list">
            <div class="llave-item" *ngFor="let llave of llavesAfectadas">
              <span class="llave-nombre">{{ llave?.nombre }}</span>
              <span class="llave-sala">{{ llave?.Sala?.nombre }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="cerrarModal()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .control-llaves-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 60px);
      background: #f5f5f5;
      overflow: hidden;
      padding-bottom: 20px;
    }

    /* Ocultar todos los scrollbars en este componente */
    .control-llaves-container * {
      scrollbar-width: none !important; /* Firefox */
      -ms-overflow-style: none !important; /* Internet Explorer 10+ */
    }

    .control-llaves-container *::-webkit-scrollbar {
      display: none !important; /* Chrome, Safari, Edge */
    }

    .llaves-section {
      height: 30vh;
      background: white;
      border-bottom: 2px solid #e9ecef;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding-bottom: 10px;
    }

    .llaves-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .llaves-header h3 {
      margin: 0;
      color: #333;
    }

    .llaves-controls {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
      border: 1px solid;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-outline-primary {
      background: transparent;
      color: #007bff;
      border-color: #007bff;
    }

    .btn-outline-primary:hover {
      background: #007bff;
      color: white;
    }

    .btn-outline-secondary {
      background: transparent;
      color: #6c757d;
      border-color: #6c757d;
    }

    .btn-outline-secondary:hover {
      background: #6c757d;
      color: white;
    }

    .selected-count {
      font-weight: bold;
      color: #007bff;
      background: #e7f3ff;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 14px;
    }

    .llaves-grid-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .llaves-grid-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .llaves-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 6px;
      max-height: 100%;
    }

    .llave-grid-item {
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: #f8f9fa;
      transition: all 0.2s ease;
    }

    .llave-grid-item:hover {
      background: #e9ecef;
      border-color: #007bff;
    }

    .llave-grid-label {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      cursor: pointer;
      margin: 0;
      height: 100%;
    }

    .llave-grid-label input[type="checkbox"] {
      margin-right: 10px;
      transform: scale(1.1);
    }

    .llave-grid-info {
      flex: 1;
      min-width: 0;
    }

    .llave-nombre {
      font-weight: bold;
      color: #333;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .llave-details {
      font-size: 12px;
      color: #666;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .content-wrapper {
      display: flex;
      gap: 20px;
      padding: 20px;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    .form-section {
      flex: 0 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow-y: auto;
      height: fit-content;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .form-section::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .table-section {
      flex: 1.5;
      background: transparent;
      padding: 0;
      min-height: 0;
      overflow: hidden;
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
    }

    .btn-success {
      background: #28a745;
      color: white;
      width: 100%;
    }

    .btn-success:hover {
      background: #218838;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
      font-size: 12px;
      padding: 4px 8px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .btn-info:hover {
      background: #138496;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .data-table th {
      background: #343a40;
      color: white;
      font-weight: bold;
      padding: 12px;
      text-align: center;
    }

    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
      text-align: center;
    }

    .data-table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .sala-header {
      background: #007bff !important;
      color: white !important;
    }

    .sala-title {
      text-align: center;
      font-weight: bold;
      font-size: 16px;
    }

    .text-center {
      text-align: center;
    }

    .text-left {
      text-align: left;
    }

    .evento-lote {
      font-style: italic;
      color: #666;
    }

    .no-data {
      text-align: center;
      color: #666;
      padding: 20px;
      font-style: italic;
    }

    .form-section, .list-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
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

    .modal-header h4 {
      margin: 0;
      color: #333;
    }

    .btn-close {
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

    .btn-close:hover {
      color: #dc3545;
    }

    .modal-body {
      padding: 20px;
    }

    .evento-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .evento-info strong {
      color: #333;
    }

    .llaves-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .llave-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      margin-bottom: 8px;
      background: #f8f9fa;
    }

    .llave-nombre {
      font-weight: 600;
      color: #333;
    }

    .llave-sala {
      font-size: 12px;
      color: #666;
      background: #e9ecef;
      padding: 4px 8px;
      border-radius: 4px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }
  `]
})
export class ControlLlavesComponent implements OnInit, OnDestroy {
  controles: ControlLlaveRegistro[] = [];
  controlesAgrupados: any[] = [];
  empleados: any[] = [];
  llaves: Llave[] = [];
  selectedEmpleadoId: number | null = null;
  selectedLlaveIds: number[] = [];
  
  // Propiedades para el input de empleado
  empleadoSearchText: string = '';
  empleadoSelected: any = null;
  controlData: ControlData = {
    hora: this.getCurrentTime()
  };
  libroId: number | null = null;
  salaId: number | null = null;
  salaName: string = 'Sala';
  hasAccess: boolean = false;
  libro: any = null;
  
  // Modal para mostrar llaves afectadas
  showLlavesModal = false;
  llavesAfectadas: any[] = [];
  eventoSeleccionado: any = null;
  
  private readonly LIBRO_MODULE_ID = 5; // ID del módulo Libro (CECOM)
  private permissionsSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private empleadosService: EmpleadosService,
    private permissionsService: PermissionsService,
    private libroService: LibroService,
    private llavesService: LlavesService,
    private controlLlavesRegistrosService: ControlLlavesRegistrosService,
    private route: ActivatedRoute,
    private router: Router,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.libroId = +params['libroId'];
      this.salaId = +params['salaId'];
      this.loadData();
    });

    this.checkPermissions();
  }

  ngOnDestroy() {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  private checkPermissions() {
    this.permissionsSubscription = this.permissionsService.getUserPermissions().subscribe((permissions: any) => {
      this.hasAccess = this.permissionsService.canView(this.LIBRO_MODULE_ID);
    });
  }

  private loadData() {
    if (this.libroId && this.salaId) {
      this.loadLibro();
      this.loadEmpleados();
      this.loadLlaves();
      this.loadControles();
      this.loadSalaName();
    }
  }

  loadLibro() {
    if (!this.libroId) return;
    
    this.libroService.getLibro(this.libroId!).subscribe({
      next: (libro: any) => {
        this.libro = libro;
      },
      error: (error: any) => {
        
      }
    });
  }

  loadEmpleados() {
    if (!this.salaId) return;
    this.empleadosService.getEmpleadosBySala(this.salaId).subscribe({
      next: (empleados: any) => {
        this.empleados = empleados;
      },
      error: (error: any) => {
        
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar los empleados'
        });
      }
    });
  }

  loadLlaves() {
    if (!this.salaId) return;

    this.llavesService.getLlaves().subscribe({
      next: (llaves: any) => {
        // Filtrar llaves por sala y que estén activas
        this.llaves = llaves.filter((llave: any) => 
          llave.sala_id === this.salaId && llave.activo === 1
        );
        
      },
      error: (error: any) => {
        
        this.llaves = [];
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las llaves'
        });
      }
    });
  }

  loadControles() {
    if (!this.libroId) return;
    
    this.controlLlavesRegistrosService.getControlLlaveRegistros(this.libroId).subscribe({
      next: (controles: ControlLlaveRegistro[]) => {
        this.controles = controles;
        this.agruparControles();
      },
      error: (error: any) => {
        
        this.controles = [];
        this.controlesAgrupados = [];
      }
    });
  }

  loadSalaName() {
    if (!this.salaId) return;
    
    this.userService.getUserSalas().subscribe({
      next: (salas: any) => {
        const sala = salas.find((s: any) => s.id === this.salaId);
        if (sala) {
          this.salaName = sala.nombre;
        }
      },
      error: (error: any) => {
        
        this.salaName = 'Sala';
      }
    });
  }

  toggleLlave(llaveId: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedLlaveIds.includes(llaveId)) {
        this.selectedLlaveIds.push(llaveId);
      }
    } else {
      this.selectedLlaveIds = this.selectedLlaveIds.filter(id => id !== llaveId);
    }
  }

  selectAllLlaves() {
    this.selectedLlaveIds = this.llaves.map(llave => llave.id);
  }

  deselectAllLlaves() {
    this.selectedLlaveIds = [];
  }

  saveControl() {
    if (this.selectedLlaveIds.length === 0 || !this.selectedEmpleadoId || !this.controlData.hora) {
      return;
    }

    if (!this.libroId) {
      return;
    }

    // Procesar cada llave seleccionada individualmente
    let completed = 0;
    let errors = 0;

    this.selectedLlaveIds.forEach((llaveId, index) => {
      const controlData = {
        libro_id: this.libroId!,
        llave_id: llaveId,
        empleado_id: this.selectedEmpleadoId!,
        hora: this.controlData.hora
      };

      this.controlLlavesRegistrosService.createControlLlaveRegistro(controlData).subscribe({
        next: (control: ControlLlaveRegistro) => {
          completed++;
          
          // Si es la última llave, recargar y resetear
          if (completed + errors === this.selectedLlaveIds.length) {
            this.loadControles();
            this.resetForm();
          }
        },
        error: (error: any) => {
          errors++;
          
          
          // Si es la última llave, recargar y resetear
          if (completed + errors === this.selectedLlaveIds.length) {
            this.loadControles();
            this.resetForm();
          }
        }
      });
    });
  }

  agruparControles() {
    // Agrupar controles por empleado, hora y llaves
    const grupos = new Map();
    
    this.controles.forEach(control => {
      const key = `${control.empleado_id}-${control.hora}`;
      
      if (!grupos.has(key)) {
        grupos.set(key, {
          empleado: control.Empleado,
          hora: control.hora,
          llaves: [],
          ids: [],
          esLote: false
        });
      }
      
      const grupo = grupos.get(key);
      grupo.llaves.push(control.Llave);
      grupo.ids.push(control.id);
    });
    
    // Convertir a array y marcar lotes
    this.controlesAgrupados = Array.from(grupos.values()).map(grupo => ({
      ...grupo,
      esLote: grupo.llaves.length > 1
    }));
  }

  deleteControl(evento: any) {
    const controlIds = evento.ids;
    
    // Eliminar directamente sin modales
    controlIds.forEach((controlId: number) => {
      this.controlLlavesRegistrosService.deleteControlLlaveRegistro(controlId).subscribe({
        next: () => {
          // Solo recargar la lista sin mostrar modales
          this.loadControles();
        },
        error: (error: any) => {
          
          // Solo recargar la lista sin mostrar modales
          this.loadControles();
        }
      });
    });
  }

  resetForm() {
    this.selectedEmpleadoId = null;
    this.selectedLlaveIds = [];
    this.controlData.hora = this.getCurrentTime();
    this.empleadoSearchText = '';
    this.empleadoSelected = null;
  }

  // Métodos para el input de empleado
  onEmpleadoSearch(event: any) {
    const searchText = event.target.value;
    this.empleadoSearchText = searchText;
    
    // Buscar empleado por nombre exacto (no parcial)
    const empleado = this.empleados.find(emp => 
      emp.nombre.toLowerCase() === searchText.toLowerCase()
    );
    
    if (empleado) {
      this.selectedEmpleadoId = empleado.id;
      this.empleadoSelected = empleado;
      
    } else {
      this.selectedEmpleadoId = null;
      this.empleadoSelected = null;
      
    }
  }

  onEmpleadoFocus() {
    // Opcional: cargar todos los empleados si no están cargados
  }

  onEmpleadoBlur() {
    // Validar que el empleado seleccionado sea válido
    if (this.empleadoSearchText && !this.empleadoSelected) {
      // Si hay texto pero no se encontró empleado, limpiar
      
      this.empleadoSearchText = '';
      this.selectedEmpleadoId = null;
    }
    
    // Verificar que el empleado esté realmente seleccionado
    if (this.empleadoSearchText && this.empleadoSelected) {
      const empleadoValido = this.empleados.find(emp => 
        emp.nombre.toLowerCase() === this.empleadoSearchText.toLowerCase()
      );
      
      if (!empleadoValido) {
        
        this.empleadoSearchText = '';
        this.selectedEmpleadoId = null;
        this.empleadoSelected = null;
      }
    }
  }

  // Método para verificar si el empleado está válidamente seleccionado
  isEmpleadoValid(): boolean {
    if (!this.empleadoSearchText || !this.empleadoSelected) {
      return false;
    }
    
    const empleadoValido = this.empleados.find(emp => 
      emp.nombre.toLowerCase() === this.empleadoSearchText.toLowerCase()
    );
    
    return empleadoValido !== undefined;
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getSalaName(): string {
    // Usar la salaName que ya se cargó en ngOnInit
    return this.salaName || 'Sala';
  }

  goBack() {
    this.router.navigate(['/libros']);
  }

  mostrarLlavesAfectadas(evento: any) {
    this.eventoSeleccionado = evento;
    this.llavesAfectadas = evento.llaves;
    this.showLlavesModal = true;
  }

  cerrarModal() {
    this.showLlavesModal = false;
    this.llavesAfectadas = [];
    this.eventoSeleccionado = null;
  }

  getLibroFecha(): string {
    if (this.libro && this.libro.created_at) {
      return new Date(this.libro.created_at).toLocaleDateString('es-ES');
    }
    return 'Fecha no disponible';
  }
}