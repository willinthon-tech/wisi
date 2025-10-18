import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DropsService, Drop, Mesa } from '../../../services/drops.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { LibroService } from '../../../services/libro.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

interface Sala {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-drop-mesas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drop-container" *ngIf="hasAccess; else noAccess">
      <!-- Formulario de Drop (Lado Izquierdo) -->
      <div class="form-section">
        <h3>Drop de Mesas</h3>
        <form (ngSubmit)="saveDrop()" #dropForm="ngForm">
          <div class="form-group">
            <label for="mesaSelect">Mesas:</label>
            <select 
              id="mesaSelect" 
              name="mesaSelect"
              [(ngModel)]="selectedMesaId"
              (change)="onMesaChange()"
              class="form-control"
              required
            >
              <option value="">Seleccione una opción</option>
              <option *ngFor="let mesa of userMesas" [value]="mesa.id">
                {{ mesa.nombre }} - {{ mesa.Juego?.nombre }} ({{ mesa.Juego?.Sala?.nombre }})
              </option>
            </select>
          </div>

          <div class="denominations-grid">
            <div class="form-group">
              <label for="denominacion100">$ 100:</label>
              <input 
                type="number" 
                id="denominacion100" 
                name="denominacion100"
                [(ngModel)]="dropData.denominacion_100"
                class="form-control"
                min="0"
                value="0"
              />
            </div>

            <div class="form-group">
              <label for="denominacion50">$ 50:</label>
              <input 
                type="number" 
                id="denominacion50" 
                name="denominacion50"
                [(ngModel)]="dropData.denominacion_50"
                class="form-control"
                min="0"
                value="0"
              />
            </div>

            <div class="form-group">
              <label for="denominacion20">$ 20:</label>
              <input 
                type="number" 
                id="denominacion20" 
                name="denominacion20"
                [(ngModel)]="dropData.denominacion_20"
                class="form-control"
                min="0"
                value="0"
              />
            </div>

            <div class="form-group">
              <label for="denominacion10">$ 10:</label>
              <input 
                type="number" 
                id="denominacion10" 
                name="denominacion10"
                [(ngModel)]="dropData.denominacion_10"
                class="form-control"
                min="0"
                value="0"
              />
            </div>

            <div class="form-group">
              <label for="denominacion5">$ 5:</label>
              <input 
                type="number" 
                id="denominacion5" 
                name="denominacion5"
                [(ngModel)]="dropData.denominacion_5"
                class="form-control"
                min="0"
                value="0"
              />
            </div>

            <div class="form-group">
              <label for="denominacion1">$ 1:</label>
              <input 
                type="number" 
                id="denominacion1" 
                name="denominacion1"
                [(ngModel)]="dropData.denominacion_1"
                class="form-control"
                min="0"
                value="0"
              />
            </div>
          </div>

          <button type="submit" class="btn btn-success" [disabled]="!dropForm.form.valid">
            Guardar
          </button>
        </form>
      </div>

