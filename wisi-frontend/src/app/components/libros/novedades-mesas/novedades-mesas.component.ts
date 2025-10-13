import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { EmpleadosService } from '../../../services/empleados.service';
import { MesasService } from '../../../services/mesas.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
import { NovedadesMesasRegistrosService } from '../../../services/novedades-mesas-registros.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

interface NovedadMesaRegistro {
  id?: number;
  libro_id: number;
  mesa_id: number;
  descripcion: string;
  empleado_id: number;
  hora: string;
  created_at?: string;
  updated_at?: string;
  Mesa?: {
    id: number;
    nombre: string;
    Juego?: {
      id: number;
      nombre: string;
      Sala?: {
        id: number;
        nombre: string;
      }
    }
  };
  Empleado?: {
    id: number;
    nombre: string;
    cedula: string;
  };
}

interface NovedadData {
  hora: string;
  descripcion: string;
  mesa_id: number | null;
  empleado_id: number | null;
}

interface Sala {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-novedades-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="incidencias-container" *ngIf="hasAccess; else noAccess">
      <!-- Formulario de Novedades (Lado Izquierdo) -->
      <div class="form-section">
        <h3>Novedades de Mesas</h3>
        <form (ngSubmit)="saveNovedad()" #novedadForm="ngForm">
          <div class="form-group">
            <label for="mesaSelect">Mesa:</label>
            <select 
              id="mesaSelect" 
              name="mesaSelect"
              [(ngModel)]="novedadData.mesa_id"
              class="form-control"
              required
            >
              <option value="">Seleccionar mesa...</option>
              <option *ngFor="let mesa of mesas" [value]="mesa.id">
                {{ mesa.nombre }} - {{ mesa.Juego?.nombre || 'Sin juego' }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="empleadoSelect">Empleado:</label>
            <select 
              id="empleadoSelect" 
              name="empleadoSelect"
              [(ngModel)]="novedadData.empleado_id"
              class="form-control"
              required
            >
              <option value="">Seleccionar empleado...</option>
              <option *ngFor="let empleado of empleados" [value]="empleado.id">
                {{ empleado.nombre }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="descripcionInput">Descripción:</label>
            <textarea 
              id="descripcionInput" 
              name="descripcionInput"
              [(ngModel)]="novedadData.descripcion"
              class="form-control textarea"
              rows="6"
              placeholder="Describa la novedad..."
              required
            ></textarea>
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

          <button type="submit" class="btn btn-success" [disabled]="!novedadForm.form.valid">
            Guardar
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
                <th class="text-left">Mesa</th>
                <th class="text-left">Empleado</th>
                <th class="text-left">Descripción</th>
                <th class="text-center">Hora</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let novedad of novedades; let i = index">
                <td class="text-center">{{ i + 1 }}</td>
                <td class="text-left">{{ novedad.Mesa?.nombre || 'Sin mesa' }}</td>
                <td class="text-left">{{ novedad.Empleado?.nombre || 'Sin empleado' }}</td>
                <td class="text-left">{{ novedad.descripcion }}</td>
                <td class="text-center">{{ novedad.hora }}</td>
                <td class="text-center">
                  <button class="btn btn-danger btn-sm" (click)="deleteNovedad(novedad.id!)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr *ngIf="novedades.length === 0">
                <td colspan="6" class="no-data">No hay novedades registradas</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <ng-template #noAccess>
      <div class="no-access">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a este módulo.</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .incidencias-container {
      display: flex;
      gap: 20px;
      padding: 20px;
      min-height: calc(100vh - 200px);
    }

    .form-section {
      flex: 0.4;
      height: fit-content;
      background: white;
      padding: 20px 20px 30px 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .form-section h3 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 20px;
      font-weight: bold;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 10px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #333;
      font-size: 14px;
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
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
    }

    .textarea {
      resize: vertical;
      min-height: 120px;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s ease;
      font-size: 14px;
    }

    .btn-success {
      background: #28a745;
      color: white;
      width: 100%;
    }

    .btn-success:hover {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .btn-success:disabled {
      background: #6c757d;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .table-section {
      flex: 1.5;
      background: transparent;
      padding: 0;
    }

    .table-container {
      height: 100%;
      overflow-y: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
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
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .data-table tbody tr:hover {
      background: #e9ecef;
    }

    .data-table tbody tr:last-child td {
      border-bottom: none;
    }

    .sala-header {
      background: #6c757d !important;
    }

    .sala-title {
      color: white !important;
      font-weight: bold;
      text-align: center;
      padding: 12px;
    }

    .text-center {
      text-align: center;
    }

    .text-left {
      text-align: left;
    }

    .no-data {
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .no-access {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .no-access h2 {
      margin-bottom: 15px;
      color: #dc3545;
    }

    .no-access p {
      color: #666;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .incidencias-container {
        flex-direction: column;
      }
      
      .form-section {
        flex: none;
      }
    }
  `]
})
export class NovedadesMesasComponent implements OnInit, OnDestroy {
  novedades: NovedadMesaRegistro[] = [];
  empleados: any[] = [];
  mesas: any[] = [];
  novedadData: NovedadData = {
    hora: '',
    descripcion: '',
    mesa_id: null,
    empleado_id: null
  };
  libroId: number | null = null;
  salaId: number | null = null;
  salaName: string = 'Sala';
  hasAccess: boolean = false;
  libro: any = null;
  
  private readonly NOVEDADES_MESAS_MODULE_ID = 19; // ID del módulo Novedades de Mesas
  private permissionsSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private empleadosService: EmpleadosService,
    private mesasService: MesasService,
    private permissionsService: PermissionsService,
    private libroService: LibroService,
    private novedadesRegistrosService: NovedadesMesasRegistrosService,
    private route: ActivatedRoute,
    private router: Router,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    // Inicializar la hora actual
    this.novedadData.hora = this.getCurrentTime();
    
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
      this.hasAccess = this.permissionsService.canEdit(this.NOVEDADES_MESAS_MODULE_ID);
    });
  }

  private loadData() {
    if (this.libroId && this.salaId) {
      this.loadLibro();
      this.loadEmpleados();
      this.loadMesas();
      this.loadNovedades();
      this.loadSalaName();
    }
  }

  loadLibro() {
    if (!this.libroId) return;
    
    this.libroService.getLibro(this.libroId!).subscribe({
      next: (libro: any) => {
        this.libro = libro;
        console.log('Libro cargado:', this.libro);
      },
      error: (error: any) => {
        console.error('Error cargando libro:', error);
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudo cargar la información del libro'
        });
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
        console.error('Error cargando empleados:', error);
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar los empleados'
        });
      }
    });
  }

  loadMesas() {
    if (!this.salaId) return;

    this.mesasService.getMesas().subscribe({
      next: (mesas: any) => {
        // Filtrar mesas por sala y que estén activas
        this.mesas = mesas.filter((mesa: any) => 
          mesa.sala_id === this.salaId && mesa.activo === 1
        );
        console.log('Mesas cargadas:', this.mesas);
      },
      error: (error: any) => {
        console.error('Error cargando mesas:', error);
        this.mesas = [];
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las mesas'
        });
      }
    });
  }

  loadNovedades() {
    if (!this.libroId) return;
    
    this.novedadesRegistrosService.getNovedadesMesaRegistros(this.libroId).subscribe({
      next: (novedades: NovedadMesaRegistro[]) => {
        this.novedades = novedades;
      },
      error: (error: any) => {
        console.error('Error cargando novedades:', error);
        this.novedades = [];
      }
    });
  }

  loadSalaName() {
    if (!this.salaId) return;
    
    this.userService.getUserSalas().subscribe({
      next: (salas: any) => {
        console.log('loadSalaName - salas:', salas);
        const sala = salas.find((s: any) => s.id === this.salaId);
        console.log('loadSalaName - sala encontrada:', sala);
        if (sala) {
          this.salaName = sala.nombre;
          console.log('loadSalaName - nombre de sala:', this.salaName);
        }
      },
      error: (error: any) => {
        console.error('Error cargando nombre de sala:', error);
        this.salaName = 'Sala';
      }
    });
  }

  saveNovedad() {
    if (!this.novedadData.mesa_id || !this.novedadData.empleado_id || !this.novedadData.descripcion || !this.novedadData.hora) {
      return;
    }

    if (!this.libroId) {
      return;
    }

    const novedadData = {
      libro_id: this.libroId,
      mesa_id: this.novedadData.mesa_id,
      empleado_id: this.novedadData.empleado_id,
      descripcion: this.novedadData.descripcion,
      hora: this.novedadData.hora
    };

    this.novedadesRegistrosService.createNovedadMesaRegistro(novedadData).subscribe({
      next: (novedad: NovedadMesaRegistro) => {
        this.loadNovedades();
        this.resetForm();
      },
      error: (error: any) => {
        console.error('Error guardando novedad:', error);
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudo guardar la novedad'
        });
      }
    });
  }

  deleteNovedad(novedadId: number) {
    this.novedadesRegistrosService.deleteNovedadMesaRegistro(novedadId).subscribe({
      next: () => {
        this.loadNovedades();
      },
      error: (error: any) => {
        console.error('Error eliminando novedad:', error);
        this.loadNovedades();
      }
    });
  }

  resetForm() {
    this.novedadData = {
      hora: this.getCurrentTime(),
      descripcion: '',
      mesa_id: null,
      empleado_id: null
    };
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getSalaName(): string {
    return this.salaName || 'Sala';
  }

  getLibroFecha(): string {
    console.log('getLibroFecha - libro:', this.libro);
    if (this.libro && this.libro.created_at) {
      const fecha = new Date(this.libro.created_at).toLocaleDateString('es-ES');
      console.log('getLibroFecha - fecha formateada:', fecha);
      return fecha;
    }
    console.log('getLibroFecha - fecha no disponible');
    return 'Fecha no disponible';
  }

  goBack() {
    this.router.navigate(['/libros']);
  }
}