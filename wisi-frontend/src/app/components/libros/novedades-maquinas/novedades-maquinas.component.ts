import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NovedadesMaquinasRegistrosService } from '../../../services/novedades-maquinas-registros.service';
import { MaquinasService } from '../../../services/maquinas.service';
import { EmpleadosService, Empleado } from '../../../services/empleados.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

interface NovedadMaquinaRegistro {
  id?: number;
  libro_id: number;
  maquina_id: number;
  descripcion: string;
  empleado_id: number;
  hora: string;
  Maquina?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
  Empleado?: Empleado;
}

interface Maquina {
  id: number;
  nombre: string;
  Sala?: {
    id: number;
    nombre: string;
  };
  Rango?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
}



interface Sala {
  id: number;
  nombre: string;
}

interface NovedadData {
  hora: string;
  descripcion: string;
}

@Component({
  selector: 'app-novedades-maquinas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="novedades-container" *ngIf="hasAccess">
      <!-- Sección de Máquinas (Mitad superior) -->
      <div class="maquinas-section">
        <div class="maquinas-header">
          <h3>Seleccionar Máquinas</h3>
          <div class="maquinas-controls">
            <button type="button" class="btn btn-sm btn-outline-primary" (click)="selectAllMaquinas()">
              Seleccionar Todas
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="deselectAllMaquinas()">
              Deseleccionar Todas
            </button>
            <span class="selected-count">{{ selectedMaquinaIds.length }} seleccionadas</span>
          </div>
        </div>
        <div class="maquinas-grid-container">
          <div class="maquinas-grid">
            <div class="maquina-grid-item" *ngFor="let maquina of maquinas">
              <label class="maquina-grid-label">
                <input 
                  type="checkbox" 
                  [value]="maquina.id"
                  (change)="toggleMaquina(maquina.id, $event)"
                  [checked]="selectedMaquinaIds.includes(maquina.id)">
                <div class="maquina-grid-info" [title]="maquina.Sala?.nombre || maquina.Rango?.Sala?.nombre">
                  <div class="maquina-nombre">{{ maquina.nombre.replace('Máquina ', '') }}</div>
                  <div class="maquina-details">{{ maquina.Rango?.nombre }}</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Contenido principal (Mitad inferior) -->
      <div class="content-wrapper">
        <!-- Formulario de Novedades (Lado Izquierdo) -->
        <div class="form-section">
          <h3>Novedades de Máquinas</h3>
          <form (ngSubmit)="saveNovedad()" #novedadForm="ngForm">
            <div class="form-group">
              <label for="descripcionInput">Descripción de la novedad:</label>
              <textarea 
                id="descripcionInput" 
                name="descripcionInput"
                [(ngModel)]="novedadData.descripcion"
                class="form-control"
                rows="3"
                placeholder="Ingrese la descripción de la novedad..."
                required
              ></textarea>
            </div>

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
                [(ngModel)]="novedadData.hora"
                class="form-control"
                required
              />
            </div>

            <button type="submit" class="btn btn-success" [disabled]="selectedMaquinaIds.length === 0 || !novedadData.descripcion || !isEmpleadoValid() || !novedadData.hora">
              Guardar ({{ selectedMaquinaIds.length }} máquinas)
            </button>
          </form>
        </div>

        <!-- Tabla de Novedades (Lado Derecho) -->
        <div class="table-section">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr class="sala-header">
                <th colspan="6" class="sala-title">{{ getSalaName() }} - {{ getLibroFecha() }}</th>
              </tr>
              <tr>
                <th class="text-center">N°</th>
                <th class="text-left">Máquina</th>
                <th class="text-center">Empleado</th>
                <th class="text-center">Novedad</th>
                <th class="text-center">Hora</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evento of novedadesAgrupadas; let i = index">
                <td class="text-center">{{ i + 1 }}</td>
                <td class="text-left">
                  <span *ngIf="!evento.esLote">{{ evento.maquinas[0]?.nombre }}</span>
                  <span *ngIf="evento.esLote" class="evento-lote">
                    <button class="btn btn-info btn-sm" (click)="mostrarMaquinasAfectadas(evento)">
                      ({{ evento.maquinas.length }}) Ver Máquinas
                    </button>
                  </span>
                </td>
                <td class="text-center">{{ evento.empleado?.nombre }}</td>
                <td class="text-center">{{ evento.descripcion }}</td>
                <td class="text-center">{{ evento.hora }}</td>
                <td class="text-center">
                  <button class="btn btn-danger btn-sm" (click)="deleteNovedad(evento)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr *ngIf="novedadesAgrupadas.length === 0">
                <td colspan="6" class="no-data">No hay novedades registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <ng-template #noAccess>
      <div class="no-access-container">
        <div class="no-access-content">
          <div class="access-icon">🚫</div>
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a Novedades de Máquinas.</p>
          <p>Contacta al administrador para obtener los permisos necesarios.</p>
          <button class="btn-back" (click)="goBack()">
            ← Volver al Dashboard
          </button>
        </div>
      </div>

      <!-- Mensaje de no acceso -->
      <div class="no-access" *ngIf="!hasAccess">
        <div class="no-access-content">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a Novedades de Máquinas.</p>
          <p>Contacta al administrador para obtener los permisos necesarios.</p>
          <button class="btn-back" (click)="goBack()">
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </ng-template>

    <!-- Modal para mostrar máquinas afectadas -->
    <div class="modal-overlay" *ngIf="showMaquinasModal" (click)="cerrarModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h4>Máquinas Afectadas</h4>
          <button class="btn-close" (click)="cerrarModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="evento-info mb-3">
            <strong>Descripción:</strong> {{ eventoSeleccionado?.descripcion }}<br>
            <strong>Empleado:</strong> {{ eventoSeleccionado?.empleado?.nombre }}<br>
            <strong>Hora:</strong> {{ eventoSeleccionado?.hora }}
          </div>
          <div class="maquinas-list">
            <div class="maquina-item" *ngFor="let maquina of maquinasAfectadas">
              <span class="maquina-numero">{{ maquina?.nombre }}</span>
              <span class="maquina-rango">{{ maquina?.Rango?.nombre }}</span>
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
    .novedades-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 60px);
      background: #f5f5f5;
      overflow: hidden;
      padding-bottom: 20px;
    }

    /* Ocultar todos los scrollbars en este componente */
    .novedades-container * {
      scrollbar-width: none !important; /* Firefox */
      -ms-overflow-style: none !important; /* Internet Explorer 10+ */
    }

    .novedades-container *::-webkit-scrollbar {
      display: none !important; /* Chrome, Safari, Edge */
    }

    .maquinas-section {
      height: 30vh;
      background: white;
      border-bottom: 2px solid #e9ecef;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      padding-bottom: 10px;
    }

    .maquinas-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      background: #f8f9fa;
      border-bottom: 1px solid #dee2e6;
    }

    .maquinas-header h3 {
      margin: 0;
      color: #333;
    }

    .maquinas-controls {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .selected-count {
      font-weight: bold;
      color: #007bff;
      background: #e7f3ff;
      padding: 5px 10px;
      border-radius: 15px;
      font-size: 14px;
    }

    .maquinas-grid-container {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .maquinas-grid-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .maquinas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 6px;
      max-height: 100%;
    }

    .maquina-grid-item {
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: #f8f9fa;
      transition: all 0.2s ease;
    }

    .maquina-grid-item:hover {
      background: #e9ecef;
      border-color: #007bff;
    }

    .maquina-grid-label {
      display: flex;
      align-items: center;
      padding: 6px 8px;
      cursor: pointer;
      margin: 0;
      height: 100%;
    }

    .maquina-grid-label input[type="checkbox"] {
      margin-right: 10px;
      transform: scale(1.1);
    }

    .maquina-grid-info {
      flex: 1;
      min-width: 0;
    }

    .maquina-nombre {
      font-weight: bold;
      color: #333;
      font-size: 14px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .maquina-details {
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
      border: none;
    }

    .data-table td {
      padding: 15px 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
      background: white;
    }

    .data-table tbody tr:hover {
      background: #f8f9fa;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .no-data {
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .table-container {
      height: 100%;
      overflow-y: auto;
      min-height: 0;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .table-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    h3 {
      margin-top: 0;
      color: #333;
      border-bottom: 2px solid #007bff;
      padding-bottom: 10px;
    }

    .text-left {
      text-align: left !important;
    }

    .text-center {
      text-align: center;
    }

    .text-right {
      text-align: right !important;
    }

    .sala-header {
      background: #6c757d !important;
    }

    .sala-title {
      color: white !important;
      font-weight: bold;
      font-size: 18px;
      text-align: center;
      padding: 15px;
      border: none !important;
      background: #6c757d !important;
    }

    .no-access-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .no-access-content {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
    }

    .access-icon {
      font-size: 80px;
      margin-bottom: 30px;
    }

    .no-access-content h1 {
      color: #333;
      font-size: 32px;
      margin: 0 0 20px 0;
      font-weight: 700;
    }

    .no-access-content p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 15px 0;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      margin-top: 30px;
      font-size: 16px;
    }

    .btn-back:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    /* Estilos para eventos en lote */
    .evento-lote {
      color: #007bff;
      font-weight: bold;
    }

    /* Estilos del modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
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
      color: #000;
    }

    .modal-body {
      padding: 20px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .evento-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
    }

    .maquinas-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }

    .maquina-item {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
    }

    .maquina-numero {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }

    .maquina-rango {
      color: #666;
      font-size: 12px;
      margin-top: 2px;
    }

    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
      text-align: right;
    }
  `]
})
export class NovedadesMaquinasComponent implements OnInit, OnDestroy {
  novedades: NovedadMaquinaRegistro[] = [];
  novedadesAgrupadas: any[] = [];
  maquinas: Maquina[] = [];
  empleados: Empleado[] = [];
  userSalas: Sala[] = [];
  
  selectedMaquinaIds: number[] = [];
  selectedEmpleadoId: number | null = null;
  
  // Propiedades para el input de empleado
  empleadoSearchText: string = '';
  empleadoSelected: any = null;
  
  // Modal para mostrar máquinas afectadas
  showMaquinasModal = false;
  maquinasAfectadas: any[] = [];
  eventoSeleccionado: any = null;
  
  libroId: number | null = null;
  salaId: number | null = null;
  hasAccess: boolean = false;
  libro: any = null;
  
  novedadData: NovedadData = {
    hora: this.getCurrentTime(),
    descripcion: ''
  };

  private readonly NOVEDADES_MAQUINAS_MODULE_ID = 16; // ID del módulo Gestion de Novedades de Maquinas
  private permissionsSubscription?: Subscription;

  constructor(
    private novedadesRegistrosService: NovedadesMaquinasRegistrosService,
    private maquinasService: MaquinasService,
    private empleadosService: EmpleadosService,
    private userService: UserService,
    private route: ActivatedRoute,
    private permissionsService: PermissionsService,
    private router: Router,
    private libroService: LibroService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) { }

  ngOnInit() {
    // Verificar permisos primero
    this.checkPermissions();

    // Obtener el ID del libro y sala desde la ruta
    this.route.params.subscribe(params => {
      this.libroId = +params['libroId'];
      this.salaId = +params['salaId'];
      
      // Cargar información del libro
      if (this.libroId) {
        this.loadLibro();
      }
    });
    
    // Cargar primero las salas del usuario, luego los demás datos
    this.loadUserSalas();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  private checkPermissions(): void {
    // Novedades de Máquinas es una operación funcional, no CRUD - siempre permitir acceso
    this.hasAccess = true;
  }

  loadUserSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: Sala[]) => {
        this.userSalas = salas;
        // Una vez cargadas las salas, cargar los demás datos
        this.loadNovedades();
        this.loadMaquinas();
        this.loadEmpleados();
      },
      error: (error: any) => {
      }
    });
  }

  loadNovedades() {
    if (!this.libroId) {
      return;
    }
    
    this.novedadesRegistrosService.getNovedadesMaquinasRegistros(this.libroId).subscribe({
      next: (novedades: NovedadMaquinaRegistro[]) => {
        // Ordenar por hora de menor a mayor
        this.novedades = novedades.sort((a, b) => {
          if (a.hora < b.hora) return -1;
          if (a.hora > b.hora) return 1;
          return 0;
        });
        
        // Agrupar novedades por [Empleado, Novedad, Hora]
        this.novedadesAgrupadas = this.agruparNovedades(this.novedades);
      },
      error: (error: any) => {
      }
    });
  }

  loadMaquinas() {
    this.maquinasService.getMaquinas().subscribe({
      next: (maquinas: Maquina[]) => {
        
        // Filtrar máquinas por la sala específica de la ruta
        // Las máquinas pueden tener la sala directamente o a través del Rango
        this.maquinas = maquinas.filter(maquina => {
          // Verificar si la máquina tiene sala directa
          if (maquina.Sala && maquina.Sala.id === this.salaId) {
            return true;
          }
          // Verificar si la máquina tiene sala a través del Rango
          if (maquina.Rango && maquina.Rango.Sala && maquina.Rango.Sala.id === this.salaId) {
            return true;
          }
          return false;
        });
        
      },
      error: (error: any) => {
      }
    });
  }


  loadEmpleados() {
    // Obtener empleados de la sala del libro actual
    const libroId = this.route.snapshot.params['libroId'];
    if (libroId) {
      this.libroService.getLibro(libroId).subscribe({
        next: (libro) => {
          if (libro.sala_id) {
            this.empleadosService.getEmpleadosBySala(libro.sala_id).subscribe({
              next: (empleados: Empleado[]) => {
                this.empleados = empleados;
              },
              error: (error: any) => {
              }
            });
          }
        },
        error: (error: any) => {
        }
      });
    }
  }

  toggleMaquina(maquinaId: number, event: any) {
    if (event.target.checked) {
      if (!this.selectedMaquinaIds.includes(maquinaId)) {
        this.selectedMaquinaIds.push(maquinaId);
      }
    } else {
      this.selectedMaquinaIds = this.selectedMaquinaIds.filter(id => id !== maquinaId);
    }
  }

  selectAllMaquinas() {
    this.selectedMaquinaIds = this.maquinas.map(maquina => maquina.id);
  }

  deselectAllMaquinas() {
    this.selectedMaquinaIds = [];
  }

  saveNovedad() {

    if (this.selectedMaquinaIds.length === 0) {
      return;
    }

    if (!this.novedadData.descripcion) {
      return;
    }

    if (!this.selectedEmpleadoId) {
      return;
    }

    if (!this.novedadData.hora) {
      return;
    }

    if (!this.libroId) {
      return;
    }

    // Procesar cada máquina seleccionada individualmente
    let completed = 0;
    let errors = 0;

    this.selectedMaquinaIds.forEach((maquinaId, index) => {
      const novedadData = {
        libro_id: this.libroId!,
        maquina_id: maquinaId,
        descripcion: this.novedadData.descripcion,
        empleado_id: this.selectedEmpleadoId!,
        hora: this.novedadData.hora
      };

      this.novedadesRegistrosService.createNovedadMaquinaRegistro(novedadData).subscribe({
        next: (novedad: NovedadMaquinaRegistro) => {
          completed++;
          
          // Si es la última máquina, recargar y resetear
          if (completed + errors === this.selectedMaquinaIds.length) {
            this.loadNovedades();
            this.resetForm();
          }
        },
        error: (error: any) => {
          errors++;
          
          // Si es la última máquina, recargar y resetear
          if (completed + errors === this.selectedMaquinaIds.length) {
            this.loadNovedades();
            this.resetForm();
          }
        }
      });
    });
  }

  deleteNovedad(evento: any) {
    const isGroup = evento.esLote;
    const novedadIds = evento.ids;
    const count = novedadIds.length;
    
    // Eliminar directamente sin confirmación
    this.ejecutarEliminacionGrupoNovedades(novedadIds, isGroup);
  }

  // Método auxiliar para ejecutar la eliminación de grupo
  private ejecutarEliminacionGrupoNovedades(novedadIds: number[], isGroup: boolean) {
    novedadIds.forEach((novedadId: number) => {
      this.novedadesRegistrosService.deleteNovedadMaquinaRegistro(novedadId).subscribe({
        next: () => {
          // Solo recargar la lista sin mostrar modales
          this.loadNovedades();
        },
        error: (error: any) => {
          console.error('Error eliminando novedad:', error);
          // Solo recargar la lista sin mostrar modales
          this.loadNovedades();
        }
      });
    });
  }

  // Método auxiliar para ejecutar la eliminación real (mantener para compatibilidad)
  private ejecutarEliminacionNovedad(id: number) {
    
    
    this.novedadesRegistrosService.deleteNovedadMaquinaRegistro(id).subscribe({
      next: () => {
        
        this.loadNovedades(); // Recargar la lista
        
      },
      error: (error: any) => {
        
        
        if (error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar la novedad',
            message: 'Esta novedad tiene relaciones que impiden su eliminación.',
            entity: {
              id: id,
              nombre: 'Novedad',
              tipo: 'novedad'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar esta novedad, primero debe eliminar o reasignar los elementos relacionados.'
          });
        } else {
          
        }
      }
    });
  }

  resetForm() {
    this.selectedMaquinaIds = [];
    this.selectedEmpleadoId = null;
    this.novedadData.hora = this.getCurrentTime();
    this.novedadData.descripcion = '';
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
      console.log('✅ Empleado seleccionado:', empleado.nombre, 'ID:', empleado.id);
    } else {
      this.selectedEmpleadoId = null;
      this.empleadoSelected = null;
      console.log('❌ Empleado no encontrado:', searchText);
    }
  }

  onEmpleadoFocus() {
    // Opcional: cargar todos los empleados si no están cargados
  }

  onEmpleadoBlur() {
    // Validar que el empleado seleccionado sea válido
    if (this.empleadoSearchText && !this.empleadoSelected) {
      // Si hay texto pero no se encontró empleado, limpiar
      console.log('⚠️ Empleado inválido, limpiando selección');
      this.empleadoSearchText = '';
      this.selectedEmpleadoId = null;
    }
    
    // Verificar que el empleado esté realmente seleccionado
    if (this.empleadoSearchText && this.empleadoSelected) {
      const empleadoValido = this.empleados.find(emp => 
        emp.nombre.toLowerCase() === this.empleadoSearchText.toLowerCase()
      );
      
      if (!empleadoValido) {
        console.log('⚠️ Empleado no válido, limpiando selección');
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
    // Buscar la sala en userSalas usando el salaId de la ruta
    const sala = this.userSalas.find(s => s.id === this.salaId);
    return sala ? sala.nombre : 'Sala';
  }

  loadLibro() {
    if (!this.libroId) return;
    
    this.libroService.getLibro(this.libroId).subscribe({
      next: (libro) => {
        this.libro = libro;
      },
      error: (error) => {
      }
    });
  }

  getLibroFecha(): string {
    if (this.libro && this.libro.created_at) {
      const fecha = new Date(this.libro.created_at);
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    }
    
    // Fallback a fecha actual si no hay libro cargado
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  goBack() {
    this.router.navigate(['/libros']);
  }

  agruparNovedades(novedades: NovedadMaquinaRegistro[]): any[] {
    const grupos = new Map<string, any>();
    
    novedades.forEach(novedad => {
      const clave = `${novedad.empleado_id}-${novedad.descripcion}-${novedad.hora}`;
      
      if (grupos.has(clave)) {
        const grupo = grupos.get(clave);
        grupo.maquinas.push(novedad.Maquina);
        grupo.ids.push(novedad.id);
      } else {
        grupos.set(clave, {
          empleado: novedad.Empleado,
          descripcion: novedad.descripcion,
          hora: novedad.hora,
          maquinas: [novedad.Maquina],
          ids: [novedad.id],
          esLote: false
        });
      }
    });
    
    // Convertir a array y marcar como lote si tiene más de 1 máquina
    return Array.from(grupos.values()).map(grupo => {
      grupo.esLote = grupo.maquinas.length > 1;
      return grupo;
    });
  }

  mostrarMaquinasAfectadas(evento: any) {
    this.eventoSeleccionado = evento;
    this.maquinasAfectadas = evento.maquinas;
    this.showMaquinasModal = true;
  }

  cerrarModal() {
    this.showMaquinasModal = false;
    this.maquinasAfectadas = [];
    this.eventoSeleccionado = null;
  }
}