      <!-- Tabla de Drops (Lado Derecho) -->
      <div class="table-section">
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr class="sala-header">
                <th colspan="10" class="sala-title">{{ getSalaName() }} - {{ getLibroFecha() }}</th>
              </tr>
              <tr>
                <th class="text-center">N°</th>
                <th class="text-left">Mesa</th>
                <th class="text-center">$ 100</th>
                <th class="text-center">$ 50</th>
                <th class="text-center">$ 20</th>
                <th class="text-center">$ 10</th>
                <th class="text-center">$ 5</th>
                <th class="text-center">$ 1</th>
                <th class="text-right">Total</th>
                <th class="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let drop of drops; let i = index">
                <td class="text-center">{{ i + 1 }}</td>
                <td class="text-left">{{ drop.Mesa?.nombre }}</td>
                <td class="text-center">{{ drop.denominacion_100 }}</td>
                <td class="text-center">{{ drop.denominacion_50 }}</td>
                <td class="text-center">{{ drop.denominacion_20 }}</td>
                <td class="text-center">{{ drop.denominacion_10 }}</td>
                <td class="text-center">{{ drop.denominacion_5 }}</td>
                <td class="text-center">{{ drop.denominacion_1 }}</td>
                <td class="text-right">$ {{ drop.total }}</td>
                <td class="text-center">
                  <button class="btn btn-danger btn-sm" (click)="deleteDrop(drop.id)">
                    Eliminar
                  </button>
                </td>
              </tr>
              <tr *ngIf="drops.length === 0">
                <td colspan="10" class="no-data">No hay drops registrados</td>
              </tr>
            </tbody>
            <tfoot *ngIf="drops.length > 0">
              <tr class="total-row">
                <td class="text-center"></td>
                <td class="text-left"><strong>TOTAL</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(100) }}</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(50) }}</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(20) }}</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(10) }}</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(5) }}</strong></td>
                <td class="text-center"><strong>$ {{ getTotalDenominacion(1) }}</strong></td>
                <td class="text-right"><strong class="total-amount">$ {{ getTotalGeneral() }}</strong></td>
                <td class="text-center"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>

    <ng-template #noAccess>
      <div class="no-access-container">
        <div class="no-access-content">
          <div class="access-icon">🚫</div>
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder a Drop de Mesas.</p>
          <p>Contacta al administrador para obtener los permisos necesarios.</p>
          <button class="btn-back" (click)="goBack()">
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .drop-container {
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

    .denominations-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 20px 0;
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

    .total-row {
      background: #e9ecef;
      font-weight: bold;
      border-top: 2px solid #007bff;
    }

    .total-row td {
      padding: 15px 12px;
      font-size: 14px;
      background: #e9ecef;
      border-bottom: none;
    }

    .total-amount {
      color: #28a745;
      font-size: 16px;
      font-weight: bold;
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
  `]
})
export class DropMesasComponent implements OnInit, OnDestroy {
  drops: Drop[] = [];
  userMesas: Mesa[] = [];
  userSalas: Sala[] = [];
  selectedMesaId: number | null = null;
  libroId: number | null = null;
  salaId: number | null = null;
  hasAccess: boolean = false;
  libro: any = null;
  dropData = {
    denominacion_100: 0,
    denominacion_50: 0,
    denominacion_20: 0,
    denominacion_10: 0,
    denominacion_5: 0,
    denominacion_1: 0
  };

  private readonly LIBRO_MODULE_ID = 5; // ID del módulo Libro (CECOM)
  private permissionsSubscription?: Subscription;

  constructor(
    private dropsService: DropsService,
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
      this.loadUserSalas();
      this.loadDrops();
      this.loadUserMesas();
    }
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  private checkPermissions(): void {
    // Drop de Mesas es una operación funcional, no CRUD - siempre permitir acceso
    this.hasAccess = true;
  }

  loadUserSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: Sala[]) => {
        this.userSalas = salas;
      },
      error: (error: any) => {
      }
    });
  }

  loadDrops() {
    if (!this.libroId) {
      return;
    }
    
    this.dropsService.getDrops(this.libroId).subscribe({
      next: (drops: Drop[]) => {
        this.drops = drops;
      },
      error: (error: any) => {
      }
    });
  }

  loadUserMesas() {
    this.dropsService.getUserMesas().subscribe({
      next: (mesas: Mesa[]) => {
        // Filtrar mesas por la sala específica de la ruta
        this.userMesas = mesas.filter(mesa => 
          mesa.Juego && mesa.Juego.Sala && mesa.Juego.Sala.id === this.salaId
        );
      },
      error: (error: any) => {
      }
    });
  }

  onMesaChange() {
    
    if (this.selectedMesaId) {
      // Convertir selectedMesaId a número para comparación
      const mesaId = Number(this.selectedMesaId);
      
      // Buscar si ya existe un drop para esta mesa
      const existingDrop = this.drops.find(drop => drop.mesa_id === mesaId);
      
      if (existingDrop) {
        // Llenar los campos con los datos existentes
        this.dropData = {
          denominacion_100: existingDrop.denominacion_100,
          denominacion_50: existingDrop.denominacion_50,
          denominacion_20: existingDrop.denominacion_20,
          denominacion_10: existingDrop.denominacion_10,
          denominacion_5: existingDrop.denominacion_5,
          denominacion_1: existingDrop.denominacion_1
        };
      } else {
        // Limpiar los campos
        this.dropData = {
          denominacion_100: 0,
          denominacion_50: 0,
          denominacion_20: 0,
          denominacion_10: 0,
          denominacion_5: 0,
          denominacion_1: 0
        };
      }
    }
  }

  saveDrop() {
    if (!this.selectedMesaId) {
      return;
    }

    if (!this.libroId) {
      return;
    }

    const dropData = {
      libro_id: this.libroId,
      mesa_id: this.selectedMesaId,
      denominacion_100: this.dropData.denominacion_100 || 0,
      denominacion_50: this.dropData.denominacion_50 || 0,
      denominacion_20: this.dropData.denominacion_20 || 0,
      denominacion_10: this.dropData.denominacion_10 || 0,
      denominacion_5: this.dropData.denominacion_5 || 0,
      denominacion_1: this.dropData.denominacion_1 || 0
    };

    this.dropsService.createOrUpdateDrop(dropData).subscribe({
      next: (drop: Drop) => {
        this.loadDrops(); // Recargar la lista
        this.resetForm();
      },
      error: (error: any) => {
      }
    });
  }

  deleteDrop(id: number) {
    

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este drop?',
      entity: {
        id: id,
        nombre: 'Drop',
        tipo: 'Drop'
      },
      warningText: 'Esta acción eliminará permanentemente el drop.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionDrop(id);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionDrop(id: number) {
    
    
    this.dropsService.deleteDrop(id).subscribe({
      next: () => {
        
        this.loadDrops(); // Recargar la lista
        
      },
      error: (error: any) => {
        
        
        if (error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el drop',
            message: 'Este drop tiene relaciones que impiden su eliminación.',
            entity: {
              id: id,
              nombre: 'Drop',
              tipo: 'drop'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este drop, primero debe eliminar o reasignar los elementos relacionados.'
          });
        } else {
          
        }
      }
    });
  }

  resetForm() {
    this.selectedMesaId = null;
    this.dropData = {
      denominacion_100: 0,
      denominacion_50: 0,
      denominacion_20: 0,
      denominacion_10: 0,
      denominacion_5: 0,
      denominacion_1: 0
    };
  }

  getTotalDenominacion(denominacion: number): number {
    return this.drops.reduce((total, drop) => {
      switch (denominacion) {
        case 100: return total + (drop.denominacion_100 * 100);
        case 50: return total + (drop.denominacion_50 * 50);
        case 20: return total + (drop.denominacion_20 * 20);
        case 10: return total + (drop.denominacion_10 * 10);
        case 5: return total + (drop.denominacion_5 * 5);
        case 1: return total + (drop.denominacion_1 * 1);
        default: return total;
      }
    }, 0);
  }

  getTotalGeneral(): number {
    return this.drops.reduce((total, drop) => total + Number(drop.total), 0);
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

  getSalaName(): string {
    // Buscar la sala en userSalas usando el salaId de la ruta
    const sala = this.userSalas.find(s => s.id === this.salaId);
    return sala ? sala.nombre : 'Sala';
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
