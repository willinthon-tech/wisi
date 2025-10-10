import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-marcaje-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="marcaje-personal-container">

      <div class="filters-section">
        <div class="date-filters">
          <div class="filter-group">
            <label for="grupo">Grupo:</label>
            <select 
              id="grupo"
              [(ngModel)]="grupoSeleccionado" 
              name="grupo"
              class="form-select"
              (change)="cargarDatos()">
              <option value="salas">Salas</option>
              <option value="areas">Areas</option>
              <option value="departamentos">Departamentos</option>
              <option value="cargos">Cargos</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="fechaDesde">Desde:</label>
            <input 
              type="date" 
              id="fechaDesde"
              [(ngModel)]="fechaDesde" 
              name="fechaDesde"
              class="form-input"
              (change)="cargarDatos()">
          </div>
          
          <div class="filter-group">
            <label for="fechaHasta">Hasta:</label>
            <input 
              type="date" 
              id="fechaHasta"
              [(ngModel)]="fechaHasta" 
              name="fechaHasta"
              class="form-input"
              (change)="cargarDatos()">
          </div>
          
          <button class="btn-primary" (click)="cargarDatos()" [disabled]="loading">
            {{ loading ? 'Cargando...' : 'Actualizar' }}
          </button>
        </div>
      </div>


      <div class="grupos-container" *ngIf="!loading && grupos.length > 0">
        <div class="grupo-card" *ngFor="let grupo of grupos">
          <div class="grupo-header">
            <h3>{{ grupo.nombre }}</h3>
            <span class="empleados-count">{{ grupo.empleados.length }} empleado(s)</span>
          </div>
          
          <div class="grupo-table-container">
            <div class="table-wrapper">
              <table class="horario-table">
                <thead>
                  <tr class="mes-header">
                    <th class="empleado-completo-col-empty" [attr.colspan]="2" [attr.rowspan]="3">Empleado</th>
                    <th *ngFor="let mes of mesesAgrupados" 
                        [attr.colspan]="mes.colspan" 
                        class="mes-group-col">
                      {{ mes.nombre }}
                    </th>
                  </tr>
                  <tr class="dia-header">
                    <th *ngFor="let dia of diasDelMes" class="dia-col">
                      {{ formatDay(dia) }}
                    </th>
                  </tr>
                  <tr class="dia-semana-header">
                    <th *ngFor="let dia of diasDelMes" class="dia-semana-col">
                      {{ formatDayOfWeek(dia) }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngFor="let empleado of grupo.empleados">
                    <!-- Fila de Entrada -->
                    <tr>
                      <td class="empleado-completo-cell" [attr.rowspan]="3">
                        <div class="empleado-completo">
                          <div class="foto-container">
                            <img *ngIf="empleado.foto" 
                                 [src]="getFotoUrl(empleado.foto)" 
                                 [alt]="empleado.nombre"
                                 class="foto-real">
                            <div *ngIf="!empleado.foto" class="foto-placeholder">
                              <i class="fas fa-user"></i>
                            </div>
                          </div>
                          <div class="empleado-info">
                            <div class="empleado-nombre">{{ empleado.nombre }}</div>
                            <div class="empleado-cedula">{{ empleado.cedula }}</div>
                            <div class="empleado-cargo">{{ empleado.Cargo?.nombre || 'Sin cargo' }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="horario-cell">
                        <div class="horario-info">
                          Horario
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class.month-divider]="isMonthDivider(dia, i)"
                          [class]="getTurnoClass(empleado, dia)"
                          [attr.rowspan]="getTurnoClass(empleado, dia) === 'turno-libre' ? 3 : 1">
                        <div class="horario-data" 
                             [class.libre-vertical]="getTurnoClass(empleado, dia) === 'turno-libre'">
                          <span *ngIf="getTurnoClass(empleado, dia) === 'turno-libre'">LIBRE</span>
                          <span *ngIf="getTurnoClass(empleado, dia) !== 'turno-libre'">
                            {{ getHorarioInfo(empleado, dia, 'Entrada') }}
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Fila de Marcaje -->
                    <tr>
                      <td class="horario-cell">
                        <div class="horario-info">
                          Marcaje
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class.month-divider]="isMonthDivider(dia, i)"
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="getTurnoClass(empleado, dia) === 'turno-libre' ? 'none' : 'table-cell'">
                        <div class="horario-data">
                          {{ getHorarioInfo(empleado, dia, 'Descanso') }}
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Fila de Calculo -->
                    <tr>
                      <td class="horario-cell">
                        <div class="horario-info">
                          Calculo
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class.month-divider]="isMonthDivider(dia, i)"
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="getTurnoClass(empleado, dia) === 'turno-libre' ? 'none' : 'table-cell'">
                        <div class="horario-data">
                          {{ getHorarioInfo(empleado, dia, 'Salida') }}
                        </div>
                      </td>
                    </tr>
                  </ng-container>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando empleados...</p>
      </div>

      <div class="empty-state" *ngIf="!loading && grupos.length === 0">
        <i class="fas fa-users"></i>
        <p>No hay empleados asignados a tu sede</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block !important;
      height: auto !important;
      overflow: visible !important;
    }
    
    .marcaje-personal-container {
      padding: 20px;
      max-width: 100%;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: 100vh;
      height: auto !important;
      overflow: visible !important;
      position: relative !important;
    }

    .header-section {
      text-align: center;
      margin-bottom: 30px;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .header-section h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 28px;
      font-weight: bold;
    }

    .subtitle {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .filters-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .date-filters {
      display: flex;
      gap: 20px;
      align-items: end;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .filter-group label {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }

    .form-input, .form-select {
      padding: 10px 15px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    .form-select {
      background-color: white;
      cursor: pointer;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      height: fit-content;
    }

    .btn-primary:hover:not(:disabled) {
      background: #45a049;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    .table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .table-wrapper {
      overflow-x: auto;
      /* Ocultar la barra de scroll horizontal */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .table-wrapper::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .horario-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 800px;
    }

    /* Fijar la columna "Empleado" (información del empleado) */
    .empleado-completo-cell {
      position: sticky !important;
      left: 0 !important;
      z-index: 10 !important;
      background-color: white !important;
    }

    /* Fijar las etiquetas de horario (Entrada, Descanso, Salida) */
    .horario-cell {
      position: sticky !important;
      left: 200px !important; /* Ancho de la columna empleado */
      z-index: 9 !important;
      background-color: #f0f8f0 !important;
    }

    /* Fijar el encabezado "Empleado" */
    .mes-header th.empleado-completo-col-empty {
      position: sticky !important;
      left: 0 !important;
      z-index: 11 !important;
      background-color: #28a745 !important;
    }

    /* Fijar encabezados de días verticalmente */
    .mes-header th {
      position: sticky !important;
      top: 0 !important;
      z-index: 8 !important;
      background-color: #28a745 !important;
    }

    .dia-header th {
      position: sticky !important;
      top: 40px !important;
      z-index: 8 !important;
      background-color: #28a745 !important;
    }

    .dia-semana-header th {
      position: sticky !important;
      top: 80px !important;
      z-index: 8 !important;
      background-color: #28a745 !important;
    }

    .horario-table th {
      background: #4CAF50;
      color: white;
      padding: 15px 8px;
      text-align: center;
      font-weight: bold;
      font-size: 12px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .horario-table td {
      padding: 12px 8px;
      text-align: center;
      border-bottom: 1px solid #eee;
      font-size: 12px;
    }

    .horario-table tr:hover {
      background: #f8f9fa;
    }


    .empleado-completo-col, .empleado-completo-cell {
      width: 200px;
      min-width: 200px;
      text-align: left;
      border-right: 2px solid #ddd;
    }

    .empleado-completo-col[colspan="2"] {
      text-align: center;
      font-size: 14px;
      font-weight: 700;
    }

    .empleado-completo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      text-align: center;
    }

    .foto-container {
      flex-shrink: 0;
    }

    .foto-real {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .foto-placeholder {
      width: 80px;
      height: 80px;
      background: #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 24px;
    }

    .empleado-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      text-align: center;
    }

    .empleado-nombre {
      font-weight: bold;
      color: #333;
      font-size: 14px;
      line-height: 1.2;
      text-align: center;
    }

    .empleado-cedula {
      color: #666;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
    }

    .empleado-cargo {
      color: #888;
      font-size: 11px;
      line-height: 1.2;
      text-align: center;
      font-style: italic;
    }

    .empleado-completo-col-empty {
      width: 200px;
      min-width: 200px;
      border-right: 2px solid rgba(255, 255, 255, 0.3);
    }

    .empleado-completo-col-empty[colspan="2"] {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
    }

    .mes-group-col {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      color: white;
      padding: 12px 8px;
      min-height: 50px;
      vertical-align: middle;
      border-right: 2px solid rgba(255, 255, 255, 0.3);
    }

    .mes-group-col:last-child {
      border-right: none;
    }

    .dia-col, .dia-cell {
      width: 150px;
      min-width: 150px;
    }

    .dia-cell {
      border-right: 1px solid #e0e0e0;
    }

    .dia-cell:last-child {
      border-right: none;
    }

    .mes-header {
      background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
      color: white;
    }

    .mes-header th {
      border: none;
      padding: 12px 8px;
      font-size: 16px;
      font-weight: 700;
      min-height: 50px;
      vertical-align: middle;
    }

    .dia-header {
      background: #4CAF50;
      color: white;
    }

    .dia-header th {
      border: none;
      padding: 6px 2px 2px 2px;
      font-size: 14px;
      font-weight: 600;
    }

    .dia-semana-header {
      background: #4CAF50;
      color: white;
    }

    .dia-semana-header th {
      border: none;
      padding: 2px 2px 6px 2px;
      font-size: 12px;
      font-weight: 600;
    }

    .dia-semana-col {
      width: 40px;
      min-width: 40px;
      text-align: center;
    }

    .horario-col, .horario-cell {
      width: 80px;
      min-width: 80px;
      text-align: left;
    }

    .horario-col-empty {
      width: 80px;
      min-width: 80px;
      border-right: 2px solid rgba(255, 255, 255, 0.3);
    }

    .horario-info {
      font-size: 11px;
      font-weight: 500;
      color: #333;
      padding: 6px;
      line-height: 1.3;
      text-align: left;
    }

    /* Fondo verde muy claro para las filas de horarios */
    .horario-cell {
      background-color: #f0f8f0 !important;
    }

    .horario-cell:hover {
      background-color: #e8f5e8 !important;
    }


    .marcaje-indicator {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      font-weight: normal;
      font-size: 12px;
      background-color: white;
      border: 1px solid #e9ecef;
      color: #666;
    }

    .marcaje-indicator.presente {
      background-color: white;
      color: #666;
    }

    .marcaje-indicator.ausente {
      background-color: white;
      color: #666;
    }

    /* Estilos para datos de horario */
    .horario-data {
      font-size: 10px;
      text-align: center;
      padding: 2px;
      line-height: 1.2;
      color: #333;
    }

    /* Estilos para turnos */
    .turno-diurno {
      background-color: #fff3cd !important;
    }

    .turno-nocturno {
      background-color: #ffeaa7 !important;
    }

    .turno-libre {
      background-color: #f8f9fa !important;
    }

    .sin-horario {
      background-color: #f8f9fa !important;
      color: #6c757d !important;
      font-style: italic;
    }

    /* Estilo para texto LIBRE en vertical */
    .libre-vertical {
      writing-mode: vertical-rl;
      text-orientation: upright;
      text-align: center;
      font-weight: bold;
      font-size: 14px;
      color: #dc3545;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 90px;
      max-height: 90px;
    }

    /* Asegurar que las celdas LIBRE tengan la altura correcta */
    .turno-libre {
      height: 90px;
      vertical-align: middle;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #4CAF50;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .empty-state i {
      font-size: 48px;
      color: #6c757d;
      margin-bottom: 20px;
    }

    .empty-state p {
      color: #6c757d;
      font-size: 16px;
      margin: 0;
    }

    /* Estilos para tarjetas de grupos */
    .grupos-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 20px;
      height: auto !important;
      overflow: visible !important;
      min-height: auto !important;
      max-height: none !important;
    }

    .grupo-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
      height: auto !important;
      overflow: visible !important;
    }

    .grupo-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grupo-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .empleados-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .grupo-table-container {
      padding: 0;
      overflow-x: auto;
      /* Ocultar la barra de scroll horizontal */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .grupo-table-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .grupo-table-container .table-wrapper {
      min-width: 800px;
    }

    .grupo-table-container .horario-table {
      margin: 0;
      border-radius: 0;
    }

    .test-section {
      background: #e3f2fd;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #2196f3;
    }

    .test-section h3 {
      margin: 0 0 15px 0;
      color: #1976d2;
      font-size: 18px;
    }

    .test-section p {
      margin: 5px 0;
      color: #333;
      font-size: 14px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .marcaje-personal-container {
        padding: 15px;
      }

      .date-filters {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-group {
        width: 100%;
      }

      .horario-table {
        font-size: 11px;
      }

      .horario-table th,
      .horario-table td {
        padding: 8px 4px;
      }
    }
  `]
})
export class MarcajePersonalComponent implements OnInit {
  empleados: any[] = [];
  grupos: any[] = [];
  diasDelMes: Date[] = [];
  mesesAgrupados: { nombre: string, dias: Date[], colspan: number }[] = [];
  fechaDesde: string = '';
  fechaHasta: string = '';
  grupoSeleccionado: string = 'salas';
  loading = false;

  constructor(
    private empleadosService: EmpleadosService
  ) {}

  ngOnInit() {
    // Establecer fechas por defecto (último mes)
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);
    
    this.fechaHasta = hoy.toISOString().split('T')[0];
    this.fechaDesde = haceUnMes.toISOString().split('T')[0];
    
    this.generarDiasDelMes();
    this.cargarDatos();
  }

  private generarDiasDelMes() {
    if (this.fechaDesde && this.fechaHasta) {
      // Parsear las fechas manualmente para evitar problemas de zona horaria
      const [añoDesde, mesDesde, diaDesde] = this.fechaDesde.split('-').map(Number);
      const [añoHasta, mesHasta, diaHasta] = this.fechaHasta.split('-').map(Number);
      
      const inicio = new Date(añoDesde, mesDesde - 1, diaDesde);
      const fin = new Date(añoHasta, mesHasta - 1, diaHasta);
      this.diasDelMes = [];
      
      // Verificar que el rango no sea demasiado grande
      const diffTime = Math.abs(fin.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays > 60) {
        alert('El rango de fechas es demasiado grande. Por favor, selecciona un período de hasta 60 días.');
        this.empleados = [];
        this.loading = false;
        return;
      }
      
      // Empezar exactamente desde la fecha de inicio
      const fechaActual = new Date(inicio);
      
      while (fechaActual <= fin) {
        this.diasDelMes.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
      }
      
      console.log('Fechas generadas:', this.diasDelMes.map(d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`));
    }
  }

  cargarDatos() {
    if (!this.fechaDesde || !this.fechaHasta) {
      alert('Por favor selecciona las fechas');
      return;
    }

    this.loading = true;
    this.generarDiasDelMes();
    this.generarMesesAgrupados();

    this.empleadosService.getEmpleados().subscribe({
      next: (response) => {
        this.empleados = response || [];
        
        
        this.agruparEmpleados();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando empleados:', error);
        alert('Error cargando empleados: ' + (error.error?.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  agruparEmpleados() {
    this.grupos = [];
    
    if (this.grupoSeleccionado === 'salas') {
      this.agruparPorSalas();
    } else if (this.grupoSeleccionado === 'areas') {
      this.agruparPorAreas();
    } else if (this.grupoSeleccionado === 'departamentos') {
      this.agruparPorDepartamentos();
    } else if (this.grupoSeleccionado === 'cargos') {
      this.agruparPorCargos();
    }
  }

  agruparPorSalas() {
    const gruposMap = new Map();
    
    this.empleados.forEach(empleado => {
      const salaNombre = empleado.Cargo?.Departamento?.Area?.Sala?.nombre || 'Sin Sala';
      
      if (!gruposMap.has(salaNombre)) {
        gruposMap.set(salaNombre, {
          nombre: salaNombre,
          empleados: []
        });
      }
      
      gruposMap.get(salaNombre).empleados.push(empleado);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorAreas() {
    const gruposMap = new Map();
    
    this.empleados.forEach(empleado => {
      const sala = empleado.Cargo?.Departamento?.Area?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Departamento?.Area?.nombre || 'Sin Area';
      const nombreCompleto = `${sala} - ${area}`;
      
      if (!gruposMap.has(nombreCompleto)) {
        gruposMap.set(nombreCompleto, {
          nombre: nombreCompleto,
          empleados: []
        });
      }
      
      gruposMap.get(nombreCompleto).empleados.push(empleado);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorDepartamentos() {
    const gruposMap = new Map();
    
    this.empleados.forEach(empleado => {
      const sala = empleado.Cargo?.Departamento?.Area?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Departamento?.Area?.nombre || 'Sin Area';
      const departamento = empleado.Cargo?.Departamento?.nombre || 'Sin Departamento';
      const nombreCompleto = `${sala} - ${area} - ${departamento}`;
      
      if (!gruposMap.has(nombreCompleto)) {
        gruposMap.set(nombreCompleto, {
          nombre: nombreCompleto,
          empleados: []
        });
      }
      
      gruposMap.get(nombreCompleto).empleados.push(empleado);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorCargos() {
    const gruposMap = new Map();
    
    this.empleados.forEach(empleado => {
      const sala = empleado.Cargo?.Departamento?.Area?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Departamento?.Area?.nombre || 'Sin Area';
      const departamento = empleado.Cargo?.Departamento?.nombre || 'Sin Departamento';
      const cargo = empleado.Cargo?.nombre || 'Sin Cargo';
      const nombreCompleto = `${sala} - ${area} - ${departamento} - ${cargo}`;
      
      if (!gruposMap.has(nombreCompleto)) {
        gruposMap.set(nombreCompleto, {
          nombre: nombreCompleto,
          empleados: []
        });
      }
      
      gruposMap.get(nombreCompleto).empleados.push(empleado);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  formatMonth(fecha: Date): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const mes = meses[fecha.getMonth()];
    const año = fecha.getFullYear();
    return `${mes} ${año}`;
  }

  formatDay(fecha: Date): string {
    return fecha.getDate().toString().padStart(2, '0');
  }

  formatDayOfWeek(fecha: Date): string {
    const diasSemana = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return diasSemana[fecha.getDay()];
  }

  getHorarioEntrada(empleado: any): string {
    return empleado.Horario?.hora_entrada || '08:00';
  }

  getHorarioDescanso(empleado: any): string {
    return empleado.Horario?.hora_descanso || '12:00-13:00';
  }

  getHorarioSalida(empleado: any): string {
    return empleado.Horario?.hora_salida || '17:00';
  }

  isMonthDivider(dia: Date, index: number): boolean {
    // Si es el último día del array, no es divisora
    if (index === this.diasDelMes.length - 1) {
      return false;
    }
    
    // Si el siguiente día es de un mes diferente, entonces este día necesita línea divisora
    const siguienteDia = this.diasDelMes[index + 1];
    return dia.getMonth() !== siguienteDia.getMonth();
  }


  private generarMesesAgrupados() {
    this.mesesAgrupados = [];
    if (this.diasDelMes.length === 0) return;

    let currentMonthGroup: { nombre: string, dias: Date[], colspan: number } | null = null;

    this.diasDelMes.forEach(dia => {
      const monthName = this.formatMonth(dia);
      
      if (!currentMonthGroup || currentMonthGroup.nombre !== monthName) {
        currentMonthGroup = {
          nombre: monthName,
          dias: [],
          colspan: 0
        };
        this.mesesAgrupados.push(currentMonthGroup);
      }
      currentMonthGroup.dias.push(dia);
      currentMonthGroup.colspan++;
    });
  }

  getFotoUrl(foto: string): string {
    if (!foto) return '';
    
    // Si ya tiene el prefijo data:, devolver tal como está
    if (foto.startsWith('data:')) {
      return foto;
    }
    
    // Si no tiene prefijo, agregar el prefijo base64
    return `data:image/jpeg;base64,${foto}`;
  }

  getMarcajeStatus(empleadoId: number, dia: Date, tipoHorario?: string): boolean {
    // Retornar siempre false para mostrar cuadros vacíos
    return false;
  }

  // Función para obtener el bloque de horario para un día específico
  getBloqueHorario(empleado: any, dia: Date): any {
    if (!empleado.Horario || !empleado.Horario.bloques || empleado.Horario.bloques.length === 0) {
      return null;
    }

    // Asegurar que los bloques estén ordenados por 'orden'
    const bloques = empleado.Horario.bloques.sort((a: any, b: any) => a.orden - b.orden);
    const diasDesdeInicio = this.calcularDiasDesdeInicio(dia, empleado);
    
    // Si el día es anterior a la fecha de inicio, retornar null (sin horario)
    if (diasDesdeInicio < 0) {
      console.log(`Empleado: ${empleado.nombre}, Día: ${dia.toISOString().split('T')[0]} - ANTERIOR A FECHA INICIO (Sin horario)`);
      return null;
    }
    
    const indiceBloque = diasDesdeInicio % bloques.length;
    
    // Debug: mostrar información del cálculo
    console.log(`=== DEBUG BLOQUE HORARIO ===`);
    console.log(`Empleado: ${empleado.nombre}, Día: ${dia.toISOString().split('T')[0]}, Días desde inicio: ${diasDesdeInicio}, Índice bloque: ${indiceBloque}, Total bloques: ${bloques.length}`);
    console.log('Bloques orden:', bloques.map((b: any, i: number) => `${i}: ${b.turno} (orden: ${b.orden})`).join(', '));
    console.log(`Bloque seleccionado: ${bloques[indiceBloque]?.turno} (orden: ${bloques[indiceBloque]?.orden})`);
    console.log(`=== FIN DEBUG ===`);
    
    return bloques[indiceBloque];
  }

  // Calcular días desde la fecha de inicio del horario
  calcularDiasDesdeInicio(dia: Date, empleado?: any): number {
    let fechaInicioCiclo: Date | null = null;

    console.log(`=== DEBUG CALCULAR DIAS DESDE INICIO ===`);
    console.log(`Empleado: ${empleado?.nombre}`);
    console.log(`primer_dia_horario: ${empleado?.primer_dia_horario}`);
    console.log(`Horario.fecha_inicio: ${empleado?.Horario?.fecha_inicio}`);
    console.log(`this.fechaDesde: ${this.fechaDesde}`);

    // Prioridad 1: primer_dia_horario del empleado
    if (empleado?.primer_dia_horario) {
      // Crear fecha sin problemas de zona horaria
      const fechaStr = empleado.primer_dia_horario.split('T')[0]; // Solo la parte de fecha
      const [año, mes, dia] = fechaStr.split('-').map(Number);
      fechaInicioCiclo = new Date(año, mes - 1, dia); // mes - 1 porque Date usa 0-indexado
      console.log(`Usando primer_dia_horario: ${fechaInicioCiclo.toISOString().split('T')[0]}`);
    }
    // Prioridad 2: fecha_inicio del horario del empleado
    else if (empleado?.Horario?.fecha_inicio) {
      const fechaStr = empleado.Horario.fecha_inicio.split('T')[0];
      const [año, mes, dia] = fechaStr.split('-').map(Number);
      fechaInicioCiclo = new Date(año, mes - 1, dia);
      console.log(`Usando Horario.fecha_inicio: ${fechaInicioCiclo.toISOString().split('T')[0]}`);
    }
    // Prioridad 3: fechaDesde del componente (inicio del rango de visualización)
    else {
      fechaInicioCiclo = new Date(this.fechaDesde);
      console.log(`Usando this.fechaDesde: ${fechaInicioCiclo.toISOString().split('T')[0]}`);
    }

    // Si no se pudo determinar una fecha de inicio del ciclo, retornar un valor que indique "fuera de ciclo"
    if (!fechaInicioCiclo) {
      console.log(`No se pudo determinar fecha de inicio del ciclo`);
      return -1; // O algún otro valor que indique que no hay un punto de inicio válido
    }

    // Asegurarse de que la fecha de inicio del ciclo no tenga componentes de tiempo para una comparación precisa
    fechaInicioCiclo.setHours(0, 0, 0, 0);
    dia.setHours(0, 0, 0, 0);

    const diffTime = dia.getTime() - fechaInicioCiclo.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    console.log(`Fecha inicio ciclo: ${fechaInicioCiclo.toISOString().split('T')[0]}, Día: ${dia.toISOString().split('T')[0]}, Días desde inicio: ${dias}`);
    console.log(`=== FIN DEBUG CALCULAR DIAS ===`);

    return dias;
  }

  // Formatear hora a formato militar (24 horas) sin segundos
  formatearHora(hora: string): string {
    if (!hora) return '';
    
    // Si ya tiene formato HH:MM, usar directamente
    if (hora.includes(':')) {
      const [horas, minutos] = hora.split(':');
      const horaNum = parseInt(horas);
      const min = minutos || '00';
      
      // Asegurar formato HH:MM
      return `${horaNum.toString().padStart(2, '0')}:${min}`;
    }
    
    return hora;
  }

  // Obtener información de horario para mostrar en la celda
  getHorarioInfo(empleado: any, dia: Date, tipoHorario: string): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque) {
      // Si no hay bloque (fechas anteriores a la fecha de inicio), mostrar "Sin horario"
      return 'Sin horario';
    }

    let resultado = '';
    switch (tipoHorario) {
      case 'Turno':
        resultado = bloque.turno || '';
        break;
      case 'Entrada':
        // Mostrar horario completo: entrada - entrada almuerzo - salida almuerzo - salida
        const horaEntrada = this.formatearHora(bloque.hora_entrada || '');
        const horaSalida = this.formatearHora(bloque.hora_salida || '');
        
        if (bloque.tiene_descanso && bloque.hora_entrada_descanso && bloque.hora_salida_descanso) {
          const entradaDescanso = this.formatearHora(bloque.hora_entrada_descanso);
          const salidaDescanso = this.formatearHora(bloque.hora_salida_descanso);
          resultado = `${horaEntrada} - ${entradaDescanso} - ${salidaDescanso} - ${horaSalida}`;
        } else {
          resultado = `${horaEntrada} - Sin descanso - ${horaSalida}`;
        }
        break;
      case 'Descanso':
        if (bloque.tiene_descanso && bloque.hora_entrada_descanso && bloque.hora_salida_descanso) {
          const entradaDescanso = this.formatearHora(bloque.hora_entrada_descanso);
          const salidaDescanso = this.formatearHora(bloque.hora_salida_descanso);
          resultado = `${entradaDescanso} - ${salidaDescanso}`;
        } else {
          resultado = 'Sin descanso';
        }
        break;
      case 'Salida':
        resultado = this.formatearHora(bloque.hora_salida || '');
        break;
      default:
        resultado = '';
    }
    
    return resultado;
  }

  // Obtener clase CSS para el turno
  getTurnoClass(empleado: any, dia: Date): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque) {
      // Si no hay bloque (fechas anteriores a la fecha de inicio), no aplicar clase especial
      return 'sin-horario';
    }

    switch (bloque.turno) {
      case 'DIURNO':
        return 'turno-diurno';
      case 'NOCTURNO':
        return 'turno-nocturno';
      case 'LIBRE':
        return 'turno-libre';
      default:
        return '';
    }
  }
}
