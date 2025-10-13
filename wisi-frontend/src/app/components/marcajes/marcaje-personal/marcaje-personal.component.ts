import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { AuthService } from '../../../services/auth.service';
import { MarcajesService } from '../../../services/marcajes.service';
import { HorariosService } from '../../../services/horarios.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';

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
                                 class="foto-real clickeable"
                                 (click)="abrirModalEmpleado(empleado)"
                                 title="Click para ver detalles">
                            <div *ngIf="!empleado.foto" 
                                 class="foto-placeholder clickeable"
                                 (click)="abrirModalEmpleado(empleado)"
                                 title="Click para ver detalles">
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
                          [class]="getTurnoClass(empleado, dia)"
                          [attr.rowspan]="(isTurnoLibre(getBloqueHorario(empleado, dia)?.turno) || isSinHorario(empleado, dia)) ? 3 : 1">
                        <div class="horario-data" 
                             [class.libre-vertical]="isTurnoLibre(getBloqueHorario(empleado, dia)?.turno) || isSinHorario(empleado, dia)">
                          <span *ngIf="isSinHorario(empleado, dia)">
                            SIN HORARIO
                          </span>
                          <span *ngIf="!isSinHorario(empleado, dia) && isTurnoLibre(getBloqueHorario(empleado, dia)?.turno)">
                            {{ getBloqueHorario(empleado, dia)?.turno === 'LIBRE' ? 'LIBRE' : 
                               getBloqueHorario(empleado, dia)?.turno === 'PERMISO' ? 'PERMISO' : 
                               getBloqueHorario(empleado, dia)?.turno === 'SUSPENDIDO' ? 'SUSPENDIDO' : '' }}
                          </span>
                          <span *ngIf="!isSinHorario(empleado, dia) && !isTurnoLibre(getBloqueHorario(empleado, dia)?.turno)">
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
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="(isTurnoLibre(getBloqueHorario(empleado, dia)?.turno) || isSinHorario(empleado, dia)) ? 'none' : 'table-cell'">
                        <div class="horario-data">
                          {{ getHorarioInfo(empleado, dia, 'Descanso') }}
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Fila de Calculo -->
                    <tr class="fila-calculo" >
                      <td class="horario-cell">
                        <div class="horario-info">
                          Calculo
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="(isTurnoLibre(getBloqueHorario(empleado, dia)?.turno) || isSinHorario(empleado, dia)) ? 'none' : 'table-cell'">
                        <div class="horario-data" [innerHTML]="getHorarioInfo(empleado, dia, 'Salida')">
                        </div>
                        
                      </td>
                    </tr>
                    <tr class="separador-verde">
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td *ngFor="let dia of diasDelMes"  style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
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

    <!-- Modal de Asignación de Horarios -->
    <div class="modal-overlay" *ngIf="mostrarModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Asignación de Horarios</h3>
          <button class="modal-close" (click)="cerrarModal()">
            <i class="fas fa-times"></i>
            <span class="close-text">×</span>
          </button>
        </div>
        <div class="modal-body" *ngIf="empleadoSeleccionado">
          <!-- Layout de 2 columnas -->
          <div class="row">
            <!-- Columna 1: Información del empleado -->
            <div class="col-md-6">
              <div class="empleado-info-section">
                <h5>{{ empleadoSeleccionado.Cargo?.Departamento?.Area?.Sala?.nombre || 'Sin sala asignada' }}</h5>
                <div class="row">
                  <!-- Columna de la foto -->
                  <div class="col-md-4">
                    <div class="foto-modal-container">
                      <img *ngIf="empleadoSeleccionado.foto" 
                           [src]="getFotoUrl(empleadoSeleccionado.foto)" 
                           [alt]="empleadoSeleccionado.nombre"
                           class="foto-modal">
                      <div *ngIf="!empleadoSeleccionado.foto" class="foto-modal-placeholder">
                        <i class="fas fa-user"></i>
                      </div>
                    </div>
                  </div>
                  <!-- Columna de la información -->
                  <div class="col-md-8">
                    <div class="info-basica">
                      <h4>{{ empleadoSeleccionado.nombre }}</h4>
                      <p><strong>Cédula:</strong> {{ empleadoSeleccionado.cedula }}</p>
                      <p><strong>Área:</strong> {{ empleadoSeleccionado.Cargo?.Departamento?.Area?.nombre || 'Sin área' }}</p>
                      <p><strong>Departamento:</strong> {{ empleadoSeleccionado.Cargo?.Departamento?.nombre || 'Sin departamento' }}</p>
                      <p><strong>Cargo:</strong> {{ empleadoSeleccionado.Cargo?.nombre || 'Sin cargo' }}</p>
                      <p><strong>Sexo:</strong> {{ empleadoSeleccionado.sexo || 'No especificado' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Columna 2: Formulario para asignar horario -->
            <div class="col-md-6">
              <div class="formulario-horario">
                <h5>Asignar Nuevo Horario</h5>
                <div class="form-group">
                  <label for="primerDia">Primer Día de Trabajo:</label>
                  <input type="date" 
                         id="primerDia"
                         [(ngModel)]="nuevoHorario.primer_dia"
                         [min]="fechaMinimaPermitida"
                         class="form-control">
                </div>
                <div class="form-group">
                  <label for="horarioSelect">Horario:</label>
                  <select id="horarioSelect"
                          [(ngModel)]="nuevoHorario.horario_id"
                          class="form-control"
                          (change)="cargarHorariosPorSala()">
                    <option value="">Seleccionar horario...</option>
                    <option *ngFor="let horario of horariosDisponibles" 
                            [value]="horario.id">
                      {{ horario.nombre }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <button class="btn btn-primary" 
                          (click)="guardarHorarioEmpleado()"
                          [disabled]="!nuevoHorario.primer_dia || !nuevoHorario.horario_id">
                    <i class="fas fa-save"></i> Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabla de horarios asignados -->
          <div class="horarios-asignados" *ngIf="horariosEmpleado.length > 0">
            <h5>Horarios Asignados</h5>
            <div class="table-responsive">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Fecha de Inicio</th>
                    <th>Horario</th>
                    <th>Bloques</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let horarioEmp of horariosEmpleado">
                    <td>{{ horarioEmp.primer_dia | date:'dd/MM/yyyy' }}</td>
                    <td>{{ horarioEmp.Horario?.nombre }}</td>
                    <td>
                      <div class="patron-preview" *ngIf="horarioEmp.Horario?.bloques">
                        <span *ngFor="let bloque of getBloquesOrdenados(horarioEmp.Horario.bloques); let j = index" 
                              class="badge me-1" 
                              [ngClass]="getBloqueBadgeClass(bloque.turno)">
                          {{ getBloqueText(bloque.turno) }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button class="btn btn-sm" 
                              [class.btn-danger]="esHorarioMasReciente(horarioEmp.id)"
                              [class.btn-secondary]="!esHorarioMasReciente(horarioEmp.id)"
                              [disabled]="!esHorarioMasReciente(horarioEmp.id)"
                              (click)="eliminarHorarioEmpleado(horarioEmp.id)">
                        Cerrar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Mensaje cuando no hay horarios -->
          <div class="no-horarios" *ngIf="horariosEmpleado.length === 0">
            <i class="fas fa-clock"></i>
            <p>No hay horarios asignados para este empleado</p>
          </div>

          <!-- Botón Cerrar -->
          <div class="modal-footer">
            <button class="btn btn-secondary btn-lg" (click)="cerrarModal()">
              <i class="fas fa-times"></i> Cerrar
            </button>
          </div>
        </div>
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
    
    .horario-table tbody {
      width: 100% !important;
    }
    
    .horario-table tr {
      width: 100% !important;
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
      left: 150px !important; /* Ancho de la columna empleado */
      z-index: 9 !important;
      background-color: #4CAF50 !important;
      height: 45px !important;
      min-height: 45px !important;
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
      padding: 2px 4px !important;
      text-align: center;
      border-bottom: 1px solid #eee;
      font-size: 12px;
      height: 45px !important;
      min-height: 45px !important;
      max-height: 45px !important;
      vertical-align: middle !important;
    }

    .horario-table tr:hover {
      background: #f8f9fa;
    }

    
   
     
 


    .empleado-completo-col, .empleado-completo-cell {
      width: 150px;
      min-width: 150px;
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
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
      transition: all 0.3s ease;
    }

    .foto-real.clickeable {
      cursor: pointer;
    }

    .foto-real.clickeable:hover {
      transform: scale(1.1);
      border-color: #007bff;
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
    }

    .foto-placeholder {
      width: 60px;
      height: 60px;
      background: #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 20px;
      transition: all 0.3s ease;
    }

    .foto-placeholder.clickeable {
      cursor: pointer;
    }

    .foto-placeholder.clickeable:hover {
      transform: scale(1.1);
      background: #007bff;
      color: white;
      box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);
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
      width: 150px;
      min-width: 150px;
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
      width: 60px;
      min-width: 60px;
      height: 45px;
      min-height: 45px;
      text-align: left;
    }

    .horario-col-empty {
      width: 60px;
      min-width: 60px;
      border-right: 2px solid rgba(255, 255, 255, 0.3);
    }

    .horario-info {
      font-size: 11px;
      font-weight: 500;
      color: white !important;
      padding: 6px;
      line-height: 1.3;
      text-align: left;
    }

    /* Fondo verde oscuro para las filas de horarios */
    .horario-cell {
      background-color: #4CAF50 !important;
    }

    .horario-cell:hover {
      background-color: #45a049 !important;
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
      font-size: 10px !important;
      text-align: center !important;
      padding: 2px 1px !important;
      line-height: 1.2 !important;
      color: #333 !important;
      height: 45px !important;
      min-height: 45px !important;
      max-height: 45px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      vertical-align: middle !important;
    }

    /* Estilos para turnos */
    .turno-diurno {
      background-color: #b3d9ff !important;
    }

    .turno-nocturno {
      background-color: #c7a2ff !important;
    }

    .turno-libre {
      background-color: #a8d5a8 !important;
    }

    .turno-permiso {
      background-color: #ffb366 !important;
    }

    .turno-suspendido {
      background-color: #ff9999 !important;
    }

    .sin-horario {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-style: normal;
      font-weight: 500;
    }

    /* Estilo para texto LIBRE en diagonal */
    .libre-vertical {
      text-align: center;
      font-weight: bold;
      font-size: 36px;
      color: white !important;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 135px;
      max-height: 135px;
      transform: rotate(-45deg);
      transform-origin: center;
    }

    /* Estilo específico para SIN HORARIO - sobrescribir el color blanco */
    .sin-horario .libre-vertical {
      color: #000000 !important;
      background-color: #ffffff !important;
    }

    /* Asegurar que las celdas LIBRE tengan la altura correcta */
    .turno-libre {
      height: 135px;
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

    /* Estilos del Modal */
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
      max-width: 1200px;
      width: 99%;
      max-height: 95vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 15px;
      right: 15px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      transition: background-color 0.3s ease;
    }

    .modal-close:hover {
      background: #c82333;
    }

    .modal-close i {
      color: white !important;
      font-size: 16px;
      font-weight: bold;
    }

    .close-text {
      color: white !important;
      font-size: 20px;
      font-weight: bold;
      line-height: 1;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
    }


    .modal-body {
      padding: 20px;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #e9ecef;
      text-align: center;
      background: #f8f9fa;
    }

    .modal-footer .btn {
      padding: 12px 30px;
      font-size: 16px;
      font-weight: 500;
    }

    .empleado-info-header {
      display: flex;
      gap: 20px;
      align-items: flex-start;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 1px solid #e9ecef;
    }

    .info-basica h4 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .info-basica p {
      margin: 5px 0;
      color: #666;
      font-size: 14px;
    }

    .formulario-horario {
      margin-bottom: 25px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .formulario-horario h5 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }

    .form-row {
      display: flex;
      gap: 15px;
      align-items: end;
      flex-wrap: wrap;
    }

    .form-group {
      flex: 1;
      min-width: 200px;
    }

    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .form-control {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
    }

    .btn-primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }

    .btn-danger {
      background-color: #dc3545;
      color: white;
    }

    .btn-danger:hover {
      background-color: #c82333;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      pointer-events: none;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    .horarios-asignados {
      margin-top: 20px;
    }

    .horarios-asignados h5 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 16px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
    }

    .table th,
    .table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #dee2e6;
    }

    .table th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #333;
    }

    .table-striped tbody tr:nth-of-type(odd) {
      background-color: rgba(0,0,0,.05);
    }

    .bloques-container {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .bloque-item {
      padding: 8px;
      border-radius: 4px;
      font-size: 12px;
      border: 1px solid #ddd;
    }

    .bloque-item.turno-diurno {
      background-color: #e3f2fd;
      border-color: #2196f3;
    }

    .bloque-item.turno-nocturno {
      background-color: #f3e5f5;
      border-color: #9c27b0;
    }

    .bloque-horas {
      font-weight: 600;
      color: #333;
    }

    .bloque-descanso {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

    .no-horarios {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
    }

    .no-horarios i {
      font-size: 48px;
      margin-bottom: 15px;
      display: block;
    }

    .no-horarios p {
      margin: 0;
      font-size: 16px;
    }

    .foto-modal-container {
      flex-shrink: 0;
    }

    .foto-modal {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #e9ecef;
    }

    .foto-modal-placeholder {
      width: 150px;
      height: 150px;
      background: #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 60px;
    }

    .info-detalles {
      flex: 1;
    }

    .info-detalles h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 24px;
    }

    .info-detalles p {
      margin: 8px 0;
      color: #666;
      font-size: 14px;
    }

    .info-detalles strong {
      color: #333;
      font-weight: 600;
    }

    @media (max-width: 768px) {
      .empleado-modal-info {
        flex-direction: column;
        text-align: center;
      }
      
      .foto-modal-container {
        align-self: center;
      }
    }

    /* Estilos para el patrón de bloques */
    .patron-preview {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
    }

    .badge-diurno {
      background-color: #ffc107 !important;
      color: #000 !important;
      font-weight: bold;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
    }

    .badge-nocturno {
      background-color: #6f42c1 !important;
      color: #fff !important;
      font-weight: bold;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
    }

    .badge-libre {
      background-color: #28a745 !important;
      color: #fff !important;
      font-weight: bold;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
    }

    .badge-permiso {
      background-color: #fd7e14 !important;
      color: #fff !important;
      font-weight: bold;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
    }

    .badge-suspendido {
      background-color: #dc3545 !important;
      color: #fff !important;
      font-weight: bold;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
    }

    /* Estilos para el layout de 2 columnas */
    .empleado-info-section {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .empleado-info-section h5 {
      color: #495057;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .formulario-horario {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid #e9ecef;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .formulario-horario h5 {
      color: #495057;
      margin-bottom: 15px;
      font-weight: 600;
    }

    .formulario-horario .form-group {
      margin-bottom: 15px;
    }

    .formulario-horario .form-group:last-child {
      margin-bottom: 0;
    }

    .formulario-horario label {
      font-weight: 500;
      color: #495057;
      margin-bottom: 5px;
    }

    .formulario-horario .form-control {
      border-radius: 6px;
      border: 1px solid #ced4da;
      padding: 8px 12px;
    }

    .formulario-horario .form-control:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
    }

    .formulario-horario .btn {
      width: 100%;
      padding: 10px;
      font-weight: 500;
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Asegurar que el contenido se distribuya bien */
    .empleado-info-section .row {
      flex: 1;
      align-items: center;
    }

    .foto-modal-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .info-basica {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }

    .formulario-horario .form-group:last-child {
      margin-top: auto;
    }

    /* Responsive para pantallas pequeñas */
    @media (max-width: 768px) {
      .col-md-6 {
        margin-bottom: 20px;
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
  marcajesPorEmpleado: Map<string, any[]> = new Map();
  
  // Propiedades para el modal
  mostrarModal = false;
  empleadoSeleccionado: any = null;
  
  // Propiedades para horarios
  horariosDisponibles: any[] = [];
  horariosEmpleado: any[] = [];
  nuevoHorario = {
    primer_dia: '',
    horario_id: ''
  };
  fechaMinimaPermitida: string = '';

  constructor(
    private empleadosService: EmpleadosService,
    private marcajesService: MarcajesService,
    private horariosService: HorariosService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    // Establecer fechas por defecto (hoy hasta un mes adelante)
    const hoy = new Date();
    const enUnMes = new Date();
    enUnMes.setMonth(hoy.getMonth() + 1);
    
    this.fechaDesde = hoy.toISOString().split('T')[0];
    this.fechaHasta = enUnMes.toISOString().split('T')[0];
    
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

      // Removida la limitación de 60 días - ahora permite cualquier rango
      
      // Empezar exactamente desde la fecha de inicio
      const fechaActual = new Date(inicio);
      
      while (fechaActual <= fin) {
        this.diasDelMes.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
      }
      
      
    }
  }

  cargarDatos() {
    if (!this.fechaDesde || !this.fechaHasta) {
      
      return;
    }

    this.loading = true;
    this.generarDiasDelMes();
    this.generarMesesAgrupados();

    this.empleadosService.getEmpleados().subscribe({
      next: (response) => {
        this.empleados = response || [];
        
        // Cargar horarios para todos los empleados primero
        this.cargarHorariosYMarcajes();
      },
      error: (error) => {
        
        
        this.loading = false;
      }
    });
  }

  cargarHorariosYMarcajes() {
    this.marcajesPorEmpleado.clear();
    
    if (this.empleados.length === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }

    // Contador para saber cuándo terminar
    let empleadosProcesados = 0;
    const totalEmpleados = this.empleados.filter(e => e.id).length;

    if (totalEmpleados === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }

    // Cargar horarios y marcajes para cada empleado
    this.empleados.forEach(empleado => {
      if (empleado.id) {
        // Cargar horarios del empleado
        this.empleadosService.getHorariosEmpleado(empleado.id).subscribe({
          next: (horarios) => {
            empleado.horariosEmpleado = horarios || [];
            
            
            // Cargar marcajes del empleado
            if (empleado.cedula) {
              this.marcajesService.getMarcajes({
                employee_no: empleado.cedula,
                fecha_inicio: this.fechaDesde,
                fecha_fin: this.fechaHasta
              }).subscribe({
                next: (response) => {
                  
                  this.marcajesPorEmpleado.set(empleado.cedula, response.attlogs || []);
                  empleadosProcesados++;
                  
                  // Cuando todos los empleados estén procesados, agrupar
                  if (empleadosProcesados === totalEmpleados) {
                    
                    this.agruparEmpleados();
                    this.loading = false;
                  }
                },
                error: (error) => {
                  
                  this.marcajesPorEmpleado.set(empleado.cedula, []);
                  empleadosProcesados++;
                  
                  // Cuando todos los empleados estén procesados, agrupar
                  if (empleadosProcesados === totalEmpleados) {
                    this.agruparEmpleados();
                    this.loading = false;
                  }
                }
              });
            } else {
              empleadosProcesados++;
              if (empleadosProcesados === totalEmpleados) {
                this.agruparEmpleados();
                this.loading = false;
              }
            }
          },
          error: (error) => {
            
            empleado.horariosEmpleado = [];
            empleadosProcesados++;
            
            if (empleadosProcesados === totalEmpleados) {
              this.agruparEmpleados();
              this.loading = false;
            }
          }
        });
      }
    });
  }

  cargarMarcajesYAgrupar() {
    this.marcajesPorEmpleado.clear();
    
    if (this.empleados.length === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }

    // Contador para saber cuándo terminar
    let empleadosProcesados = 0;
    const totalEmpleados = this.empleados.filter(e => e.cedula).length;

    if (totalEmpleados === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }

    // Obtener marcajes para cada empleado
    this.empleados.forEach(empleado => {
      if (empleado.cedula) {
        this.marcajesService.getMarcajes({
          employee_no: empleado.cedula,
          fecha_inicio: this.fechaDesde,
          fecha_fin: this.fechaHasta
        }).subscribe({
          next: (response) => {
            
            this.marcajesPorEmpleado.set(empleado.cedula, response.attlogs || []);
            empleadosProcesados++;
            
            // Cuando todos los empleados estén procesados, agrupar
            if (empleadosProcesados === totalEmpleados) {
              
              
              this.agruparEmpleados();
              this.loading = false;
            }
          },
          error: (error) => {
            
            this.marcajesPorEmpleado.set(empleado.cedula, []);
            empleadosProcesados++;
            
            // Cuando todos los empleados estén procesados, agrupar
            if (empleadosProcesados === totalEmpleados) {
              this.agruparEmpleados();
              this.loading = false;
            }
          }
        });
      }
    });
  }

  cargarMarcajes() {
    this.marcajesPorEmpleado.clear();
    
    // Obtener marcajes para cada empleado
    this.empleados.forEach(empleado => {
      if (empleado.cedula) {
        this.marcajesService.getMarcajes({
          employee_no: empleado.cedula,
          fecha_inicio: this.fechaDesde,
          fecha_fin: this.fechaHasta
        }).subscribe({
          next: (response) => {
            this.marcajesPorEmpleado.set(empleado.cedula, response.attlogs || []);
          },
          error: (error) => {
            
            this.marcajesPorEmpleado.set(empleado.cedula, []);
          }
        });
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
    // Obtener el horario activo para este día
    const horarioActivo = this.getHorarioActivoParaFecha(empleado, dia);
    
    if (!horarioActivo || !horarioActivo.bloques || horarioActivo.bloques.length === 0) {
      return null;
    }

    // Asegurar que los bloques estén ordenados por 'orden'
    const bloques = horarioActivo.bloques.sort((a: any, b: any) => a.orden - b.orden);
    const diasDesdeInicio = this.calcularDiasDesdeInicio(dia, empleado, horarioActivo);
    
    // Si el día es anterior a la fecha de inicio, retornar null (sin horario)
    if (diasDesdeInicio < 0) {
      return null;
    }
    
    const indiceBloque = diasDesdeInicio % bloques.length;
    
    // Debug solo para casos problemáticos
    if (indiceBloque >= bloques.length || indiceBloque < 0) {
      
      
      
      
    }
    
    return bloques[indiceBloque];
  }

  // Obtener el horario activo para una fecha específica
  getHorarioActivoParaFecha(empleado: any, dia: Date): any {
    if (!empleado.horariosEmpleado || empleado.horariosEmpleado.length === 0) {
      return null;
    }

    const fechaStr = dia.toISOString().split('T')[0];
    
    // Ordenar horarios por fecha de inicio (más reciente primero)
    const horariosOrdenados = empleado.horariosEmpleado.sort((a: any, b: any) => 
      new Date(b.primer_dia).getTime() - new Date(a.primer_dia).getTime()
    );

    // Buscar el horario activo para esta fecha
    for (const horarioEmpleado of horariosOrdenados) {
      if (fechaStr >= horarioEmpleado.primer_dia) {
        return horarioEmpleado.Horario;
      }
    }

    return null;
  }

  // Calcular días desde la fecha de inicio del horario
  calcularDiasDesdeInicio(dia: Date, empleado?: any, horarioActivo?: any): number {
    let fechaInicioCiclo: Date | null = null;

    // Prioridad 1: fecha_inicio del horario activo
    if (horarioActivo?.fecha_inicio) {
      const fechaStr = horarioActivo.fecha_inicio.split('T')[0];
      const [año, mes, dia] = fechaStr.split('-').map(Number);
      fechaInicioCiclo = new Date(año, mes - 1, dia);
    }
    // Prioridad 2: primer_dia del horario empleado
    else if (empleado?.horariosEmpleado) {
      const horarioActivo = this.getHorarioActivoParaFecha(empleado, dia);
      if (horarioActivo) {
        // Buscar el horario empleado correspondiente
        const horarioEmpleado = empleado.horariosEmpleado.find((he: any) => 
          he.Horario && he.Horario.id === horarioActivo.id
        );
        if (horarioEmpleado) {
          const fechaStr = horarioEmpleado.primer_dia.split('T')[0];
          const [año, mes, dia] = fechaStr.split('-').map(Number);
          fechaInicioCiclo = new Date(año, mes - 1, dia);
        }
      }
    }
    // Prioridad 3: fechaDesde del componente (inicio del rango de visualización)
    else {
      fechaInicioCiclo = new Date(this.fechaDesde);
    }

    // Si no se pudo determinar una fecha de inicio del ciclo, retornar un valor que indique "fuera de ciclo"
    if (!fechaInicioCiclo) {
      return -1; // O algún otro valor que indique que no hay un punto de inicio válido
    }

    // Asegurarse de que la fecha de inicio del ciclo no tenga componentes de tiempo para una comparación precisa
    fechaInicioCiclo.setHours(0, 0, 0, 0);
    dia.setHours(0, 0, 0, 0);

    const diffTime = dia.getTime() - fechaInicioCiclo.getTime();
    const dias = Math.floor(diffTime / (1000 * 60 * 60 * 24));

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

  // Obtener marcajes del día para un empleado
  getMarcajesDelDia(empleado: any, dia: Date): any[] {
    const marcajes = this.marcajesPorEmpleado.get(empleado.cedula) || [];
    const fechaStr = dia.toISOString().split('T')[0];
    
    
    
    const marcajesDelDia = marcajes.filter(marcaje => {
      const marcajeFecha = new Date(marcaje.event_time).toISOString().split('T')[0];
      return marcajeFecha === fechaStr;
    }).sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
    
    if (marcajesDelDia.length > 0) {
      
    } else {
      
    }
    
    return marcajesDelDia;
  }

  // Calcular marcajes según el turno con lógica inteligente
  calcularMarcajesDelDia(empleado: any, dia: Date, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const marcajes = this.getMarcajesDelDia(empleado, dia);
    
    
    
    if (marcajes.length === 0) {
      
      return { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
    }

    let marcajesAnalizados;

    if (bloque.turno === 'NOCTURNO') {
      // Turno nocturno: manejar marcajes que cruzan medianoche
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const marcajesSiguiente = this.getMarcajesDelDia(empleado, diaSiguiente);
      
      // Combinar marcajes del día actual y siguiente para turno nocturno
      const todosMarcajes = [...marcajes, ...marcajesSiguiente];
      
      if (todosMarcajes.length > 0) {
        marcajesAnalizados = this.analizarMarcajesInteligente(todosMarcajes, bloque, 'NOCTURNO');
      } else {
        marcajesAnalizados = { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
      }
    } else {
      // Turno diurno: análisis inteligente
      marcajesAnalizados = this.analizarMarcajesInteligente(marcajes, bloque, 'DIURNO');
    }

    // Aplicar validaciones de diferencias de tiempo
    const marcajesConValidacion = this.validarDiferenciasTiempo(marcajesAnalizados, bloque);
    
    return marcajesConValidacion;
  }

  // Asignar marcajes de manera inteligente basándose en las horas programadas
  asignarMarcajesInteligente(marcajes: any[], bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const horasProgramadas = {
      entrada: this.convertirHoraAMinutos(bloque.hora_entrada),
      entradaDescanso: this.convertirHoraAMinutos(bloque.hora_entrada_descanso),
      salidaDescanso: this.convertirHoraAMinutos(bloque.hora_salida_descanso),
      salida: this.convertirHoraAMinutos(bloque.hora_salida)
    };

    const marcajesConHoras = marcajes.map(marcaje => ({
      marcaje,
      hora: this.convertirHoraAMinutos(this.formatearHora(new Date(marcaje.event_time).toTimeString().split(' ')[0]))
    }));

    // Asignar cada marcaje al horario programado más cercano
    const asignaciones = {
      entrada: '',
      entradaDescanso: '',
      salidaDescanso: '',
      salida: ''
    };

    const marcajesUsados = new Set();

    // Asignar entrada (más cercano a hora_entrada)
    const entradaAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.entrada, marcajesUsados);
    asignaciones.entrada = entradaAsignada;

    // Asignar entrada descanso (más cercano a hora_entrada_descanso)
    const entradaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.entradaDescanso, marcajesUsados);
    asignaciones.entradaDescanso = entradaDescansoAsignada;

    // Asignar salida descanso (más cercano a hora_salida_descanso)
    const salidaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.salidaDescanso, marcajesUsados);
    asignaciones.salidaDescanso = salidaDescansoAsignada;

    // Asignar salida (más cercano a hora_salida)
    const salidaAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.salida, marcajesUsados);
    asignaciones.salida = salidaAsignada;

    // Aplicar validaciones de diferencias de tiempo
    const asignacionesConValidacion = this.validarDiferenciasTiempo(asignaciones, bloque);
    
    return asignacionesConValidacion;
  }

  // Convertir hora HH:MM a minutos para comparación
  convertirHoraAMinutos(hora: string): number {
    if (!hora) return 0;
    const [horas, minutos] = hora.split(':').map(Number);
    return horas * 60 + minutos;
  }

  // Formatear minutos a HH:MM
  formatearMinutosAHora(minutos: number): string {
    // Si es NaN o negativo, mostrar 00:00
    if (isNaN(minutos) || minutos < 0) {
      return '00:00';
    }
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${horas.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Análisis inteligente de marcajes únicos
  analizarMarcajeUnico(marcaje: any, bloque: any, turno: string): string {
    const horaMarcaje = this.formatearHora(new Date(marcaje.event_time).toTimeString().split(' ')[0]);
    const horaMarcajeMinutos = this.convertirHoraAMinutos(horaMarcaje);
    
    if (turno === 'NOCTURNO') {
      // Para nocturno: si es antes de medianoche, probablemente es entrada
      // si es después de medianoche, probablemente es salida
      const horaMedianoche = 24 * 60; // 1440 minutos
      if (horaMarcajeMinutos < horaMedianoche / 2) { // Antes de medianoche
        return horaMarcaje; // Entrada
      } else {
        return horaMarcaje; // Salida (pero necesitamos más lógica)
      }
    } else {
      // Para diurno: analizar proximidad a horas programadas
      const horaEntradaProgramada = this.convertirHoraAMinutos(bloque.hora_entrada);
      const horaSalidaProgramada = this.convertirHoraAMinutos(bloque.hora_salida);
      
      // Calcular la mitad del turno
      const mitadTurno = horaEntradaProgramada + ((horaSalidaProgramada - horaEntradaProgramada) / 2);
      
      // Si el marcaje está más cerca de la entrada programada
      const distanciaEntrada = Math.abs(horaMarcajeMinutos - horaEntradaProgramada);
      const distanciaSalida = Math.abs(horaMarcajeMinutos - horaSalidaProgramada);
      
      if (distanciaEntrada < distanciaSalida) {
        return horaMarcaje; // Es entrada
      } else if (horaMarcajeMinutos > mitadTurno) {
        return horaMarcaje; // Es salida (está después de la mitad del turno)
      } else {
        return horaMarcaje; // Por defecto, entrada
      }
    }
  }

  // Análisis inteligente de múltiples marcajes
  analizarMarcajesInteligente(marcajes: any[], bloque: any, turno: string): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const resultado = {
      entrada: 'Sin marcaje',
      entradaDescanso: 'Sin marcaje', 
      salidaDescanso: 'Sin marcaje',
      salida: 'Sin marcaje'
    };

    if (marcajes.length === 0) {
      return resultado;
    }

    // Ordenar marcajes por hora
    const marcajesOrdenados = marcajes.sort((a, b) => 
      new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
    );

    if (turno === 'NOCTURNO') {
      // Lógica para turno nocturno
      if (marcajesOrdenados.length === 1) {
        // Un solo marcaje en nocturno: determinar si es entrada o salida
        const marcaje = marcajesOrdenados[0];
        const horaMarcaje = this.formatearHora(new Date(marcaje.event_time).toTimeString().split(' ')[0]);
        const horaMarcajeMinutos = this.convertirHoraAMinutos(horaMarcaje);
        
        // Si es antes de medianoche, probablemente es entrada
        if (horaMarcajeMinutos < 720) { // Antes de 12:00 PM
          resultado.entrada = horaMarcaje;
        } else {
          resultado.salida = horaMarcaje;
        }
      } else {
        // Múltiples marcajes en nocturno
        resultado.entrada = this.formatearHora(new Date(marcajesOrdenados[0].event_time).toTimeString().split(' ')[0]);
        resultado.salida = this.formatearHora(new Date(marcajesOrdenados[marcajesOrdenados.length - 1].event_time).toTimeString().split(' ')[0]);
        
        // Si hay descanso y suficientes marcajes
        if (bloque.tiene_descanso && marcajesOrdenados.length >= 4) {
          resultado.entradaDescanso = this.formatearHora(new Date(marcajesOrdenados[1].event_time).toTimeString().split(' ')[0]);
          resultado.salidaDescanso = this.formatearHora(new Date(marcajesOrdenados[2].event_time).toTimeString().split(' ')[0]);
        }
      }
    } else {
      // Lógica para turno diurno
      if (marcajesOrdenados.length === 1) {
        // Un solo marcaje en diurno: análisis inteligente basado en proximidad
        const marcaje = marcajesOrdenados[0];
        const horaMarcaje = this.formatearHora(new Date(marcaje.event_time).toTimeString().split(' ')[0]);
        const horaMarcajeMinutos = this.convertirHoraAMinutos(horaMarcaje);
        
        const horaEntradaProgramada = this.convertirHoraAMinutos(bloque.hora_entrada);
        const horaSalidaProgramada = this.convertirHoraAMinutos(bloque.hora_salida);
        
        // Calcular distancias a las horas programadas
        const distanciaEntrada = Math.abs(horaMarcajeMinutos - horaEntradaProgramada);
        const distanciaSalida = Math.abs(horaMarcajeMinutos - horaSalidaProgramada);
        
        // Calcular la mitad del turno para análisis adicional
        const mitadTurno = horaEntradaProgramada + ((horaSalidaProgramada - horaEntradaProgramada) / 2);
        
        
        
        
        if (distanciaEntrada < distanciaSalida) {
          // Más cerca de la entrada programada
          resultado.entrada = horaMarcaje;
          
        } else if (horaMarcajeMinutos > mitadTurno) {
          // Está después de la mitad del turno, probablemente es salida
          resultado.salida = horaMarcaje;
          
        } else {
          // Por defecto, si está más cerca de salida, es salida
          resultado.salida = horaMarcaje;
          
        }
      } else if (marcajesOrdenados.length === 2) {
        // Dos marcajes: entrada y salida
        resultado.entrada = this.formatearHora(new Date(marcajesOrdenados[0].event_time).toTimeString().split(' ')[0]);
        resultado.salida = this.formatearHora(new Date(marcajesOrdenados[1].event_time).toTimeString().split(' ')[0]);
        
      } else if (marcajesOrdenados.length >= 4 && bloque.tiene_descanso) {
        // Cuatro o más marcajes con descanso: asignación inteligente
        const marcajesAsignados = this.asignarMarcajesInteligente(marcajesOrdenados, bloque);
        return marcajesAsignados;
      } else {
        // Tres marcajes o más sin descanso: entrada, salida
        resultado.entrada = this.formatearHora(new Date(marcajesOrdenados[0].event_time).toTimeString().split(' ')[0]);
        resultado.salida = this.formatearHora(new Date(marcajesOrdenados[marcajesOrdenados.length - 1].event_time).toTimeString().split(' ')[0]);
        
      }
    }

    return resultado;
  }

  // Calcular resumen de horas trabajadas
  calcularResumenHoras(marcajes: { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string }, bloque: any): { texto: string, claseColor: string } {
    // Calcular horas programadas
    const horaEntradaProgramada = this.convertirHoraAMinutos(bloque.hora_entrada);
    const horaSalidaProgramada = this.convertirHoraAMinutos(bloque.hora_salida);
    
    let horasATrabajar;
    if (bloque.turno === 'NOCTURNO') {
      // Para turno nocturno: la salida es al día siguiente
      // Si la salida es menor que la entrada, significa que cruza medianoche
      if (horaSalidaProgramada < horaEntradaProgramada) {
        // Calcular horas hasta medianoche + horas desde medianoche hasta salida
        horasATrabajar = (24 * 60 - horaEntradaProgramada) + horaSalidaProgramada;
      } else {
        horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
      }
      
    } else {
      // Turno diurno normal
      horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
    }
    
    // Calcular horas de descanso programadas
    let horasDeDescanso = 0;
    if (bloque.tiene_descanso) {
      const entradaDescansoProgramada = this.convertirHoraAMinutos(bloque.hora_entrada_descanso);
      const salidaDescansoProgramada = this.convertirHoraAMinutos(bloque.hora_salida_descanso);
      horasDeDescanso = salidaDescansoProgramada - entradaDescansoProgramada;
      
    }
    
    // Calcular horas reales trabajadas
    let horasTrabajadas = 0;
    let horasDescansadas = 0;
    
    if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
      const horaEntradaReal = this.convertirHoraAMinutos(marcajes.entrada);
      const horaSalidaReal = this.convertirHoraAMinutos(marcajes.salida);
      
      // Calcular horas totales trabajadas (incluyendo descanso)
      let horasTotales;
      if (bloque.turno === 'NOCTURNO') {
        // Para turno nocturno: manejar cruce de medianoche
        if (horaSalidaReal < horaEntradaReal) {
          // La salida es al día siguiente
          horasTotales = (24 * 60 - horaEntradaReal) + horaSalidaReal;
        } else {
          horasTotales = horaSalidaReal - horaEntradaReal;
        }
        
      } else {
        // Turno diurno normal
        horasTotales = horaSalidaReal - horaEntradaReal;
      }
      
      if (bloque.tiene_descanso && marcajes.entradaDescanso !== 'Sin marcaje' && marcajes.salidaDescanso !== 'Sin marcaje') {
        // Con descanso real: horas trabajadas = totalidad - horas descansadas
        const entradaDescansoReal = this.convertirHoraAMinutos(marcajes.entradaDescanso);
        const salidaDescansoReal = this.convertirHoraAMinutos(marcajes.salidaDescanso);
        
        // Calcular horas de descanso considerando cruce de medianoche para turnos nocturnos
        if (bloque.turno === 'NOCTURNO' && salidaDescansoReal < entradaDescansoReal) {
          // El descanso cruza medianoche
          horasDescansadas = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
          
        } else {
          // Descanso normal (diurno o nocturno sin cruce)
          horasDescansadas = salidaDescansoReal - entradaDescansoReal;
        }
        
        horasTrabajadas = horasTotales - horasDescansadas;
        
      } else if (bloque.tiene_descanso) {
        // Sin descanso real pero con descanso programado: asumir que tomó el descanso programado
        horasDescansadas = horasDeDescanso; // Asumir que tomó el descanso programado
        horasTrabajadas = horasTotales - horasDescansadas;
        
      } else {
        // Sin descanso: todas las horas son trabajadas
        horasTrabajadas = horasTotales;
        horasDescansadas = 0;
        
      }
    }
    
    // Formatear horas a HH:MM
    const horasATrabajarFormateadas = this.formatearMinutosAHora(horasATrabajar);
    const horasTrabajadasFormateadas = this.formatearMinutosAHora(horasTrabajadas);
    const horasDeDescansoFormateadas = this.formatearMinutosAHora(horasDeDescanso);
    const horasDescansadasFormateadas = this.formatearMinutosAHora(horasDescansadas);
    
    // Verificar si hay marcajes reales
    const tieneMarcajes = marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje';
    
    // Si no hay marcajes, mostrar: HorasATrabajar - 00:00 - HorasDeDescanso - 00:00
    if (!tieneMarcajes) {
      const texto = `${this.formatearMinutosAHora(horasATrabajar)} - 00:00 - ${this.formatearMinutosAHora(horasDeDescanso)} - 00:00`;
      return { texto, claseColor: '' };
    }
    
    // Determinar colores individuales para cada grupo
    let claseColorTrabajadas = '';
    let claseColorDescansadas = '';
    
    if (tieneMarcajes) {
      // Color para horas trabajadas (segundo grupo)
      if (horasTrabajadas < horasATrabajar) {
        claseColorTrabajadas = 'text-danger';
        
      } else if (horasTrabajadas > horasATrabajar) {
        claseColorTrabajadas = 'text-success';
        
      }
      
      // Color para horas descansadas (cuarto grupo) - solo si hay descanso programado
      if (horasDeDescanso > 0) {
        if (horasDescansadas > horasDeDescanso) {
          claseColorDescansadas = 'text-danger';
          
        } else if (horasDescansadas < horasDeDescanso) {
          claseColorDescansadas = 'text-success';
          
        }
      }
    }
    
    // Solo mostrar logs cuando hay marcajes reales
    if (tieneMarcajes) {
      
      
      
    }
    
    // Construir texto con colores individuales y espacios consistentes usando &nbsp;
    const separador = '&nbsp;-&nbsp;';
    const texto = `${horasATrabajarFormateadas}${separador}` +
                 `${claseColorTrabajadas ? `<span class="${claseColorTrabajadas}">${horasTrabajadasFormateadas}</span>` : horasTrabajadasFormateadas}${separador}` +
                 `${horasDeDescansoFormateadas}${separador}` +
                 `${claseColorDescansadas ? `<span class="${claseColorDescansadas}">${horasDescansadasFormateadas}</span>` : horasDescansadasFormateadas}`;
    
    return { texto, claseColor: '' };
  }

  // Validar diferencias de tiempo entre marcajes
  validarDiferenciasTiempo(marcajes: { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string }, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const resultado = { ...marcajes };

    // Validar que salida tenga al menos 1 hora de diferencia de entrada
    if (resultado.entrada !== 'Sin marcaje' && resultado.salida !== 'Sin marcaje') {
      const entradaMinutos = this.convertirHoraAMinutos(resultado.entrada);
      const salidaMinutos = this.convertirHoraAMinutos(resultado.salida);
      
      let diferenciaSalida;
      if (bloque.turno === 'NOCTURNO' && salidaMinutos < entradaMinutos) {
        // Turno nocturno: la salida es al día siguiente
        diferenciaSalida = (24 * 60 - entradaMinutos) + salidaMinutos;
      } else {
        // Turno diurno o nocturno sin cruce
        diferenciaSalida = salidaMinutos - entradaMinutos;
      }
      
      if (diferenciaSalida < 60) { // Menos de 1 hora
        resultado.salida = 'SNM';
        
      }
    }

    // Si hay descanso definido, validar diferencias de descanso
    if (bloque.tiene_descanso) {
      // Validar entrada de descanso: al menos 10 min de diferencia de entrada
      if (resultado.entrada !== 'Sin marcaje' && resultado.entradaDescanso !== 'Sin marcaje') {
        const entradaMinutos = this.convertirHoraAMinutos(resultado.entrada);
        const entradaDescansoMinutos = this.convertirHoraAMinutos(resultado.entradaDescanso);
        
        let diferenciaEntradaDescanso;
        if (bloque.turno === 'NOCTURNO' && entradaDescansoMinutos < entradaMinutos) {
          // Turno nocturno: el descanso puede ser al día siguiente
          diferenciaEntradaDescanso = (24 * 60 - entradaMinutos) + entradaDescansoMinutos;
        } else {
          // Turno diurno o nocturno sin cruce
          diferenciaEntradaDescanso = entradaDescansoMinutos - entradaMinutos;
        }
        
        if (diferenciaEntradaDescanso < 10) { // Menos de 10 minutos
          resultado.entradaDescanso = 'DNM';
          resultado.salidaDescanso = 'DNM';
          
        }
      }

      // Validar salida de descanso: al menos 10 min de diferencia
      if (resultado.entradaDescanso !== 'Sin marcaje' && resultado.entradaDescanso !== 'DNM' && 
          resultado.salidaDescanso !== 'Sin marcaje') {
        const entradaDescansoMinutos = this.convertirHoraAMinutos(resultado.entradaDescanso);
        const salidaDescansoMinutos = this.convertirHoraAMinutos(resultado.salidaDescanso);
        
        let diferenciaSalidaDescanso;
        if (bloque.turno === 'NOCTURNO' && salidaDescansoMinutos < entradaDescansoMinutos) {
          // Turno nocturno: la salida de descanso puede ser al día siguiente
          diferenciaSalidaDescanso = (24 * 60 - entradaDescansoMinutos) + salidaDescansoMinutos;
        } else {
          // Turno diurno o nocturno sin cruce
          diferenciaSalidaDescanso = salidaDescansoMinutos - entradaDescansoMinutos;
        }
        
        if (diferenciaSalidaDescanso < 10) { // Menos de 10 minutos
          resultado.salidaDescanso = 'SDNM';
          
        }
      }
    }

    return resultado;
  }

  // Encontrar el marcaje más cercano a una hora programada
  encontrarMarcajeMasCercano(marcajesConHoras: any[], horaProgramada: number, marcajesUsados: Set<any>): string {
    let marcajeMasCercano = null;
    let menorDiferencia = Infinity;

    for (const marcajeConHora of marcajesConHoras) {
      if (marcajesUsados.has(marcajeConHora.marcaje)) continue;
      
      const diferencia = Math.abs(marcajeConHora.hora - horaProgramada);
      if (diferencia < menorDiferencia) {
        menorDiferencia = diferencia;
        marcajeMasCercano = marcajeConHora;
      }
    }

    if (marcajeMasCercano) {
      marcajesUsados.add(marcajeMasCercano.marcaje);
      return this.formatearHora(new Date(marcajeMasCercano.marcaje.event_time).toTimeString().split(' ')[0]);
    }

    return 'Sin marcaje';
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
        // Mostrar marcajes reales o "Sin Registros" si no hay marcajes
        
        const marcajesDescanso = this.calcularMarcajesDelDia(empleado, dia, bloque);
        
        
        if (marcajesDescanso.entrada !== 'Sin marcaje' && marcajesDescanso.salida !== 'Sin marcaje') {
          // Mostrar marcajes reales con formato según si hay descanso programado
          if (bloque.tiene_descanso) {
            // Si hay descanso programado, verificar si hay códigos de error
            if (marcajesDescanso.entradaDescanso === 'DNM' || marcajesDescanso.salidaDescanso === 'DNM') {
              resultado = `${marcajesDescanso.entrada} - DNM - ${marcajesDescanso.salida}`;
            } else if (marcajesDescanso.salidaDescanso === 'SDNM') {
              resultado = `${marcajesDescanso.entrada} - ${marcajesDescanso.entradaDescanso} - SDNM - ${marcajesDescanso.salida}`;
            } else if (marcajesDescanso.entradaDescanso === 'Sin marcaje' && marcajesDescanso.salidaDescanso === 'Sin marcaje') {
              // No hay marcajes de descanso, mostrar DNM
              resultado = `${marcajesDescanso.entrada} - DNM - ${marcajesDescanso.salida}`;
            } else {
              resultado = `${marcajesDescanso.entrada} - ${marcajesDescanso.entradaDescanso} - ${marcajesDescanso.salidaDescanso} - ${marcajesDescanso.salida}`;
            }
          } else {
            // Si no hay descanso programado, mostrar entrada - Sin descanso - salida
            if (marcajesDescanso.salida === 'SNM') {
              resultado = `${marcajesDescanso.entrada} - Sin descanso - SNM`;
            } else {
              resultado = `${marcajesDescanso.entrada} - Sin descanso - ${marcajesDescanso.salida}`;
            }
          }
        } else if (marcajesDescanso.entrada !== 'Sin marcaje') {
          // Solo entrada real
          resultado = marcajesDescanso.entrada;
        } else {
          // No hay marcajes reales, mostrar "Sin Registros"
          resultado = 'Sin Registros';
        }
        
        break;
      case 'Salida':
        // Mostrar cálculo detallado de horas trabajadas
        
        const marcajesCalculo = this.calcularMarcajesDelDia(empleado, dia, bloque);
        const resumenCalculo = this.calcularResumenHoras(marcajesCalculo, bloque);
        
        // El texto ya incluye los colores individuales
        resultado = resumenCalculo.texto;
        
        
        break;
      default:
        resultado = '';
    }
    
    return resultado;
  }

  // Verificar si un turno es de tipo "libre" (no requiere marcajes)
  isTurnoLibre(turno: string): boolean {
    return turno === 'LIBRE' || turno === 'PERMISO' || turno === 'SUSPENDIDO';
  }

  // Verificar si es sin horario (fechas anteriores a la fecha de inicio)
  isSinHorario(empleado: any, dia: Date): boolean {
    // Verificar si el empleado tiene horarios asignados
    if (!empleado.horariosEmpleado || empleado.horariosEmpleado.length === 0) {
      
      return true;
    }
    
    const bloque = this.getBloqueHorario(empleado, dia);
    const esSinHorario = !bloque; // Si no hay bloque, es sin horario
    
    // Debug: Log para verificar
    if (esSinHorario) {
      
    }
    
    return esSinHorario;
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
      case 'PERMISO':
        return 'turno-permiso';
      case 'SUSPENDIDO':
        return 'turno-suspendido';
      default:
        return '';
    }
  }

  // Métodos para el modal
  abrirModalEmpleado(empleado: any) {
    
    
    
    this.empleadoSeleccionado = empleado;
    this.mostrarModal = true;
    this.resetearFormulario();
    this.cargarHorariosPorSala();
    this.cargarHorariosEmpleado();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.empleadoSeleccionado = null;
    this.horariosDisponibles = [];
    this.horariosEmpleado = [];
    this.resetearFormulario();
  }

  resetearFormulario() {
    this.nuevoHorario = {
      primer_dia: '',
      horario_id: ''
    };
    this.fechaMinimaPermitida = '';
  }

  cargarHorariosPorSala() {
    if (!this.empleadoSeleccionado?.Cargo?.Departamento?.Area?.Sala?.id) {
      this.horariosDisponibles = [];
      
      return;
    }

    const salaId = this.empleadoSeleccionado.Cargo.Departamento.Area.Sala.id;
    

    this.horariosService.getHorariosBySala(salaId).subscribe({
      next: (horarios) => {
        this.horariosDisponibles = horarios;
        
      },
      error: (error) => {
        
        this.horariosDisponibles = [];
      }
    });
  }

  cargarHorariosEmpleado() {
    if (!this.empleadoSeleccionado?.id) return;

    

    this.empleadosService.getHorariosEmpleado(this.empleadoSeleccionado.id).subscribe({
      next: (horarios) => {
        this.horariosEmpleado = horarios;
        
        
        // Calcular la fecha mínima permitida
        this.calcularFechaMinimaPermitida();
      },
      error: (error) => {
        
        this.horariosEmpleado = [];
        this.fechaMinimaPermitida = '';
      }
    });
  }

  calcularFechaMinimaPermitida() {
    if (this.horariosEmpleado.length === 0) {
      // Si no hay horarios asignados, permitir cualquier fecha
      this.fechaMinimaPermitida = '';
      return;
    }

    // Encontrar la fecha más reciente de los horarios asignados
    const fechas = this.horariosEmpleado.map(h => h.primer_dia).sort();
    const fechaMasReciente = fechas[fechas.length - 1];
    
    // La fecha mínima será el día siguiente a la fecha más reciente
    const fechaMinima = new Date(fechaMasReciente);
    fechaMinima.setDate(fechaMinima.getDate() + 1);
    
    // Formatear como YYYY-MM-DD para el input de fecha
    this.fechaMinimaPermitida = fechaMinima.toISOString().split('T')[0];
    
    
  }

  guardarHorarioEmpleado() {
    if (!this.nuevoHorario.primer_dia || !this.nuevoHorario.horario_id) {
      
      return;
    }

    if (!this.empleadoSeleccionado?.id) {
      
      return;
    }

    // Validar que la fecha no sea menor o igual a horarios existentes
    if (this.fechaMinimaPermitida && this.nuevoHorario.primer_dia < this.fechaMinimaPermitida) {
      
      return;
    }

    

    const horarioData = {
      primer_dia: this.nuevoHorario.primer_dia,
      horario_id: parseInt(this.nuevoHorario.horario_id)
    };

    this.empleadosService.asignarHorarioEmpleado(this.empleadoSeleccionado.id, horarioData).subscribe({
      next: (response) => {
        
        
        this.resetearFormulario();
        this.cargarHorariosEmpleado(); // Recargar la lista del modal
        
        // ✅ ACTUALIZAR LA VISTA PRINCIPAL
        this.actualizarVistaPrincipal();
      },
      error: (error) => {
        
        
      }
    });
  }

  eliminarHorarioEmpleado(horarioEmpleadoId: number) {
    if (!this.empleadoSeleccionado?.id) {
      
      return;
    }

    

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este horario?',
      entity: {
        id: horarioEmpleadoId,
        nombre: 'Horario de Empleado',
        tipo: 'Horario'
      },
      warningText: 'Esta acción eliminará permanentemente el horario asignado al empleado.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionHorario(horarioEmpleadoId);
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionHorario(horarioEmpleadoId: number) {
    if (!this.empleadoSeleccionado?.id) {
      return;
    }

    

    this.empleadosService.eliminarHorarioEmpleado(this.empleadoSeleccionado.id, horarioEmpleadoId).subscribe({
      next: (response) => {
        
        
        this.cargarHorariosEmpleado();
        this.actualizarVistaPrincipal();
      },
      error: (error) => {
        
        
        
        
        // Si es error 400 con relaciones, mostrar modal global de error
        if (error.status === 400 && error.error?.relations) {
          
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el horario',
            message: error.error.message,
            entity: {
              id: error.error.horarioEmpleado?.id || horarioEmpleadoId,
              nombre: error.error.horarioEmpleado?.nombre || 'Horario',
              tipo: 'Horario de Empleado'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este horario, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          
          
        }
      }
    });
  }

  // Métodos para mostrar el patrón de bloques
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
    const clases: { [key: string]: string } = {
      'DIURNO': 'badge-diurno',
      'NOCTURNO': 'badge-nocturno',
      'LIBRE': 'badge-libre',
      'PERMISO': 'badge-permiso',
      'SUSPENDIDO': 'badge-suspendido'
    };
    return clases[turno] || 'badge-secondary';
  }

  // Método para ordenar los bloques según el campo 'orden'
  getBloquesOrdenados(bloques: any[]): any[] {
    if (!bloques || !Array.isArray(bloques)) {
      return [];
    }
    
    return [...bloques].sort((a, b) => {
      const ordenA = a.orden || 0;
      const ordenB = b.orden || 0;
      return ordenA - ordenB;
    });
  }

  // Verificar si un horario es el más reciente (el único que se puede eliminar)
  esHorarioMasReciente(horarioId: number): boolean {
    if (!this.horariosEmpleado || this.horariosEmpleado.length === 0) {
      return false;
    }

    // Ordenar por fecha de inicio (más reciente primero)
    const horariosOrdenados = [...this.horariosEmpleado].sort((a, b) => {
      return new Date(b.primer_dia).getTime() - new Date(a.primer_dia).getTime();
    });

    // El más reciente es el primero en la lista ordenada
    return horariosOrdenados[0]?.id === horarioId;
  }

  // Función para actualizar la vista principal después de modificar horarios
  actualizarVistaPrincipal() {
    
    
    // Recargar todos los datos de la vista principal
    this.cargarDatos();
  }
}
