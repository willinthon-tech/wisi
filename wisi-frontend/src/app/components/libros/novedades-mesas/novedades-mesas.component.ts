import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '../../../services/user.service';
import { EmpleadosService } from '../../../services/empleados.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
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
    <div class="novedades-container" *ngIf="hasAccess; else noAccess">
      <!-- Formulario de Novedades (Lado Izquierdo) -->
      <div class="form-section">
        <h3>Novedades de Mesas</h3>
        <form (ngSubmit)="saveNovedad()" #novedadForm="ngForm">
          <div class="form-group">
            <label for="mesaSelect">Seleccionar Mesa(s):</label>
            <div class="mesas-grid" *ngIf="mesas.length > 0">
              <div class="mesa-item" *ngFor="let mesa of mesas">
                <label class="mesa-checkbox">
                  <input 
                    type="checkbox" 
                    [value]="mesa.id"
                    (change)="onMesaChange($event, mesa.id)"
                    [checked]="selectedMesaIds.includes(mesa.id)"
                  >
                  <span class="checkmark"></span>
                  <div class="mesa-info">
                    <strong>{{ mesa.nombre }}</strong>
                    <small>{{ mesa.Juego?.nombre || 'Sin juego' }}</small>
                  </div>
                </label>
              </div>
            </div>
            <div *ngIf="mesas.length === 0" class="no-mesas">
              <p>No hay mesas disponibles para esta sala</p>
            </div>
          </div>

          <div class="form-group">
            <label for="empleadoSelect">Empleado:</label>
            <select 
              id="empleadoSelect" 
              name="empleadoSelect"
              [(ngModel)]="selectedEmpleadoId"
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

          <div class="form-group">
            <label for="descripcionInput">Descripción:</label>
            <textarea 
              id="descripcionInput" 
              name="descripcionInput"
              [(ngModel)]="novedadData.descripcion"
              class="form-control textarea"
              rows="4"
              placeholder="Describa la novedad..."
              required
            ></textarea>
          </div>

          <button type="submit" class="btn btn-success" [disabled]="selectedMesaIds.length === 0 || !novedadData.descripcion || !selectedEmpleadoId || !novedadData.hora">
            Guardar ({{ selectedMesaIds.length }} mesas)
          </button>
        </form>
      </div>

      <!-- Lista de Novedades (Lado Derecho) -->
      <div class="list-section">
        <h3>Registros de Novedades</h3>
        <div class="novedades-list" *ngIf="novedades.length > 0">
          <div class="novedad-item" *ngFor="let novedad of novedades">
            <div class="novedad-header">
              <span class="mesa-name">{{ novedad.Mesa?.nombre || 'Mesa eliminada' }}</span>
              <span class="novedad-time">{{ novedad.hora }}</span>
            </div>
            <div class="novedad-content">
              <p class="novedad-desc">{{ novedad.descripcion }}</p>
              <div class="novedad-meta">
                <span class="empleado">{{ novedad.Empleado?.nombre || 'Empleado eliminado' }}</span>
                <span class="fecha">{{ novedad.created_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>
            <div class="novedad-actions">
              <button class="btn btn-sm btn-danger" (click)="deleteNovedad(novedad.id || 0)">
                Eliminar
              </button>
            </div>
          </div>
        </div>
        <div *ngIf="novedades.length === 0" class="no-novedades">
          <p>No hay novedades registradas</p>
        </div>
      </div>
    </div>

    <ng-template #noAccess>
      <div class="no-access">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder a esta sección.</p>
        <button class="btn btn-primary" (click)="goBack()">Volver</button>
      </div>
    </ng-template>
  `,
  styles: [`
    .novedades-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      padding: 20px;
      min-height: calc(100vh - 120px);
    }

    .form-section, .list-section {
      background: white;
      border-radius: 12px;
      padding: 25px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
    }

    .form-section h3, .list-section h3 {
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
      padding: 10px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .textarea {
      resize: vertical;
      min-height: 80px;
    }

    .mesas-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      background: #f8f9fa;
    }

    .mesa-item {
      margin-bottom: 5px;
    }

    .mesa-checkbox {
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.3s;
    }

    .mesa-checkbox:hover {
      background: #e9ecef;
    }

    .mesa-checkbox input[type="checkbox"] {
      margin-right: 8px;
      transform: scale(1.1);
    }

    .mesa-info {
      flex: 1;
    }

    .mesa-info strong {
      display: block;
      font-size: 13px;
      color: #333;
    }

    .mesa-info small {
      color: #666;
      font-size: 11px;
    }

    .no-mesas {
      text-align: center;
      padding: 20px;
      color: #666;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-success:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
    }

    .btn-success:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-danger {
      background: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background: #c82333;
    }

    .btn-primary {
      background: #007bff;
      color: white;
    }

    .btn-primary:hover {
      background: #0056b3;
    }

    .novedades-list {
      max-height: 500px;
      overflow-y: auto;
    }

    .novedad-item {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
      transition: all 0.3s;
    }

    .novedad-item:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .novedad-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .mesa-name {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }

    .novedad-time {
      background: #007bff;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .novedad-content {
      margin-bottom: 10px;
    }

    .novedad-desc {
      margin: 0 0 8px 0;
      color: #555;
      line-height: 1.4;
      font-size: 13px;
    }

    .novedad-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #666;
    }

    .empleado {
      font-weight: 500;
    }

    .fecha {
      font-style: italic;
    }

    .novedad-actions {
      text-align: right;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }

    .no-novedades {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-access {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .no-access h2 {
      color: #dc3545;
      margin-bottom: 15px;
    }

    .no-access p {
      color: #666;
      margin-bottom: 20px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .novedades-container {
        grid-template-columns: 1fr;
        gap: 15px;
        padding: 15px;
      }

      .mesas-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NovedadesMesasComponent implements OnInit, OnDestroy {
  novedades: NovedadMesaRegistro[] = [];
  mesas: any[] = [];
  empleados: any[] = [];
  selectedMesaIds: number[] = [];
  selectedEmpleadoId: number | null = null;
  novedadData: NovedadData = {
    hora: this.getCurrentTime(),
    descripcion: ''
  };
  libroId: number | null = null;
  salaId: number | null = null;
  hasAccess: boolean = false;
  libro: any = null;
  
  private readonly NOVEDADES_MESAS_MODULE_ID = 17; // ID del módulo Novedades de Mesas
  private permissionsSubscription?: Subscription;

  constructor(
    private userService: UserService,
    private empleadosService: EmpleadosService,
    private permissionsService: PermissionsService,
    private libroService: LibroService,
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
      this.hasAccess = this.permissionsService.canEdit(this.NOVEDADES_MESAS_MODULE_ID);
    });
  }

  private loadData() {
    if (this.libroId && this.salaId) {
      this.loadLibro();
      this.loadMesas();
      this.loadEmpleados();
      this.loadNovedades();
    }
  }

  loadLibro() {
    if (!this.libroId) return;
    
    this.libroService.getLibro(this.libroId!).subscribe({
      next: (libro) => {
        this.libro = libro;
      },
      error: (error) => {
        console.error('Error cargando libro:', error);
      }
    });
  }

  loadMesas() {
    if (!this.salaId) return;

    this.userService.getUserSalas().subscribe({
      next: (salas: any) => {
        // Buscar la sala actual y obtener sus mesas
        const sala = salas.find((s: any) => s.id === this.salaId);
        if (sala && sala.Mesas) {
          this.mesas = sala.Mesas;
        } else {
          this.mesas = [];
        }
      },
      error: (error: any) => {
        console.error('Error cargando mesas:', error);
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las mesas'
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

  loadNovedades() {
    if (!this.libroId) return;
    // TODO: Implementar carga de novedades cuando el servicio esté disponible
    this.novedades = [];
  }

  onMesaChange(event: any, mesaId: number) {
    if (event.target.checked) {
      if (!this.selectedMesaIds.includes(mesaId)) {
        this.selectedMesaIds.push(mesaId);
      }
    } else {
      this.selectedMesaIds = this.selectedMesaIds.filter(id => id !== mesaId);
    }
  }

  saveNovedad() {
    if (this.selectedMesaIds.length === 0 || !this.novedadData.descripcion || !this.selectedEmpleadoId || !this.novedadData.hora) {
      return;
    }

    if (!this.libroId) {
      return;
    }

    // TODO: Implementar guardado de novedades cuando el servicio esté disponible
    console.log('Guardando novedad:', {
      libroId: this.libroId,
      mesaIds: this.selectedMesaIds,
      empleadoId: this.selectedEmpleadoId,
      descripcion: this.novedadData.descripcion,
      hora: this.novedadData.hora
    });
    
    this.resetForm();
  }

  deleteNovedad(novedadId: number) {
    // TODO: Implementar eliminación de novedades cuando el servicio esté disponible
    console.log('Eliminando novedad:', novedadId);
  }

  resetForm() {
    this.selectedMesaIds = [];
    this.selectedEmpleadoId = null;
    this.novedadData.hora = this.getCurrentTime();
    this.novedadData.descripcion = '';
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getSalaName(): string {
    // Buscar la sala en userSalas usando el salaId de la ruta
    let salaName = 'Sala';
    this.userService.getUserSalas().subscribe({
      next: (salas: any) => {
        const sala = salas.find((s: any) => s.id === this.salaId);
        if (sala) {
          salaName = sala.nombre;
        }
      }
    });
    return salaName;
  }

  goBack() {
    this.router.navigate(['/libros']);
  }
}
