import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IncidenciasGeneralesService } from '../../../services/incidencias-generales.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
import { Subscription } from 'rxjs';

interface IncidenciaGeneral {
  id?: number;
  libro_id: number;
  descripcion: string;
  hora: string;
  }

interface Sala {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-incidencias-generales',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="incidencias-container" *ngIf="hasAccess; else noAccess">
      <!-- Formulario de Incidencias (Lado Izquierdo) -->
      <div class="form-section">
        <h3>Incidencias Generales</h3>
        <form (ngSubmit)="saveIncidencia()" #incidenciaForm="ngForm">
          <div class="form-group">
            <label for="descripcionInput">Descripción:</label>
            <textarea 
              id="descripcionInput" 
              name="descripcionInput"
              [(ngModel)]="incidenciaData.descripcion"
              class="form-control textarea"
              rows="6"
              placeholder="Describa la incidencia..."
              required
            ></textarea>
          </div>

          <div class="form-group">
            <label for="horaInput">Hora:</label>
            <input 
              type="time" 
              id="horaInput" 
              name="horaInput"
              [(ngModel)]="incidenciaData.hora"
              class="form-control"
              required
            />
          </div>

          <button type="submit" class="btn btn-success" [disabled]="!incidenciaForm.form.valid">
            Guardar
          </button>
        </form>
      </div>

      <!-- Tabla de Incidencias (Lado Derecho) -->
      <div class="table-section">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr class="sala-header">
                <th colspan="4" class="sala-title">{{ getSalaName() }} - {{ getLibroFecha() }}</th>
              </tr>
              <tr>
                <th class="text-center">N°</th>
                <th class="text-left">Descripción</th>
                <th class="text-center">Hora</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let incidencia of incidencias; let i = index">
                <td class="text-center">{{ i + 1 }}</td>
                <td class="text-left">{{ incidencia.descripcion }}</td>
                <td class="text-center">{{ incidencia.hora }}</td>
                <td class="text-center">
                  <button class="btn btn-danger btn-sm" (click)="deleteIncidencia(incidencia.id!)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr *ngIf="incidencias.length === 0">
                <td colspan="4" class="no-data">No hay incidencias registradas</td>
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
          <p>No tienes permisos para acceder a Incidencias Generales.</p>
          <p>Contacta al administrador para obtener los permisos necesarios.</p>
          <button class="btn-back" (click)="goBack()">
            ← Volver al Dashboard
          </button>
        </div>
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

    .table-section {
      flex: 1.5;
      background: transparent;
      padding: 0;
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

    .textarea {
      resize: vertical;
      min-height: 120px;
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

    .btn-sm {
      padding: 5px 10px;
      font-size: 12px;
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

    .no-data {
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .table-container {
      height: 100%;
      overflow-y: auto;
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
  `]
})
export class IncidenciasGeneralesComponent implements OnInit, OnDestroy {
  incidencias: IncidenciaGeneral[] = [];
  userSalas: Sala[] = [];
  
  libroId: number | null = null;
  salaId: number | null = null;
  hasAccess: boolean = false;
  libro: any = null;
  
  incidenciaData = {
    descripcion: '',
    hora: ''
  };

  private readonly CECOM_MODULE_ID = 3; // ID del módulo CECOM
  private permissionsSubscription?: Subscription;

  constructor(
    private incidenciasGeneralesService: IncidenciasGeneralesService,
    private userService: UserService,
    private route: ActivatedRoute,
    private permissionsService: PermissionsService,
    private router: Router,
    private libroService: LibroService
  ) { }

  ngOnInit() {
    // Verificar permisos primero
    this.checkPermissions();
    
    // Suscribirse a cambios de permisos
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      this.checkPermissions();
    });

    // Obtener el ID del libro y sala desde la ruta
    this.route.params.subscribe(params => {
      this.libroId = +params['libroId'];
      this.salaId = +params['salaId'];
      
      // Cargar información del libro
      if (this.libroId) {
        this.loadLibro();
      }
    });
    
    if (this.hasAccess) {
      // Cargar primero las salas del usuario, luego los demás datos
      this.loadUserSalas();
    }
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  private checkPermissions(): void {
    // Incidencias Generales es una operación funcional, no CRUD - siempre permitir acceso
    this.hasAccess = true;
  }

  loadUserSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: Sala[]) => {
        this.userSalas = salas;
        // Una vez cargadas las salas, cargar las incidencias
        this.loadIncidencias();
      },
      error: (error: any) => {
        console.error('Error cargando salas del usuario:', error);
        alert('Error cargando salas del usuario');
      }
    });
  }

  loadIncidencias() {
    if (!this.libroId) {
      console.error('No hay libroId para cargar incidencias');
      return;
    }
    
    this.incidenciasGeneralesService.getIncidenciasGenerales(this.libroId).subscribe({
      next: (incidencias: IncidenciaGeneral[]) => {
        // Ordenar por hora de menor a mayor
        this.incidencias = incidencias.sort((a, b) => {
          if (a.hora < b.hora) return -1;
          if (a.hora > b.hora) return 1;
          return 0;
        });
      },
      error: (error: any) => {
        console.error('Error cargando incidencias:', error);
        alert('Error cargando incidencias');
      }
    });
  }

  saveIncidencia() {
    if (!this.incidenciaData.descripcion || !this.incidenciaData.hora) {
      alert('Por favor complete todos los campos');
      return;
    }

    if (!this.libroId) {
      alert('Error: No se ha identificado el libro');
      return;
    }

    const incidenciaData = {
      libro_id: this.libroId,
      descripcion: this.incidenciaData.descripcion,
      hora: this.incidenciaData.hora
    };

    this.incidenciasGeneralesService.createIncidenciaGeneral(incidenciaData).subscribe({
      next: (incidencia: IncidenciaGeneral) => {
        this.loadIncidencias(); // Recargar la lista
        this.resetForm();
        alert('Incidencia guardada correctamente');
      },
      error: (error: any) => {
        console.error('Error guardando incidencia:', error);
        alert('Error guardando incidencia');
      }
    });
  }

  deleteIncidencia(id: number) {
    if (confirm('¿Está seguro de que desea eliminar esta incidencia?')) {
      this.incidenciasGeneralesService.deleteIncidenciaGeneral(id).subscribe({
        next: () => {
          this.loadIncidencias(); // Recargar la lista
          alert('Incidencia eliminada correctamente');
        },
        error: (error: any) => {
          console.error('Error eliminando incidencia:', error);
          alert('Error eliminando incidencia');
        }
      });
    }
  }

  resetForm() {
    this.incidenciaData.descripcion = '';
    this.incidenciaData.hora = '';
  }

  loadLibro() {
    if (!this.libroId) return;
    
    this.libroService.getLibro(this.libroId).subscribe({
      next: (libro) => {
        this.libro = libro;
      },
      error: (error) => {
        console.error('Error cargando libro:', error);
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

  getSalaName(): string {
    // Buscar la sala en userSalas usando el salaId de la ruta
    const sala = this.userSalas.find(s => s.id === this.salaId);
    return sala ? sala.nombre : 'Sala';
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
