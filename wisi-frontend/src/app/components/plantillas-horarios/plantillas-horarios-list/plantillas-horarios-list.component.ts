import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { PlantillasHorariosService } from '../../../services/plantillas-horarios.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { AreasService } from '../../../services/areas.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-plantillas-horarios-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="plantillas-container">
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
              <th>Código</th>
              <th>Descripción</th>
              <th>Sala</th>
              <th>Horas de Trabajo</th>
              <th>Color</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let plantilla of plantillas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ plantilla.codigo || '-' }}</td>
              <td>{{ plantilla.nombre }}</td>
              <td>{{ plantilla.Sala?.nombre || 'Sin asignar' }}</td>
              <td>
                <div *ngIf="plantilla.hora_entrada && plantilla.hora_salida" class="timeline-container">
                  <div class="timeline-main">
                    <span class="timeline-start">{{ plantilla.hora_entrada }}</span>
                    <ng-container *ngIf="plantilla.hora_descanso_entrada && plantilla.hora_descanso_salida; else noBreakPlaceholder">
                      <div class="timeline-break-container">
                        <div class="timeline-break">
                          {{ plantilla.hora_descanso_entrada }} - {{ plantilla.hora_descanso_salida }}
                        </div>
                      </div>
                    </ng-container>
                    <ng-template #noBreakPlaceholder>
                      <div class="timeline-no-break-placeholder">
                        No hay descanso
                      </div>
                    </ng-template>
                    <span class="timeline-end">{{ plantilla.hora_salida }}</span>
                  </div>
                </div>
                <div *ngIf="!plantilla.hora_entrada || !plantilla.hora_salida" class="timeline-container timeline-container-full">
                  <div class="timeline-main">
                    <span class="timeline-no-schedule-text">Sin horario</span>
                  </div>
                </div>
              </td>
              <td>
                <span class="color-indicator" 
                      [style.background-color]="plantilla.color"
                      [title]="plantilla.color">
                </span>
              </td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editPlantilla(plantilla) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deletePlantilla(plantilla.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="plantillas.length === 0" class="no-data">
        <p>No hay plantillas de horarios registradas</p>
      </div>

      <!-- Modal para crear/editar plantilla -->
      <div *ngIf="showSalaModal" class="modal-overlay" (click)="closeSalaSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedPlantilla ? 'Editar Plantilla Horario' : 'Crear Nueva Plantilla Horario' }}</h3>
            <button class="close-btn" (click)="closeSalaSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createPlantilla()" #plantillaForm="ngForm">
              <div class="form-group">
                <label for="codigoPlantilla">Código:</label>
                <input 
                  type="text" 
                  id="codigoPlantilla" 
                  name="codigoPlantilla"
                  [(ngModel)]="nuevaPlantilla.codigo"
                  class="form-control"
                  placeholder="Código identificador (obligatorio)"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="nombrePlantilla">Descripción:</label>
                <input 
                  type="text" 
                  id="nombrePlantilla" 
                  name="nombrePlantilla"
                  [(ngModel)]="nuevaPlantilla.nombre"
                  class="form-control"
                  placeholder="Descripción de la plantilla (opcional)"
                />
              </div>
              
              <div class="form-group" *ngIf="!selectedPlantilla">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="salaSelect"
                  [(ngModel)]="nuevaPlantilla.sala_id"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione una sala</option>
                  <option *ngFor="let sala of userSalas" [value]="sala.id">
                    {{ sala.nombre }}
                  </option>
                </select>
              </div>

              <div class="row">
                <div class="col-md-6">
              <div class="form-group">
                <label for="horaEntrada">Hora de Entrada:</label>
                <input 
                  type="time" 
                  id="horaEntrada" 
                  name="horaEntrada"
                  [(ngModel)]="nuevaPlantilla.hora_entrada"
                  (ngModelChange)="onHoraEntradaChange($event)"
                  class="form-control"
                />
              </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="horaSalida">Hora de Salida:</label>
                    <input 
                      type="time" 
                      id="horaSalida" 
                      name="horaSalida"
                      [(ngModel)]="nuevaPlantilla.hora_salida"
                      (ngModelChange)="onHoraSalidaChange($event)"
                      class="form-control"
                      [disabled]="!isHoraSalidaEnabled()"
                    />
                  </div>
                </div>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="horaDescansoEntrada">Entrada Descanso:</label>
                    <input 
                      type="time" 
                      id="horaDescansoEntrada" 
                      name="horaDescansoEntrada"
                      [(ngModel)]="nuevaPlantilla.hora_descanso_entrada"
                      (ngModelChange)="onHoraDescansoEntradaChange($event)"
                      class="form-control"
                      [class.invalid]="isHoraDescansoEntradaInvalid()"
                      [disabled]="!isHoraDescansoEntradaEnabled()"
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="horaDescansoSalida">Salida Descanso:</label>
                    <input 
                      type="time" 
                      id="horaDescansoSalida" 
                      name="horaDescansoSalida"
                      [(ngModel)]="nuevaPlantilla.hora_descanso_salida"
                      (ngModelChange)="onHoraDescansoSalidaChange($event)"
                      class="form-control"
                      [class.invalid]="isHoraDescansoSalidaInvalid()"
                      [disabled]="!isHoraDescansoSalidaEnabled()"
                    />
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label for="colorPlantilla">Color:</label>
                <div class="color-input-container">
                  <input 
                    type="text" 
                    id="colorPlantilla" 
                    name="colorPlantilla"
                    [(ngModel)]="nuevaPlantilla.color"
                    class="form-control color-text-input"
                    placeholder="#ffffff"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    title="Ingrese un código de color hexadecimal válido (ej: #ffffff)"
                    (input)="onColorInputChange($event)"
                  />
                  <input 
                    type="color" 
                    class="color-picker-input"
                    [value]="nuevaPlantilla.color || '#ffffff'"
                    (change)="onColorPickerChange($event)"
                    title="Seleccionar color visualmente"
                  />
                </div>
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeSalaSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!isFormValid()">
                  {{ selectedPlantilla ? 'Actualizar Plantilla' : 'Guardar Plantilla' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userSalas.length === 0 && !selectedPlantilla" class="no-salas">
              <p>No tienes salas asignadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .plantillas-container {
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

    .color-indicator {
      display: inline-block;
      width: 40px; /* tamaño aumentado */
      height: 40px; /* tamaño aumentado */
      border-radius: 50%;
      border: 2px solid #ddd;
      cursor: pointer;
    }

    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }

    .bg-primary {
      background-color: #007bff !important;
      color: white !important;
    }

    .bg-info {
      background-color: #17a2b8 !important;
      color: white !important;
    }

    .text-muted {
      color: #6c757d !important;
    }

    .mt-1 {
      margin-top: 0.25rem;
    }

    /* Estilos para la línea de tiempo */
    .timeline-container {
      display: block;
      width: 223.43px; /* ancho fijo en el contenedor superior */
      margin: 0; /* alineado a la izquierda */
    }

    /* For no-schedule rows: make container full width like others */
    .timeline-container-full {
      display: block;
      width: 223.43px; /* mismo ancho que los demás */
      margin: 0; /* alineado a la izquierda */
    }
    .timeline-container-full .timeline-main {
      width: 100%; /* mismo tamaño que su contenedor */
      justify-content: center; /* centrar el texto dentro */
    }

    .timeline-main {
      display: inline-flex;
      align-items: center;
      background: #e9ecef;
      border-radius: 8px;
      padding: 8px 10px; /* padding ajustado según solicitud */
      min-height: 40px;
      position: relative;
      width: auto; /* ancho controlado por el contenedor superior */
      max-width: 100%;
      box-sizing: border-box;
    }

    .timeline-start {
      background: #17a2b8;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      margin-right: 4px;
    }

    .timeline-end {
      background: #17a2b8;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: bold;
      font-size: 12px;
      margin-left: 4px;
    }

    .timeline-break-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin: 0 4px;
    }

    .timeline-break {
      background: rgba(23, 162, 184, 0.4);
      color: white;
      padding: 6px 12px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 11px;
      border: none; /* sin borde externo */
      box-shadow: none; /* sin borde interno */
    }

    .timeline-no-break-placeholder {
      display: flex;
      justify-content: center;
      align-items: center;
      color: #6c757d;
      font-size: 12px;
      font-style: italic;
      margin: 0 4px;
    }

    .timeline-no-schedule-text {
      color: #6c757d;
      font-size: 14px;
      font-style: italic;
      font-weight: 500;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    .no-break-text {
      text-align: center;
      margin-top: 5px;
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

    .form-control.invalid {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
    }

    .form-control.invalid:focus {
      border-color: #dc3545;
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.2);
    }

    .color-input {
      width: 60px;
      height: 40px;
      padding: 4px;
      cursor: pointer;
    }

    .color-input-container {
      display: flex;
      gap: 10px;
      align-items: stretch; /* Para que ambos inputs tengan la misma altura */
      height: 48px; /* Altura fija para coincidir con otros inputs */
    }

    .color-text-input {
      flex: 1;
    }

    .color-picker-input {
      width: 50px;
      height: 48px; /* Misma altura que los otros inputs (12px padding + 24px font-size + 12px padding) */
      border: 2px solid #e9ecef;
      border-radius: 6px;
      cursor: pointer;
      padding: 0;
      box-sizing: border-box;
    }

    .color-picker-input:hover {
      border-color: #28a745;
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

    .row {
      display: flex;
      flex-wrap: wrap;
      margin-right: -15px;
      margin-left: -15px;
    }

    .col-md-6 {
      position: relative;
      width: 100%;
      padding-right: 15px;
      padding-left: 15px;
    }

    @media (min-width: 768px) {
      .col-md-6 {
        flex: 0 0 50%;
        max-width: 50%;
      }
    }
  `]
})
export class PlantillasHorariosListComponent implements OnInit, OnDestroy {
  plantillas: any[] = [];
  userSalas: any[] = [];
  showSalaModal = false;
  selectedPlantilla: any = null;
  
  nuevaPlantilla: {
    id: number | null;
    nombre: string;
    codigo: string;
    sala_id: number | null;
    hora_entrada: string | null;
    hora_salida: string | null;
    hora_descanso_entrada: string | null;
    hora_descanso_salida: string | null;
    color: string;
  } = {
    id: null,
    nombre: '',
    codigo: '',
    sala_id: null,
    hora_entrada: null,
    hora_salida: null,
    hora_descanso_entrada: null,
    hora_descanso_salida: null,
    color: '#ffffff'
  };

  private permissionsSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private plantillasHorariosService: PlantillasHorariosService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private areasService: AreasService,
    private router: Router,
    private route: ActivatedRoute,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar módulos primero
    this.modulesService.loadModules();
    
    this.loadPlantillas();
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(() => {
      // Los permisos se actualizan automáticamente
    });
  }

  isFormValid(): boolean {
    // Validación básica del formulario - solo código y sala son obligatorios
    if (!this.nuevaPlantilla.codigo || !this.nuevaPlantilla.sala_id) {
      return false;
    }

    // Validación de horas: si defines entrada, DEBES definir salida
    const tieneEntrada = this.nuevaPlantilla.hora_entrada && this.nuevaPlantilla.hora_entrada !== null;
    const tieneSalida = this.nuevaPlantilla.hora_salida && this.nuevaPlantilla.hora_salida !== null;
    
    if (tieneEntrada && !tieneSalida) {
      return false; // No puede tener entrada sin salida
    }
    
    // Ya no se valida si hora de salida es menor que hora de entrada

    // Validación de descanso: si defines entrada descanso, DEBES definir salida descanso
    const tieneDescansoEntrada = this.nuevaPlantilla.hora_descanso_entrada && this.nuevaPlantilla.hora_descanso_entrada !== null;
    const tieneDescansoSalida = this.nuevaPlantilla.hora_descanso_salida && this.nuevaPlantilla.hora_descanso_salida !== null;
    
    if (tieneDescansoEntrada && !tieneDescansoSalida) {
      return false; // No puede tener entrada descanso sin salida descanso
    }
    
    if (tieneDescansoEntrada && tieneDescansoSalida && this.nuevaPlantilla.hora_descanso_salida! <= this.nuevaPlantilla.hora_descanso_entrada!) {
      return false; // Salida descanso debe ser mayor que entrada descanso
    }

    // Validación adicional: hora de descanso salida debe ser menor o igual a hora de salida principal
    if (tieneDescansoSalida && tieneSalida && this.nuevaPlantilla.hora_descanso_salida! > this.nuevaPlantilla.hora_salida!) {
      return false; // Descanso salida no puede ser mayor que salida principal
    }

    return true;
  }

  // Obtener mensaje de error de validación
  getValidationMessage(): string {
    if (!this.nuevaPlantilla.codigo || !this.nuevaPlantilla.sala_id) {
      return 'Código y sala son campos obligatorios';
    }

    const tieneEntrada = this.nuevaPlantilla.hora_entrada && this.nuevaPlantilla.hora_entrada !== null;
    const tieneSalida = this.nuevaPlantilla.hora_salida && this.nuevaPlantilla.hora_salida !== null;
    
    if (tieneEntrada && !tieneSalida) {
      return 'Si defines hora de entrada, debes definir hora de salida';
    }
    
    // Ya no se muestra mensaje cuando la hora de salida es menor a la de entrada

    const tieneDescansoEntrada = this.nuevaPlantilla.hora_descanso_entrada && this.nuevaPlantilla.hora_descanso_entrada !== null;
    const tieneDescansoSalida = this.nuevaPlantilla.hora_descanso_salida && this.nuevaPlantilla.hora_descanso_salida !== null;
    
    if (tieneDescansoEntrada && !tieneDescansoSalida) {
      return 'Si defines hora de entrada de descanso, debes definir hora de salida de descanso';
    }
    
    if (tieneDescansoEntrada && tieneDescansoSalida && this.nuevaPlantilla.hora_descanso_salida! <= this.nuevaPlantilla.hora_descanso_entrada!) {
      return 'La hora de salida de descanso debe ser mayor que la hora de entrada de descanso';
    }

    // Validación adicional: hora de descanso salida debe ser menor o igual a hora de salida principal
    if (tieneDescansoSalida && tieneSalida && this.nuevaPlantilla.hora_descanso_salida! > this.nuevaPlantilla.hora_salida!) {
      return 'La hora de salida de descanso no puede ser mayor que la hora de salida principal';
    }

    return '';
  }

  // ===== MÉTODOS DE VALIDACIÓN DE HORAS =====

  // Hora de Salida
  isHoraSalidaEnabled(): boolean {
    return !!(this.nuevaPlantilla.hora_entrada && this.nuevaPlantilla.hora_entrada !== null);
  }

  getMinHoraSalida(): string {
    if (!this.nuevaPlantilla.hora_entrada) return '';
    return this.nuevaPlantilla.hora_entrada;
  }

  onHoraEntradaChange(value: string): void {
    this.nuevaPlantilla.hora_entrada = value;
    
    // Si se borra la hora de entrada, borrar automáticamente hora de salida y descansos
    if (!value) {
      this.nuevaPlantilla.hora_salida = null;
      this.nuevaPlantilla.hora_descanso_entrada = null;
      this.nuevaPlantilla.hora_descanso_salida = null;
    }
  }

  onHoraSalidaChange(value: string): void {
    this.nuevaPlantilla.hora_salida = value;
  }

  // Hora Descanso Entrada
  isHoraDescansoEntradaEnabled(): boolean {
    const isEnabled = !!(this.nuevaPlantilla.hora_entrada && this.nuevaPlantilla.hora_salida && 
              this.nuevaPlantilla.hora_entrada !== null && 
              this.nuevaPlantilla.hora_salida !== null);
    
    // Si se habilita por primera vez, asegurar que esté vacío
    if (isEnabled && (!this.nuevaPlantilla.hora_descanso_entrada || this.nuevaPlantilla.hora_descanso_entrada === '')) {
      this.nuevaPlantilla.hora_descanso_entrada = null;
    }
    
    return isEnabled;
  }

  getMinHoraDescansoEntrada(): string {
    return '';
  }

  getMaxHoraDescansoEntrada(): string {
    return '';
  }

  onHoraDescansoEntradaChange(value: string): void {
    this.nuevaPlantilla.hora_descanso_entrada = value;

    // Si se borra la entrada de descanso, borrar automáticamente la salida de descanso
    if (!value) {
      this.nuevaPlantilla.hora_descanso_salida = null;
    }
  }

  // Hora Descanso Salida
  isHoraDescansoSalidaEnabled(): boolean {
    const isEnabled = !!(this.nuevaPlantilla.hora_descanso_entrada && 
              this.nuevaPlantilla.hora_descanso_entrada !== null);
    
    // Si se habilita por primera vez, asegurar que esté vacío
    if (isEnabled && (!this.nuevaPlantilla.hora_descanso_salida || this.nuevaPlantilla.hora_descanso_salida === '')) {
      this.nuevaPlantilla.hora_descanso_salida = null;
    }
    
    return isEnabled;
  }

  getMinHoraDescansoSalida(): string {
    return '';
  }

  getMaxHoraDescansoSalida(): string {
    return '';
  }

  onHoraDescansoSalidaChange(value: string): void {
    this.nuevaPlantilla.hora_descanso_salida = value;
  }

  // ===== Utilidades de comparación de horas =====
  private timeToMinutes(time: string | null): number | null {
    if (!time) return null;
    const [h, m] = time.split(":").map((v) => parseInt(v, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  private cruzaMedianoche(): boolean {
    const e = this.timeToMinutes(this.nuevaPlantilla.hora_entrada);
    const s = this.timeToMinutes(this.nuevaPlantilla.hora_salida);
    if (e === null || s === null) return false;
    return s < e; // p.ej. 19:00 -> 07:00
  }

  private isDescansoEntradaValido(value: string | null): boolean {
    const e = this.timeToMinutes(this.nuevaPlantilla.hora_entrada);
    const s = this.timeToMinutes(this.nuevaPlantilla.hora_salida);
    const v = this.timeToMinutes(value);
    if (e === null || s === null || v === null) return true;
    if (this.cruzaMedianoche()) {
      // válido si v >= e o v <= s
      return v >= e || v <= s;
    }
    return v >= e && v <= s;
  }

  private isDescansoSalidaValido(value: string | null): boolean {
    const de = this.timeToMinutes(this.nuevaPlantilla.hora_descanso_entrada);
    const s = this.timeToMinutes(this.nuevaPlantilla.hora_salida);
    const v = this.timeToMinutes(value);
    if (de === null || v === null || s === null) return true;
    if (this.cruzaMedianoche()) {
      // válido si v >= entrada descanso o v <= salida
      return v >= de || v <= s;
    }
    return v >= de && v <= s;
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  // Métodos para manejo del input de color
  onColorInputChange(event: any): void {
    const value = event.target.value;
    // Validar que sea un código hexadecimal válido
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      this.nuevaPlantilla.color = value;
    }
  }

  onColorPickerChange(event: any): void {
    this.nuevaPlantilla.color = event.target.value;
  }

  // Métodos para validación visual de campos
  isHoraSalidaInvalid(): boolean {
    return false; // sin validación visual (borde rojo) para hora de salida
  }

  isHoraDescansoEntradaInvalid(): boolean {
    return false; // sin validación visual para entrada descanso
  }

  isHoraDescansoSalidaInvalid(): boolean {
    return false; // sin validación visual para salida descanso
  }

  // Método para formatear valores de tiempo para inputs HTML
  formatTimeForInput(timeValue: any): string | null {
    if (!timeValue) return null;
    
    // Si ya es un string en formato HH:MM completo, devolverlo
    if (typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    
    // Si es un objeto Date o similar, convertir a formato HH:MM
    if (timeValue instanceof Date) {
      return timeValue.toTimeString().substring(0, 5);
    }
    
    // Si es un string con formato diferente, intentar extraer HH:MM completo
    if (typeof timeValue === 'string') {
      const timeMatch = timeValue.match(/(\d{1,2}):(\d{2})/);
      if (timeMatch) {
        const hours = timeMatch[1].padStart(2, '0');
        const minutes = timeMatch[2];
        return `${hours}:${minutes}`;
      }
      
      // Si contiene solo horas sin minutos completos (como "09:"), devolver null
      if (timeValue.includes(':') && !timeValue.match(/:\d{2}$/)) {
        return null;
      }
    }
    
    // Si no se puede formatear correctamente, devolver null
    return null;
  }

  canAdd(): boolean {
    return this.permissionsService.canAddByName('Plantillas Horarios');
  }

  canEdit(): boolean {
    return this.permissionsService.canEditByName('Plantillas Horarios');
  }

  canDelete(): boolean {
    return this.permissionsService.canDeleteByName('Plantillas Horarios');
  }

  loadPlantillas(): void {
    this.plantillasHorariosService.getPlantillasHorarios().subscribe({
      next: (plantillas) => {
        this.plantillas = plantillas;
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
    this.selectedPlantilla = null;
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
    this.nuevaPlantilla = {
      id: null,
      nombre: '',
      codigo: '',
      sala_id: null,
      hora_entrada: null,
      hora_salida: null,
      hora_descanso_entrada: null,
      hora_descanso_salida: null,
      color: '#ffffff'
    };
  }

  createPlantilla(): void {
    if (!this.isFormValid()) {
      
      return;
    }

    // Si la descripción está vacía, usar el código como nombre
    const nombreFinal = this.nuevaPlantilla.nombre?.trim() || this.nuevaPlantilla.codigo;

    const plantillaData = {
      nombre: nombreFinal,
      codigo: this.nuevaPlantilla.codigo,
      sala_id: this.nuevaPlantilla.sala_id,
      hora_entrada: this.nuevaPlantilla.hora_entrada || null,
      hora_salida: this.nuevaPlantilla.hora_salida || null,
      hora_descanso_entrada: this.nuevaPlantilla.hora_descanso_entrada || null,
      hora_descanso_salida: this.nuevaPlantilla.hora_descanso_salida || null,
      color: this.nuevaPlantilla.color || '#ffffff'
    };

    if (this.selectedPlantilla && this.nuevaPlantilla.id) {
      this.plantillasHorariosService.updatePlantillaHorario(this.nuevaPlantilla.id, plantillaData).subscribe({
        next: (response) => {
          this.loadPlantillas();
          this.closeSalaSelector();
        },
        error: (error) => {
          
        }
      });
    } else {
      this.plantillasHorariosService.createPlantillaHorario(plantillaData).subscribe({
        next: (response) => {
          this.loadPlantillas();
          this.closeSalaSelector();
        },
        error: (error) => {
          
        }
      });
    }
  }

  editPlantilla(plantilla: any): void {
    this.selectedPlantilla = plantilla;
    this.nuevaPlantilla = {
      id: plantilla.id,
      nombre: plantilla.nombre,
      codigo: plantilla.codigo || '',
      sala_id: plantilla.sala_id,
      hora_entrada: this.formatTimeForInput(plantilla.hora_entrada),
      hora_salida: this.formatTimeForInput(plantilla.hora_salida),
      hora_descanso_entrada: this.formatTimeForInput(plantilla.hora_descanso_entrada),
      hora_descanso_salida: this.formatTimeForInput(plantilla.hora_descanso_salida),
      color: plantilla.color || '#ffffff'
    };
    
    this.showSalaModal = true;
  }

  deletePlantilla(id: number | null): void {
    if (!id) return;
    
    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar esta plantilla de horario?',
      entity: {
        id: id,
        nombre: 'Plantilla Horario',
        tipo: 'Plantilla Horario'
      },
      warningText: 'Esta acción eliminará permanentemente la plantilla de horario.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionPlantilla(id);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionPlantilla(id: number) {
    this.plantillasHorariosService.deletePlantillaHorario(id).subscribe({
      next: (response) => {
        this.plantillas = this.plantillas.filter(plantilla => plantilla.id !== id);
      },
      error: (error) => {
        
      }
    });
  }
}
