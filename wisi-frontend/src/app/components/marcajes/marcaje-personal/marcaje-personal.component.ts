import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { AreasService } from '../../../services/areas.service';
import { DepartamentosService } from '../../../services/departamentos.service';
import { CargosService } from '../../../services/cargos.service';
import { AuthService } from '../../../services/auth.service';
import { MarcajesService } from '../../../services/marcajes.service';
import { HorariosService } from '../../../services/horarios.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { ExcepcionesHorariosService } from '../../../services/excepciones-horarios.service';
import { PlantillasHorariosService } from '../../../services/plantillas-horarios.service';

@Component({
  selector: 'app-marcaje-personal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="marcaje-personal-container">

      <!-- Bloque superior: Selección de sala con radio buttons -->
      <div class="sala-selector-section">
        <div class="sala-selector-container">
          <label class="sala-selector-label">Seleccionar Sala:</label>
          <div class="radio-buttons-group">
            <label class="radio-option" *ngFor="let sala of userSalas">
              <input 
                type="radio" 
                name="salaSelector" 
                [value]="sala.id"
                [checked]="selectedSalaForDataLoad === sala.id"
                (change)="onSalaSelectorChange(sala.id)"
                class="radio-input">
              <span class="radio-label">{{ sala.nombre }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Bloque inferior: Filtros locales -->
      <div class="filters-section">
        <div class="date-filters row g-3">
          <div class="filter-group col-sm-3">
            <label for="deptoSelect">Departamento:</label>
            <select id="deptoSelect" class="form-select"
                    [(ngModel)]="selectedDepartamentoId"
                    [disabled]="!selectedSalaForDataLoad"
                    (change)="onDepartamentoChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let d of departamentosFiltrados" [ngValue]="d.id">{{ d.nombre }}</option>
            </select>
          </div>
          <div class="filter-group col-sm-3">
            <label for="areaSelect">Área:</label>
            <select id="areaSelect" class="form-select"
                    [(ngModel)]="selectedAreaId"
                    [disabled]="!selectedDepartamentoId"
                    (change)="onAreaChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let a of areasFiltradas" [ngValue]="a.id">{{ a.nombre }}</option>
            </select>
          </div>
          <div class="filter-group col-sm-3">
            <label for="cargoSelect">Cargo:</label>
            <select id="cargoSelect" class="form-select"
                    [(ngModel)]="selectedCargoId"
                    [disabled]="!selectedAreaId"
                    (change)="onCargoChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let c of cargosFiltrados" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="filter-group col-sm-3">
            <label for="sexoSelect">Sexo:</label>
            <select id="sexoSelect" class="form-select"
                    [(ngModel)]="selectedSexo"
                    [disabled]="!selectedSalaForDataLoad"
                    (change)="onSexoChange()">
              <option [ngValue]="null">Todo</option>
              <option [ngValue]="'Femenino'">Femenino</option>
              <option [ngValue]="'Masculino'">Masculino</option>
            </select>
          </div>

          <div class="filter-group col-sm-3">
            <label for="searchInput">Buscar (cédula o nombre):</label>
            <input id="searchInput" type="text" class="form-input"
                   placeholder="Ej: 1234 o Aida"
                   [(ngModel)]="searchText"
                   [disabled]="!selectedSalaForDataLoad"
                   (keyup)="onSearchChange()" />
          </div>
          
          
          <div class="filter-group col-sm-3">
            <label for="fechaDesde">Desde:</label>
            <input 
              type="date" 
              id="fechaDesde"
              [(ngModel)]="fechaDesde" 
              name="fechaDesde"
              class="form-input"
              [disabled]="!selectedSalaForDataLoad"
              [min]="fechaMinimaFiltro"
              [max]="fechaMaximaFiltro"
              (change)="onFiltroLocalChange()">
          </div>
          
          <div class="filter-group col-sm-3">
            <label for="fechaHasta">Hasta:</label>
            <input 
              type="date" 
              id="fechaHasta"
              [(ngModel)]="fechaHasta" 
              name="fechaHasta"
              class="form-input"
              [disabled]="!selectedSalaForDataLoad"
              [min]="fechaMinimaFiltro"
              [max]="fechaMaximaFiltro"
              (change)="onFiltroLocalChange()">
          </div>
        </div>
        
      </div>


      <div class="grupos-container" *ngIf="!loading && hasSearched && grupos.length > 0 && !todosLosGruposEstanVacios()">
        <div class="grupo-card" *ngFor="let grupo of grupos">
          <div class="grupo-header">
            <h3>{{ grupo.nombre }}</h3>
            <span class="empleados-count">{{ grupo.empleados.length }} empleado(s)</span>
          </div>
          
          <div class="grupo-table-container" *ngIf="grupo.empleados.length > 0">
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
                          [attr.rowspan]="isSinHorario(empleado, dia) ? 3 : 1">
                        <div class="horario-data" 
                             [class.libre-vertical]="isSinHorario(empleado, dia)">
                          <span *ngIf="isSinHorario(empleado, dia)" class="sin-horario-wrapper">
                            <span>SIN HORARIO</span>
                            <button class="btn-add-dia"
                                    [ngClass]="hasExcepcion(empleado, dia) ? 'ex-present' : 'ex-empty'"
                                    title="Excepción del día"
                                    (click)="abrirModalExcepcion(empleado, dia)">M</button>
                          </span>
                          <span *ngIf="!isSinHorario(empleado, dia)" class="con-horario-wrapper">
                            <span class="badge-plantilla-horario" 
                                  [style.backgroundColor]="getBloqueHorario(empleado, dia)?.PlantillaHorario?.color || '#ffffff'"
                                  [style.color]="getContrastColorPlantilla(getBloqueHorario(empleado, dia)?.PlantillaHorario?.color)">
                              {{ getBloqueHorario(empleado, dia)?.PlantillaHorario?.codigo || 'N/A' }}
                            </span>
                            <button class="btn-add-dia mini"
                                    [ngClass]="hasExcepcion(empleado, dia) ? 'ex-present' : 'ex-empty'"
                                    title="Excepción del día"
                                    (click)="abrirModalExcepcion(empleado, dia)">M</button>
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
                          [style.display]="isSinHorario(empleado, dia) ? 'none' : 'table-cell'">
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
                          [style.display]="isSinHorario(empleado, dia) ? 'none' : 'table-cell'">
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

          <div class="no-registros-grupo" *ngIf="grupo.empleados.length === 0">
            <i class="fas fa-user-slash"></i>
            <p>No hay registros</p>
          </div>
        </div>
        
        <!-- Modal Excepción de Horario -->
        <div class="modal-backdrop" *ngIf="showExcepcionModal">
          <div class="modal-card">
            <div class="modal-header">
              <h5>Asignar horario al día</h5>
              <button class="btn-close" (click)="cerrarModalExcepcion()">×</button>
            </div>
            <div class="modal-body">
              <div class="mb-2"><strong>Empleado:</strong> {{ modalEmpleado?.nombre }} ({{ modalEmpleado?.cedula }})</div>
              <div class="mb-2"><strong>Fecha:</strong> {{ modalFecha }}</div>
              <label>Horarios:</label>
              <select class="form-select" [(ngModel)]="selectedPlantillaId" (ngModelChange)="onPlantillaSeleccionChange($event)">
                <option [ngValue]="null">Seleccione un horario</option>
                <option *ngFor="let p of modalPlantillas; trackBy: trackByPlantillaId" [ngValue]="p.id">
                  {{ p.codigo }} - {{ p.nombre }}
                </option>
                <option *ngIf="isEditExcepcion && canEliminarExcepcion()" [ngValue]="'__delete__'">Eliminar Registro</option>
              </select>
              <div *ngIf="modalPlantillas.length === 0" class="mt-2" style="font-size: 12px; color: #dc3545;">
                ⚠ No hay plantillas disponibles para esta sala
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="cerrarModalExcepcion()">Cerrar</button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando empleados...</p>
      </div>

      <div class="empty-state" *ngIf="!loading && hasSearched && (grupos.length === 0 || todosLosGruposEstanVacios())">
        <i class="fas fa-users"></i>
        <p>No hay registros</p>
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
                <h5>{{ empleadoSeleccionado.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin sala asignada' }}</h5>
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
                      <p><strong>Área:</strong> {{ empleadoSeleccionado.Cargo?.Area?.nombre || 'Sin área' }}</p>
                      <p><strong>Departamento:</strong> {{ empleadoSeleccionado.Cargo?.Area?.Departamento?.nombre || 'Sin departamento' }}</p>
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
                <h5>Asignar nuevo ciclo de horario</h5>
                <div class="form-group">
                  <label for="primerDia">Primer Día de Trabajo:</label>
                  <input type="date" 
                         id="primerDia"
                         [(ngModel)]="nuevoHorario.primer_dia"
                         [min]="fechaMinimaPermitida"
                         class="form-control">
                </div>
                <div class="form-group">
                  <label for="horarioSelect">Ciclo:</label>
                  <select id="horarioSelect"
                          [(ngModel)]="nuevoHorario.horario_id"
                          class="form-control"
                          (change)="cargarHorariosPorSala()">
                    <option value="">Seleccionar ciclo...</option>
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
          <div class="horarios-asignados">
            <h5>Horario Repetitivo ( Ciclo )</h5>
            <div class="table-responsive" *ngIf="(horariosEmpleado?.length || 0) > 0; else noHorarios">
              <table class="table table-striped">
                <thead>
                  <tr>
                    <th>Fecha de Inicio</th>
                    <th>Ciclo</th>
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
                              [style.backgroundColor]="bloque?.PlantillaHorario?.color || '#ffc107'"
                              [style.color]="getContrastColorPlantilla(bloque?.PlantillaHorario?.color || '#ffc107')">
                          {{ bloque?.PlantillaHorario?.codigo || getBloqueText(getTurnoFromBloque(bloque)) }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <button class="btn btn-sm" 
                              [class.btn-danger]="esHorarioMasReciente(horarioEmp.id)"
                              [class.btn-secondary]="!esHorarioMasReciente(horarioEmp.id)"
                              [disabled]="!esHorarioMasReciente(horarioEmp.id)"
                              (click)="eliminarHorarioEmpleado(horarioEmp.id)">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noHorarios>
              <div class="table-responsive">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Fecha de Inicio</th>
                      <th>Ciclo</th>
                      <th>Bloques</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colspan="4" style="text-align:center;color:#6c757d;">Sin Registros</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </ng-template>
          </div>

      <!-- Tabla de Excepciones Asignadas -->
      <div class="horarios-asignados">
        <h5>Horario Individual ( Dia )</h5>
        <div class="table-responsive" *ngIf="(excepcionesEmpleado?.length || 0) > 0; else noEx">
          <table class="table table-striped">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Horario</th>
                <th>Descripción</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let ex of excepcionesEmpleado">
                <td>{{ ex.fecha | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="badge me-1"
                        [style.backgroundColor]="ex?.PlantillaHorario?.color || '#6c757d'"
                        [style.color]="getContrastColorPlantilla(ex?.PlantillaHorario?.color || '#6c757d')">
                    {{ ex?.PlantillaHorario?.codigo || ex.plantilla_horario_id }}
                  </span>
                </td>
                <td>{{ ex?.PlantillaHorario?.nombre || ex.motivo || '-' }}</td>
                <td>
                  <button class="btn btn-sm btn-danger" (click)="eliminarExcepcionDirecta(ex)">Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <ng-template #noEx>
          <div class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Horario</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colspan="4" style="text-align:center;color:#6c757d;">Sin Registros</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ng-template>
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

    .sala-selector-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .sala-selector-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .sala-selector-label {
      font-weight: bold;
      color: #333;
      font-size: 16px;
      margin-bottom: 10px;
    }

    .radio-buttons-group {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
    }

    .radio-option {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      padding: 10px 15px;
      border: 2px solid #ddd;
      border-radius: 8px;
      transition: all 0.3s;
      background: #f9f9f9;
    }

    .radio-option:hover {
      border-color: #4CAF50;
      background: #f0f8f0;
    }

    .radio-input {
      cursor: pointer;
      width: 18px;
      height: 18px;
      accent-color: #4CAF50;
    }

    .radio-option:has(.radio-input:checked) {
      border-color: #4CAF50;
      background: #e8f5e8;
      font-weight: 600;
    }

    .radio-label {
      font-size: 14px;
      color: #333;
      user-select: none;
    }

    .filters-section {
      background: white;
      padding: 25px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-bottom: 30px;
    }

    .date-filters {
      /* Usamos layout de Bootstrap row; sin gap personalizado */
      gap: 0;
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

    .badge-plantilla-horario {
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(0, 0, 0, 0.1);
      display: inline-block;
      min-width: 40px;
      text-align: center;
    }

    /* Estilos para celdas con y sin horario */
    .con-horario {
      background-color: transparent !important;
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

    /* Celdas que ocupan múltiples filas (libre, permiso, suspendido, sin horario) */
    .dia-cell[rowspan="3"] {
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

    .no-registros-grupo {
      text-align: center;
      padding: 30px 20px;
      color: #6c757d;
      background: white;
      border-bottom-left-radius: 12px;
      border-bottom-right-radius: 12px;
    }
    .no-registros-grupo i {
      font-size: 28px;
      margin-bottom: 10px;
      display: block;
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

    /* Estilos del modal de excepción día a día */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.45);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 60px;
      z-index: 1100;
    }
    .modal-card {
      width: min(800px, 96%);
      background: #ffffff;
      color: #212529;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }
    .modal-card .modal-header {
      background: #f8f9fa;
      padding: 12px 16px;
      border-bottom: 1px solid #e9ecef;
    }
    .modal-card .modal-body {
      padding: 16px;
    }
    .modal-card .modal-footer {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 12px 16px;
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
    }
    .btn-close {
      appearance: none;
      border: none;
      background: transparent;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
      color: #6c757d;
    }
    .btn-primary {
      background: #0d6efd;
      color: #fff;
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
    }
    .btn-primary:disabled { opacity: .6; cursor: not-allowed; }
    .btn-secondary {
      background: #e9ecef;
      color: #212529;
      border: 1px solid #ced4da;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
    }
    .form-select, .form-input {
      width: 100%;
      border: 1px solid #ced4da;
      border-radius: 6px;
      padding: 8px 10px;
      background: #fff;
      color: #212529;
    }
    .mt-2 { margin-top: 8px; }
    .mb-2 { margin-bottom: 8px; }

    /* Botón + dentro de celdas */
    .btn-add-dia {
      margin-left: 8px;
      background: #6c757d; /* gris por defecto */
      color: #fff; /* texto blanco */
      border: none;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-add-dia.mini { padding: 0 6px; font-size: 12px; }

    /* Colocar el botón debajo del texto en SIN HORARIO */
    .sin-horario-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .sin-horario-wrapper .btn-add-dia {
      margin-left: 0; /* evitar separación lateral */
    }

    /* Estados del botón de excepción */
    .btn-add-dia.ex-empty {
      background: #6c757d; /* gris */
      color: #ffffff;
    }
    .btn-add-dia.ex-present {
      background: #28a745; /* verde activo, igual al header */
      color: #ffffff;
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
      border: none;
      border-radius: 6px;
      padding: 8px 14px;
      cursor: pointer;
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

    /* Los bloques ahora se manejan dinámicamente con plantillas */
    .bloque-item {
      /* Estilos dinámicos según plantilla */
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
  empleadosCompletos: any[] = []; // Todos los empleados de la sala seleccionada (sin filtros)
  empleadosFiltrados: any[] = [];
  grupos: any[] = [];
  userSalas: any[] = [];
  diasDelMes: Date[] = [];
  mesesAgrupados: { nombre: string, dias: Date[], colspan: number }[] = [];
  fechaDesde: string = '';
  fechaHasta: string = '';
  fechaMinimaFiltro: string = ''; // Fecha más antigua encontrada (límite mínimo para filtros)
  fechaMaximaFiltro: string = ''; // 4 meses adelante (límite máximo para filtros)
  grupoSeleccionado: string = 'salas';
  loading = false;
  marcajesPorEmpleado: Map<string, any[]> = new Map();
  marcajesCompletos: Map<string, any[]> = new Map(); // Todos los marcajes sin filtros de fecha
  excepcionesMap: Map<string, any> = new Map();
  excepcionesCompletas: Map<string, any> = new Map(); // Todas las excepciones sin filtros de fecha
  hasSearched = false;
  // Selección de sala para cargar datos (radio buttons)
  selectedSalaForDataLoad: number | null = null;
  // Filtros jerárquicos (para filtrar datos locales)
  selectedSalaId: number | null = null;
  selectedDepartamentoId: number | null = null;
  selectedAreaId: number | null = null;
  selectedCargoId: number | null = null;
  selectedSexo: string | null = null;
  searchText: string = '';
  departamentosAll: any[] = [];
  areasAll: any[] = [];
  cargosAll: any[] = [];
  departamentosFiltrados: any[] = [];
  areasFiltradas: any[] = [];
  cargosFiltrados: any[] = [];
  
  // Propiedades para el modal
  mostrarModal = false;
  empleadoSeleccionado: any = null;
  // Modal excepción (día a día)
  showExcepcionModal = false;
  savingExcepcion = false;
  modalEmpleado: any = null;
  modalFecha: string = '';
  modalPlantillas: any[] = [];
  selectedPlantillaId: any | null = null;
  // Evitar que el select dispare onChange al abrir el modal (por el valor inicial)
  suppressPlantillaChange = false;
  // Guardar la plantilla actual de la excepción (si la hay) para evitar guardar si no cambió
  plantillaExcepcionActualId: number | null = null;
  
  // edición de excepción
  isEditExcepcion = false;
  excepcionId: number | null = null;
  
  // Propiedades para horarios
  horariosDisponibles: any[] = [];
  horariosEmpleado: any[] = [];
  excepcionesEmpleado: any[] = [];
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
    private confirmModalService: ConfirmModalService,
    private areasService: AreasService,
    private departamentosService: DepartamentosService,
    private cargosService: CargosService,
    private excepcionesService: ExcepcionesHorariosService,
    private plantillasService: PlantillasHorariosService
  ) {}

  ngOnInit() {
    // Cargar salas del usuario primero, luego cargar datos de empleados
    this.cargarSalasUsuario(() => {
      // Establecer fechas por defecto (hoy hasta un mes adelante)
      const hoy = new Date();
      const enUnMes = new Date();
      enUnMes.setMonth(hoy.getMonth() + 1);
      this.fechaDesde = hoy.toISOString().split('T')[0];
      this.fechaHasta = enUnMes.toISOString().split('T')[0];
      this.generarDiasDelMes();
      this.cargarCatalogosFiltros();
      // No cargar datos hasta que el usuario seleccione filtros y presione Actualizar
    });
  }

  abrirModalExcepcion(empleado: any, dia: Date) {
    this.suppressPlantillaChange = true;
    this.modalEmpleado = empleado;
    this.modalFecha = new Date(dia).toISOString().split('T')[0];
    this.selectedPlantillaId = null;
    this.plantillaExcepcionActualId = null;
    this.isEditExcepcion = false;
    this.excepcionId = null;
    this.modalPlantillas = [];
    
    // Intentar obtener sala_id de diferentes formas
    let salaId = empleado?.Cargo?.Area?.Departamento?.Sala?.id;
    if (!salaId && empleado?.Cargo?.Area?.Departamento) {
      salaId = empleado.Cargo.Area.Departamento.sala_id || empleado?.Cargo?.Area?.Departamento?.sala_id;
    }
    
    console.log('=== Abriendo modal excepción ===');
    console.log('Empleado:', empleado?.nombre);
    console.log('Fecha:', this.modalFecha);
    console.log('Sala ID encontrado:', salaId);
    console.log('Estructura empleado:', {
      Cargo: empleado?.Cargo,
      Area: empleado?.Cargo?.Area,
      Departamento: empleado?.Cargo?.Area?.Departamento,
      Sala: empleado?.Cargo?.Area?.Departamento?.Sala
    });
    
    // Función auxiliar para cargar plantillas y mostrar modal
    const cargarYMostrar = (plantillas: any[]) => {
      console.log('Plantillas finales a mostrar:', plantillas);
      this.modalPlantillas = Array.isArray(plantillas) ? plantillas : [];
      console.log('modalPlantillas después de asignar:', this.modalPlantillas);
      console.log('Cantidad de plantillas:', this.modalPlantillas.length);
      // Prefill si ya existe una excepción para esa fecha
      const key = `${empleado?.id}|${this.modalFecha}`;
      const ex = this.excepcionesMap.get(key);
      if (ex) {
        this.isEditExcepcion = true;
        this.excepcionId = ex.id;
        this.selectedPlantillaId = ex.plantilla_horario_id || ex.PlantillaHorario?.id || null;
        this.plantillaExcepcionActualId = this.selectedPlantillaId;
        
      }
      this.showExcepcionModal = true;
      // Liberar supresión luego de pintar el modal
      setTimeout(() => { this.suppressPlantillaChange = false; }, 0);
    };
    
    // Intentar cargar por sala primero, luego todas como fallback
    if (salaId) {
      console.log('Intentando cargar plantillas por sala:', salaId);
      this.plantillasService.getBySala(salaId).subscribe({
        next: (list: any[]) => {
          console.log('Respuesta API por sala:', list);
          const plantillas = Array.isArray(list) ? list : [];
          if (plantillas.length > 0) {
            cargarYMostrar(plantillas);
          } else {
            console.log('No hay plantillas para esta sala, cargando todas...');
            this.plantillasService.getPlantillasHorarios().subscribe({
              next: (todas: any[]) => {
                console.log('Respuesta API todas las plantillas:', todas);
                cargarYMostrar(Array.isArray(todas) ? todas : []);
              },
              error: (err) => {
                console.error('Error cargando todas las plantillas:', err);
                cargarYMostrar([]);
              }
            });
          }
        },
        error: (err) => {
          console.error('Error cargando plantillas por sala:', err);
          console.log('Fallback: cargando todas las plantillas...');
          this.plantillasService.getPlantillasHorarios().subscribe({
            next: (todas: any[]) => {
              console.log('Respuesta API todas las plantillas (fallback):', todas);
              cargarYMostrar(Array.isArray(todas) ? todas : []);
            },
            error: (err2) => {
              console.error('Error cargando todas las plantillas (fallback):', err2);
              cargarYMostrar([]);
            }
          });
        }
      });
    } else {
      console.log('No se encontró sala_id, cargando todas las plantillas...');
      this.plantillasService.getPlantillasHorarios().subscribe({
        next: (todas: any[]) => {
          console.log('Respuesta API todas las plantillas:', todas);
          cargarYMostrar(Array.isArray(todas) ? todas : []);
        },
        error: (err) => {
          console.error('Error cargando todas las plantillas:', err);
          cargarYMostrar([]);
        }
      });
    }
  }

  cerrarModalExcepcion() {
    if (this.savingExcepcion) return;
    this.showExcepcionModal = false;
  }

  trackByPlantillaId(index: number, item: any): any {
    return item?.id || index;
  }

  guardarExcepcion() {
    if (!this.modalEmpleado || !this.modalFecha || !this.selectedPlantillaId) return;
    this.savingExcepcion = true;
    if (this.isEditExcepcion && this.excepcionId) {
      this.excepcionesService.actualizar(this.excepcionId, {
        plantilla_horario_id: this.selectedPlantillaId
      }).subscribe({
        next: () => {
          this.savingExcepcion = false;
          this.showExcepcionModal = false;
          // Actualización optimista del mapa para reflejar inmediatamente
          const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
          const plantilla = (this.modalPlantillas || []).find((p: any) => p?.id === this.selectedPlantillaId) || null;
          const excepcionActualizada = {
            id: this.excepcionId,
            empleado_id: this.modalEmpleado.id,
            fecha: this.modalFecha,
            plantilla_horario_id: this.selectedPlantillaId,
            PlantillaHorario: plantilla
          };
          this.excepcionesMap.set(key, excepcionActualizada);
          // También actualizar el mapa de excepciones completas
          this.excepcionesCompletas.set(key, excepcionActualizada);
          this.plantillaExcepcionActualId = this.selectedPlantillaId as number;
          // no recarga completa
        },
        error: () => { this.savingExcepcion = false; }
      });
    } else {
      this.excepcionesService.crear({
        empleado_id: this.modalEmpleado.id,
        fecha: this.modalFecha,
        plantilla_horario_id: this.selectedPlantillaId
      }).subscribe({
        next: (res) => {
          this.savingExcepcion = false;
          this.showExcepcionModal = false;
          // Actualización optimista del mapa para reflejar inmediatamente
          const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
          const plantilla = (this.modalPlantillas || []).find((p: any) => p?.id === this.selectedPlantillaId) || null;
          const excepcionCreada = {
            id: res?.id,
            empleado_id: this.modalEmpleado.id,
            fecha: this.modalFecha,
            plantilla_horario_id: this.selectedPlantillaId,
            PlantillaHorario: plantilla
          };
          this.excepcionesMap.set(key, excepcionCreada);
          // También actualizar el mapa de excepciones completas
          this.excepcionesCompletas.set(key, excepcionCreada);
          this.isEditExcepcion = true;
          this.excepcionId = res?.id || this.excepcionId;
          this.plantillaExcepcionActualId = this.selectedPlantillaId as number;
          // no recarga completa
        },
        error: (err) => {
          if (err && err.status === 409) {
            const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
            const ex = this.excepcionesMap.get(key);
            if (ex && ex.id) {
              this.excepcionesService.actualizar(ex.id, { plantilla_horario_id: this.selectedPlantillaId }).subscribe({
                next: () => {
                  this.savingExcepcion = false;
                  this.showExcepcionModal = false;
                  const plantilla = (this.modalPlantillas || []).find((p: any) => p?.id === this.selectedPlantillaId) || null;
                  const excepcionActualizada = {
                    id: ex.id,
                    empleado_id: this.modalEmpleado.id,
                    fecha: this.modalFecha,
                    plantilla_horario_id: this.selectedPlantillaId,
                    PlantillaHorario: plantilla
                  };
                  this.excepcionesMap.set(key, excepcionActualizada);
                  // También actualizar el mapa de excepciones completas
                  this.excepcionesCompletas.set(key, excepcionActualizada);
                },
                error: () => { this.savingExcepcion = false; }
              });
              return;
            }
          }
          this.savingExcepcion = false;
        }
      });
    }
  }

  onPlantillaSeleccionChange(value: any) {
    if (this.suppressPlantillaChange) {
      return;
    }
    if (value === null || typeof value === 'undefined') {
      return; // placeholder, no hacer nada
    }
    if (value === '__delete__') {
      // opción especial para eliminar
      this.eliminarExcepcion();
      return;
    }
    // asignación/edición inmediata
    this.selectedPlantillaId = value as number;
    // Si no cambió respecto a la plantilla actual, no hacer nada
    if (this.plantillaExcepcionActualId && this.selectedPlantillaId === this.plantillaExcepcionActualId) {
      return;
    }
    // Re-evaluar si existe excepción para asegurar PUT y no POST
    if (this.modalEmpleado && this.modalFecha) {
      const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
      const ex = this.excepcionesMap.get(key);
      if (ex) {
        this.isEditExcepcion = true;
        this.excepcionId = ex.id;
      }
    }
    this.guardarExcepcion();
  }

  canEliminarExcepcion(): boolean {
    if (!this.isEditExcepcion || !this.modalEmpleado || !this.modalFecha) {
      return false;
    }
    const dia = new Date(this.modalFecha);
    const horarioActivo = this.getHorarioActivoParaFecha(this.modalEmpleado, dia);
    if (!horarioActivo || !horarioActivo.bloques || horarioActivo.bloques.length === 0) {
      // No existe horario base para ese día
      return false;
    }
    const diasDesdeInicio = this.calcularDiasDesdeInicio(dia, this.modalEmpleado, horarioActivo);
    if (diasDesdeInicio < 0) {
      // Día anterior al inicio del horario
      return false;
    }
    const indiceBloque = diasDesdeInicio % horarioActivo.bloques.length;
    return indiceBloque >= 0 && indiceBloque < horarioActivo.bloques.length;
  }

  eliminarExcepcion() {
    // Permitir eliminar incluso si no se detectó el modo edición, usando el mapa
    if ((!this.isEditExcepcion || !this.excepcionId) && this.modalEmpleado && this.modalFecha) {
      const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
      const ex = this.excepcionesMap.get(key);
      if (ex && ex.id) {
        this.isEditExcepcion = true;
        this.excepcionId = ex.id;
      }
    }
    if (!this.isEditExcepcion || !this.excepcionId) { return; }
    if (this.savingExcepcion) { return; }
    this.savingExcepcion = true;
    this.excepcionesService.eliminar(this.excepcionId).subscribe({
      next: () => {
        this.savingExcepcion = false;
        this.showExcepcionModal = false;
        // Remover de forma optimista la excepción del mapa
        const key = `${this.modalEmpleado.id}|${this.modalFecha}`;
        this.excepcionesMap.delete(key);
        // También eliminar del mapa de excepciones completas
        this.excepcionesCompletas.delete(key);
        // Reset selección del select por si quedó en "Eliminar Registro"
        this.selectedPlantillaId = null;
        this.plantillaExcepcionActualId = null;
        // no recarga completa
      },
      error: () => { this.savingExcepcion = false; }
    });
  }

  private cargarCatalogosFiltros() {
    // Cargar catálogos base para filtros
    this.departamentosService.getDepartamentos().subscribe({
      next: (deps: any[]) => {
        this.departamentosAll = deps || [];
        this.actualizarListasCascada();
      },
      error: () => { this.departamentosAll = []; this.actualizarListasCascada(); }
    });

    this.areasService.getAreas().subscribe({
      next: (areas: any[]) => {
        this.areasAll = areas || [];
        this.actualizarListasCascada();
      },
      error: () => { this.areasAll = []; this.actualizarListasCascada(); }
    });

    this.cargosService.getCargos().subscribe({
      next: (cargos: any[]) => {
        this.cargosAll = cargos || [];
        this.actualizarListasCascada();
      },
      error: () => { this.cargosAll = []; this.actualizarListasCascada(); }
    });
  }

  private cargarSalasUsuario(done?: () => void) {
    this.areasService.getUserSalas().subscribe({
      next: (salas: any[]) => { this.userSalas = salas || []; if (done) done(); },
      error: () => { this.userSalas = []; if (done) done(); }
    });
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

  // Nuevo método: cuando se selecciona una sala en el bloque superior (radio buttons)
  onSalaSelectorChange(salaId: number) {
    if (!salaId) {
      // Si se deselecciona, limpiar datos
      this.selectedSalaForDataLoad = null;
      this.empleadosCompletos = [];
      this.excepcionesCompletas.clear();
      this.empleadosFiltrados = [];
      this.grupos = [];
      this.hasSearched = false;
      this.selectedSalaId = null;
      this.selectedDepartamentoId = null;
      this.selectedAreaId = null;
      this.selectedCargoId = null;
      this.selectedSexo = null;
      this.searchText = '';
      return;
    }
    
    this.selectedSalaForDataLoad = salaId;
    this.loading = true;
    this.hasSearched = false;
    
    // Limpiar filtros locales
    this.selectedSalaId = null;
    this.selectedDepartamentoId = null;
    this.selectedAreaId = null;
    this.selectedCargoId = null;
    this.selectedSexo = null;
    this.searchText = '';
    
    // Limpiar fechas para que se calculen dinámicamente después de cargar los datos
    this.fechaDesde = '';
    this.fechaHasta = '';
    this.fechaMinimaFiltro = '';
    this.fechaMaximaFiltro = '';
    
    // Cargar todos los datos de la sala
    this.cargarDatosCompletosPorSala(salaId);
  }

  // Cargar todos los datos (horarios y excepciones) sin filtros de fecha
  cargarDatosCompletosPorSala(salaId: number) {
    // Primero, obtener todos los empleados de esa sala
    this.empleadosService.getEmpleados().subscribe({
      next: (response) => {
        const todosEmpleados = response || [];
        // Filtrar empleados por sala
        this.empleadosCompletos = todosEmpleados.filter((emp: any) => {
          const cargo = emp?.Cargo;
          if (!cargo) return false;
          const area = cargo.Area;
          if (!area) return false;
          const departamento = area.Departamento;
          if (!departamento) return false;
          const sala = departamento.Sala;
          const salaIdEmp = sala?.id || departamento.sala_id;
          return salaIdEmp === salaId;
        });
        
        // Si no hay empleados, mostrar mensaje y terminar
        if (this.empleadosCompletos.length === 0) {
          this.loading = false;
          this.hasSearched = true;
          this.grupos = [];
          return;
        }
        
        // Cargar horarios para todos los empleados
        this.cargarHorariosCompletos().then(() => {
          // Cargar todas las excepciones sin filtros de fecha
          this.cargarExcepcionesCompletas().then(() => {
            // Calcular fechas mínima y máxima para cargar todos los marcajes
            this.calcularFechasLimiteCompletas().then(() => {
              // Cargar todos los marcajes para el rango completo
              this.cargarMarcajesCompletos().then(() => {
                // Aplicar filtros locales iniciales para mostrar los datos
                this.aplicarFiltrosLocales();
              });
            });
          });
        });
      },
      error: (error) => {
        console.error('Error cargando empleados:', error);
        this.loading = false;
      }
    });
  }

  // Cargar horarios para todos los empleados completos
  async cargarHorariosCompletos(): Promise<void> {
    return new Promise((resolve) => {
      if (this.empleadosCompletos.length === 0) {
        resolve();
        return;
      }
      
      let empleadosProcesados = 0;
      const totalEmpleados = this.empleadosCompletos.filter(e => e.id).length;
      
      if (totalEmpleados === 0) {
        resolve();
        return;
      }
      
      this.empleadosCompletos.forEach(empleado => {
        if (empleado.id) {
          this.empleadosService.getHorariosEmpleado(empleado.id).subscribe({
            next: (horarios) => {
              empleado.horariosEmpleado = horarios || [];
              empleadosProcesados++;
              if (empleadosProcesados === totalEmpleados) {
                resolve();
              }
            },
            error: () => {
              empleado.horariosEmpleado = [];
              empleadosProcesados++;
              if (empleadosProcesados === totalEmpleados) {
                resolve();
              }
            }
          });
        } else {
          empleadosProcesados++;
          if (empleadosProcesados === totalEmpleados) {
            resolve();
          }
        }
      });
    });
  }

  // Cargar todas las excepciones sin filtros de fecha
  async cargarExcepcionesCompletas(): Promise<void> {
    return new Promise((resolve) => {
      this.excepcionesCompletas.clear();
      
      // Obtener todos los IDs de empleados de la sala
      const empleadoIds = this.empleadosCompletos.map(e => e.id).filter(id => id);
      
      if (empleadoIds.length === 0) {
        resolve();
        return;
      }
      
      // Cargar excepciones sin filtros de fecha (pasar undefined para desde y hasta)
      this.excepcionesService.listar(undefined, undefined, undefined).subscribe({
        next: (ex: any[]) => {
          // Filtrar solo las excepciones de los empleados de la sala
          (ex || []).forEach(e => {
            if (empleadoIds.includes(e.empleado_id)) {
              const key = `${e.empleado_id}|${e.fecha}`;
              this.excepcionesCompletas.set(key, e);
            }
          });
          resolve();
        },
        error: () => {
          resolve();
        }
      });
    });
  }

  // Calcular fechas límite completas para cargar todos los marcajes
  async calcularFechasLimiteCompletas(): Promise<void> {
    return new Promise((resolve) => {
      let fechaMin: string | null = null;
      
      // Buscar la fecha más antigua en las excepciones
      this.excepcionesCompletas.forEach((ex) => {
        if (!fechaMin || ex.fecha < fechaMin) {
          fechaMin = ex.fecha;
        }
      });
      
      // Buscar la fecha más antigua en los horarios (primer_dia)
      this.empleadosCompletos.forEach((emp) => {
        if (emp.horariosEmpleado && Array.isArray(emp.horariosEmpleado)) {
          emp.horariosEmpleado.forEach((hor: any) => {
            if (hor.primer_dia) {
              const fechaHorario = typeof hor.primer_dia === 'string' 
                ? hor.primer_dia.split('T')[0] 
                : new Date(hor.primer_dia).toISOString().split('T')[0];
              if (!fechaMin || fechaHorario < fechaMin) {
                fechaMin = fechaHorario;
              }
            }
          });
        }
      });
      
      // Si encontramos una fecha mínima, usarla como límite; si no, usar hace 2 años desde hoy
      if (fechaMin) {
        this.fechaMinimaFiltro = fechaMin;
      } else {
        const hoy = new Date();
        const haceDosAños = new Date();
        haceDosAños.setFullYear(hoy.getFullYear() - 2);
        this.fechaMinimaFiltro = haceDosAños.toISOString().split('T')[0];
      }
      
      // Fecha máxima: siempre 4 meses después de la fecha actual
      const hoy = new Date();
      const enCuatroMeses = new Date();
      enCuatroMeses.setMonth(hoy.getMonth() + 4);
      this.fechaMaximaFiltro = enCuatroMeses.toISOString().split('T')[0];
      
      resolve();
    });
  }

  // Cargar todos los marcajes para el rango completo (sin filtros de fecha)
  async cargarMarcajesCompletos(): Promise<void> {
    return new Promise((resolve) => {
      this.marcajesCompletos.clear();
      
      const empleadosConCedula = this.empleadosCompletos.filter(e => e.cedula);
      const totalEmpleados = empleadosConCedula.length;
      
      if (totalEmpleados === 0 || !this.fechaMinimaFiltro || !this.fechaMaximaFiltro) {
        resolve();
        return;
      }
      
      let empleadosProcesados = 0;
      
      empleadosConCedula.forEach(empleado => {
        this.marcajesService.getMarcajes({
          employee_no: empleado.cedula,
          fecha_inicio: this.fechaMinimaFiltro,
          fecha_fin: this.fechaMaximaFiltro
        }).subscribe({
          next: (response) => {
            this.marcajesCompletos.set(empleado.cedula, response.attlogs || []);
            empleadosProcesados++;
            if (empleadosProcesados === totalEmpleados) {
              resolve();
            }
          },
          error: () => {
            this.marcajesCompletos.set(empleado.cedula, []);
            empleadosProcesados++;
            if (empleadosProcesados === totalEmpleados) {
              resolve();
            }
          }
        });
      });
    });
  }

  // Aplicar filtros locales sin llamar al backend
  aplicarFiltrosLocales() {
    if (!this.selectedSalaForDataLoad || this.empleadosCompletos.length === 0) {
      this.loading = false;
      return;
    }
    
    // Si no hay fechas establecidas, calcular rango dinámico basado en los datos cargados
    if (!this.fechaDesde || !this.fechaHasta) {
      let fechaMin: string | null = null;
      
      // Buscar la fecha más antigua en las excepciones
      this.excepcionesCompletas.forEach((ex) => {
        if (!fechaMin || ex.fecha < fechaMin) {
          fechaMin = ex.fecha;
        }
      });
      
      // Buscar la fecha más antigua en los horarios (primer_dia)
      this.empleadosCompletos.forEach((emp) => {
        if (emp.horariosEmpleado && Array.isArray(emp.horariosEmpleado)) {
          emp.horariosEmpleado.forEach((hor: any) => {
            if (hor.primer_dia) {
              const fechaHorario = typeof hor.primer_dia === 'string' 
                ? hor.primer_dia.split('T')[0] 
                : new Date(hor.primer_dia).toISOString().split('T')[0];
              if (!fechaMin || fechaHorario < fechaMin) {
                fechaMin = fechaHorario;
              }
            }
          });
        }
      });
      
      // Si encontramos una fecha mínima, usarla como límite; si no, usar hace 2 años desde hoy
      let fechaMinPermitida: string;
      if (fechaMin) {
        fechaMinPermitida = fechaMin;
        this.fechaMinimaFiltro = fechaMin; // Guardar como límite mínimo
      } else {
        const hoy = new Date();
        const haceDosAños = new Date();
        haceDosAños.setFullYear(hoy.getFullYear() - 2);
        fechaMinPermitida = haceDosAños.toISOString().split('T')[0];
        this.fechaMinimaFiltro = fechaMinPermitida; // Guardar como límite mínimo
      }
      
      // Fecha máxima: siempre 4 meses después de la fecha actual
      const hoy = new Date();
      const enCuatroMeses = new Date();
      enCuatroMeses.setMonth(hoy.getMonth() + 4);
      this.fechaMaximaFiltro = enCuatroMeses.toISOString().split('T')[0];
      
      // Establecer rango inicial basado en el día actual del mes
      const diaActual = hoy.getDate();
      let fechaInicioInicial: Date;
      let fechaFinInicial: Date;
      
      if (diaActual > 15) {
        // Si el día es mayor a 15: desde el 16 del mes actual hasta el último día del mes
        fechaInicioInicial = new Date(hoy.getFullYear(), hoy.getMonth(), 16);
        fechaFinInicial = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); // Último día del mes
      } else {
        // Si el día es menor o igual a 15: desde el 1 del mes actual hasta el 15
        fechaInicioInicial = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        fechaFinInicial = new Date(hoy.getFullYear(), hoy.getMonth(), 15);
      }
      
      // Asegurarse de que las fechas iniciales estén dentro de los límites permitidos
      const fechaMinPermitidaDate = new Date(fechaMinPermitida);
      const fechaMaxPermitidaDate = new Date(this.fechaMaximaFiltro);
      
      // Si la fecha de inicio inicial es menor que la mínima permitida, usar la mínima permitida
      if (fechaInicioInicial < fechaMinPermitidaDate) {
        fechaInicioInicial = new Date(fechaMinPermitidaDate);
      }
      
      // Si la fecha fin inicial es mayor que la máxima permitida, usar la máxima permitida
      if (fechaFinInicial > fechaMaxPermitidaDate) {
        fechaFinInicial = new Date(fechaMaxPermitidaDate);
      }
      
      // Establecer las fechas iniciales
      this.fechaDesde = fechaInicioInicial.toISOString().split('T')[0];
      this.fechaHasta = fechaFinInicial.toISOString().split('T')[0];
    }
    
    this.hasSearched = true;
    this.loading = true;
    
    // Generar días del mes basado en las fechas seleccionadas
    this.generarDiasDelMes();
    this.generarMesesAgrupados();
    
    // Filtrar empleados localmente
    this.empleados = [...this.empleadosCompletos];
    this.aplicarFiltrosCascada();
    
    // Filtrar excepciones por rango de fechas localmente
    this.excepcionesMap.clear();
    this.excepcionesCompletas.forEach((ex, key) => {
      if (ex.fecha >= this.fechaDesde && ex.fecha <= this.fechaHasta) {
        this.excepcionesMap.set(key, ex);
      }
    });
    
    // Filtrar marcajes localmente de los marcajes completos ya cargados
    this.filtrarMarcajesLocalmente();
  }

  // Filtrar marcajes localmente de los marcajes completos ya cargados
  filtrarMarcajesLocalmente(): void {
    this.marcajesPorEmpleado.clear();
    
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 
      ? this.empleadosFiltrados 
      : this.empleados;
    
    if (base.length === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }
    
    // Si tenemos marcajes completos cargados, filtrarlos localmente
    if (this.marcajesCompletos.size > 0) {
      base.forEach(empleado => {
        if (empleado.cedula) {
          const marcajesCompletos = this.marcajesCompletos.get(empleado.cedula) || [];
          // Filtrar marcajes por rango de fechas
          const marcajesFiltrados = marcajesCompletos.filter((marcaje: any) => {
            const fechaMarcaje = marcaje.fecha ? marcaje.fecha.split('T')[0] : null;
            if (!fechaMarcaje) return false;
            return fechaMarcaje >= this.fechaDesde && fechaMarcaje <= this.fechaHasta;
          });
          this.marcajesPorEmpleado.set(empleado.cedula, marcajesFiltrados);
        }
      });
      this.agruparEmpleados();
      this.loading = false;
    } else {
      // Si no hay marcajes completos cargados (caso de fallback), usar el método anterior
      this.cargarMarcajesPorRango();
    }
  }

  // Cargar marcajes solo para el rango de fechas seleccionado (método fallback si no hay marcajes completos)
  cargarMarcajesPorRango() {
    this.marcajesPorEmpleado.clear();
    
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 
      ? this.empleadosFiltrados 
      : this.empleados;
    
    if (base.length === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }
    
    // Si hay empleados con cédula, cargar marcajes; si no, mostrar directamente
    const empleadosConCedula = base.filter(e => e.cedula);
    const totalEmpleados = empleadosConCedula.length;
    
    if (totalEmpleados === 0) {
      // Si no hay empleados con cédula, mostrar igualmente los empleados con horarios
      this.agruparEmpleados();
      this.loading = false;
      return;
    }
    
    let empleadosProcesados = 0;
    
    empleadosConCedula.forEach(empleado => {
      this.marcajesService.getMarcajes({
        employee_no: empleado.cedula,
        fecha_inicio: this.fechaDesde,
        fecha_fin: this.fechaHasta
      }).subscribe({
        next: (response) => {
          this.marcajesPorEmpleado.set(empleado.cedula, response.attlogs || []);
          empleadosProcesados++;
          if (empleadosProcesados === totalEmpleados) {
            this.agruparEmpleados();
            this.loading = false;
          }
        },
        error: () => {
          this.marcajesPorEmpleado.set(empleado.cedula, []);
          empleadosProcesados++;
          if (empleadosProcesados === totalEmpleados) {
            this.agruparEmpleados();
            this.loading = false;
          }
        }
      });
    });
  }

  // Cuando cambian los filtros locales (sin cargar del backend)
  onFiltroLocalChange() {
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    }
  }

  cargarDatos() {
    if (!this.fechaDesde || !this.fechaHasta) {
      
      return;
    }
    this.hasSearched = true;

    this.loading = true;
    this.generarDiasDelMes();
    this.generarMesesAgrupados();

    this.empleadosService.getEmpleados().subscribe({
      next: (response) => {
        this.empleados = response || [];
        this.aplicarFiltrosCascada();
        
        // Cargar horarios para todos los empleados primero
        this.cargarHorariosYMarcajes();
      },
      error: (error) => {
        
        
        this.loading = false;
      }
    });
  }

  // Eventos de cascada
  onSalaChange() {
    this.selectedDepartamentoId = null;
    this.selectedAreaId = null;
    this.selectedCargoId = null;
    this.actualizarListasCascada();
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  onDepartamentoChange() {
    this.selectedAreaId = null;
    this.selectedCargoId = null;
    this.actualizarListasCascada();
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  onAreaChange() {
    this.selectedCargoId = null;
    this.actualizarListasCascada();
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  onCargoChange() {
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  onSexoChange() {
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  onSearchChange() {
    // Si tenemos datos completos, aplicar filtros locales
    if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
      this.aplicarFiltrosLocales();
    } else {
      this.aplicarFiltrosCascada();
    }
  }

  private actualizarListasCascada() {
    // Usar selectedSalaId si está seleccionado, si no usar selectedSalaForDataLoad
    const salaParaFiltrar = this.selectedSalaId || this.selectedSalaForDataLoad;
    
    // Filtrar departamentos por sala
    this.departamentosFiltrados = (this.departamentosAll || []).filter(d => !salaParaFiltrar || d.sala_id === salaParaFiltrar);
    // Filtrar áreas por departamento
    this.areasFiltradas = (this.areasAll || []).filter(a => !this.selectedDepartamentoId || a.departamento_id === this.selectedDepartamentoId);
    // Filtrar cargos por área
    this.cargosFiltrados = (this.cargosAll || []).filter(c => !this.selectedAreaId || c.area_id === this.selectedAreaId);
  }

  private aplicarFiltrosCascada() {
    // Si tenemos datos completos cargados, usar esos; si no, usar empleados normales
    const baseEmpleados = this.empleadosCompletos.length > 0 ? this.empleadosCompletos : this.empleados;
    this.empleadosFiltrados = (baseEmpleados || []).filter(e => this.empleadoCoincideFiltros(e));
  }

  private empleadoCoincideFiltros(empleado: any): boolean {
    const salaId = empleado?.Cargo?.Area?.Departamento?.Sala?.id || empleado?.Cargo?.Area?.Departamento?.sala_id;
    const departamentoId = empleado?.Cargo?.Area?.Departamento?.id;
    const areaId = empleado?.Cargo?.Area?.id;
    const cargoId = empleado?.Cargo?.id;
    const sexo = empleado?.sexo || 'No especificado';
    const term = (this.searchText || '').trim().toLowerCase();
    const nombre = (empleado?.nombre || '').toLowerCase();
    const cedula = (empleado?.cedula || '').toString().toLowerCase();

    // Si estamos en modo local (con selectedSalaForDataLoad), no filtrar por sala aquí
    // ya que todos los empleadosCompletos ya son de esa sala
    if (!this.selectedSalaForDataLoad && this.selectedSalaId && salaId !== this.selectedSalaId) return false;
    if (this.selectedDepartamentoId && departamentoId !== this.selectedDepartamentoId) return false;
    if (this.selectedAreaId && areaId !== this.selectedAreaId) return false;
    if (this.selectedCargoId && cargoId !== this.selectedCargoId) return false;
    if (this.selectedSexo && sexo !== this.selectedSexo) return false;
    if (term && !(nombre.includes(term) || cedula.includes(term))) return false;
    return true;
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
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 ? this.empleadosFiltrados : this.empleados;
    const totalEmpleados = base.filter(e => e.id).length;

    if (totalEmpleados === 0) {
      this.agruparEmpleados();
      this.loading = false;
      return;
    }

    // Cargar horarios y marcajes para cada empleado
    base.forEach(empleado => {
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
                    // Cargar excepciones del rango visible
                    this.cargarExcepcionesRango();
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
                this.cargarExcepcionesRango();
              }
            }
          },
          error: (error) => {
            
            empleado.horariosEmpleado = [];
            empleadosProcesados++;
            
            if (empleadosProcesados === totalEmpleados) {
              this.cargarExcepcionesRango();
            }
          }
        });
      }
    });
  }

  private cargarExcepcionesRango() {
    this.excepcionesMap.clear();
    this.excepcionesService.listar(undefined, this.fechaDesde, this.fechaHasta).subscribe({
      next: (ex: any[]) => {
        (ex || []).forEach(e => {
          const key = `${e.empleado_id}|${e.fecha}`;
          this.excepcionesMap.set(key, e);
        });
        this.agruparEmpleados();
        this.loading = false;
      },
      error: () => {
        this.agruparEmpleados();
        this.loading = false;
      }
    });
  }

  private formatDateLocalYYYYMMDD(d: Date): string {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  hasExcepcion(empleado: any, dia: Date): boolean {
    const fechaStr = this.formatDateLocalYYYYMMDD(new Date(dia));
    const key = `${empleado?.id}|${fechaStr}`;
    return this.excepcionesMap.has(key);
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
    const gruposMap = new Map<number, { nombre: string; empleados: any[] }>();
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 ? this.empleadosFiltrados : this.empleados;

    // Si hay sala seleccionada (por radio buttons o por filtro), mostrar solo esa sala
    const salaSeleccionada = this.selectedSalaForDataLoad || this.selectedSalaId;
    if (salaSeleccionada) {
      const salaKey = Number(salaSeleccionada);
      const salaSel = this.userSalas?.find(s => s.id === salaKey);
      const nombreSala = salaSel?.nombre || 'Sala seleccionada';
      gruposMap.set(salaKey, { nombre: nombreSala, empleados: [] });

      base.forEach(empleado => {
        const sala = empleado.Cargo?.Area?.Departamento?.Sala;
        if (sala?.id === salaKey) {
          gruposMap.get(salaKey)!.empleados.push(empleado);
        }
      });

      this.grupos = Array.from(gruposMap.values());
      return;
    }

    // Sin sala seleccionada: sembrar todas las salas del usuario y luego poblar empleados
    if (this.userSalas && this.userSalas.length > 0) {
      this.userSalas.forEach(s => {
        if (!gruposMap.has(s.id)) {
          gruposMap.set(s.id, { nombre: s.nombre, empleados: [] });
        }
      });
    }

    base.forEach(empleado => {
      const sala = empleado.Cargo?.Area?.Departamento?.Sala;
      if (!sala || !sala.id) return;
      const key = sala.id as number;
      if (!gruposMap.has(key)) {
        gruposMap.set(key, { nombre: sala.nombre, empleados: [] });
      }
      gruposMap.get(key)!.empleados.push(empleado);
    });

    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorAreas() {
    const gruposMap = new Map();
    
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 ? this.empleadosFiltrados : this.empleados;
    base.forEach(empleado => {
      const sala = empleado.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Area?.nombre || 'Sin Area';
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
    
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 ? this.empleadosFiltrados : this.empleados;
    base.forEach(empleado => {
      const sala = empleado.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Area?.nombre || 'Sin Area';
      const departamento = empleado.Cargo?.Area?.Departamento?.nombre || 'Sin Departamento';
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
    
    const base = this.empleadosFiltrados && this.empleadosFiltrados.length > 0 ? this.empleadosFiltrados : this.empleados;
    base.forEach(empleado => {
      const sala = empleado.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin Sala';
      const area = empleado.Cargo?.Area?.nombre || 'Sin Area';
      const departamento = empleado.Cargo?.Area?.Departamento?.nombre || 'Sin Departamento';
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

  todosLosGruposEstanVacios(): boolean {
    // Verificar si todos los grupos tienen 0 empleados
    if (!this.grupos || this.grupos.length === 0) {
      return false;
    }
    return this.grupos.every(grupo => !grupo.empleados || grupo.empleados.length === 0);
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
    // Prioridad: excepción de horario por día
    const fechaStr = this.formatDateLocalYYYYMMDD(new Date(dia));
    const key = `${empleado?.id}|${fechaStr}`;
    const ex = this.excepcionesMap.get(key);
    if (ex && ex.PlantillaHorario) {
      // Construir bloque virtual con la plantilla de la excepción
      const plantilla = ex.PlantillaHorario;
      const turno = this.convertirHoraAMinutos(plantilla.hora_entrada) > this.convertirHoraAMinutos(plantilla.hora_salida) ? 'NOCTURNO' : 'DIURNO';
      return {
        orden: 1,
        turno,
        PlantillaHorario: plantilla,
        hora_entrada: plantilla.hora_entrada,
        hora_salida: plantilla.hora_salida,
        hora_entrada_descanso: plantilla.hora_descanso_entrada,
        hora_salida_descanso: plantilla.hora_descanso_salida,
        tiene_descanso: !!(plantilla.hora_descanso_entrada && plantilla.hora_descanso_salida)
      };
    } else if (ex && ex.plantilla_horario_id) {
      // Si API no incluyó include, al menos marcar como diurno por defecto
      return {
        orden: 1,
        turno: 'DIURNO',
        PlantillaHorario: null
      };
    }

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

  // Calcular marcajes según la plantilla de horario con lógica inteligente
  calcularMarcajesDelDia(empleado: any, dia: Date, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    // Obtener horas de la plantilla (PlantillaHorario)
    const plantilla = bloque?.PlantillaHorario;
    if (!plantilla || !plantilla.hora_entrada || !plantilla.hora_salida) {
      return { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
    }

    const horaEntradaPlantilla = this.convertirHoraAMinutos(plantilla.hora_entrada);
    const horaSalidaPlantilla = this.convertirHoraAMinutos(plantilla.hora_salida);
    const tieneDescanso = !!(plantilla.hora_descanso_entrada && plantilla.hora_descanso_salida);
    
    let marcajesParaAnalizar: any[] = [];
    let esTurnoNocturno = false;

    // Determinar si es turno nocturno (hora_entrada > hora_salida)
    if (horaEntradaPlantilla > horaSalidaPlantilla) {
      // Turno nocturno: entrada del día actual, salida del día siguiente
      esTurnoNocturno = true;
      const marcajesHoy = this.getMarcajesDelDia(empleado, dia);
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const marcajesManana = this.getMarcajesDelDia(empleado, diaSiguiente);
      marcajesParaAnalizar = [...marcajesHoy, ...marcajesManana].sort((a, b) => 
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      );
    } else {
      // Turno diurno: todos los marcajes del mismo día
      marcajesParaAnalizar = this.getMarcajesDelDia(empleado, dia);
    }

    if (marcajesParaAnalizar.length === 0) {
      return { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
    }

    // Crear objeto bloque con horas de plantilla para usar en asignación inteligente
    const bloqueConPlantilla = {
      hora_entrada: plantilla.hora_entrada,
      hora_salida: plantilla.hora_salida,
      hora_entrada_descanso: plantilla.hora_descanso_entrada || '',
      hora_salida_descanso: plantilla.hora_descanso_salida || '',
      tiene_descanso: tieneDescanso,
      turno: esTurnoNocturno ? 'NOCTURNO' : 'DIURNO'
    };

    // Analizar marcajes usando la lógica inteligente
    const marcajesAnalizados = this.analizarMarcajesInteligente(marcajesParaAnalizar, bloqueConPlantilla, bloqueConPlantilla.turno);

    // Aplicar validaciones de diferencias de tiempo
    const marcajesConValidacion = this.validarDiferenciasTiempo(marcajesAnalizados, bloqueConPlantilla);
    
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

    // Asignar entrada descanso solo si hay descanso definido en la plantilla
    if (bloque.tiene_descanso && horasProgramadas.entradaDescanso > 0) {
      const entradaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.entradaDescanso, marcajesUsados);
      asignaciones.entradaDescanso = entradaDescansoAsignada;

      // Asignar salida descanso solo si hay descanso definido
      if (horasProgramadas.salidaDescanso > 0) {
        const salidaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.salidaDescanso, marcajesUsados);
        asignaciones.salidaDescanso = salidaDescansoAsignada;
      }
    }

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
        // Múltiples marcajes en nocturno: usar asignación inteligente
        const marcajesAsignados = this.asignarMarcajesInteligente(marcajesOrdenados, bloque);
        return marcajesAsignados;
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
      } else {
        // Dos o más marcajes en diurno: usar asignación inteligente según proximidad
        const marcajesAsignados = this.asignarMarcajesInteligente(marcajesOrdenados, bloque);
        return marcajesAsignados;
      }
    }

    return resultado;
  }

  // Calcular resumen de horas trabajadas
  calcularResumenHoras(marcajes: { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string }, bloque: any): { texto: string, claseColor: string } {
    // Usar horas de PlantillaHorario si están disponibles, sino usar las del bloque
    const plantilla = bloque?.PlantillaHorario;
    const horaEntrada = plantilla?.hora_entrada || bloque?.hora_entrada || '';
    const horaSalida = plantilla?.hora_salida || bloque?.hora_salida || '';
    const horaEntradaDescanso = plantilla?.hora_descanso_entrada || bloque?.hora_entrada_descanso || '';
    const horaSalidaDescanso = plantilla?.hora_descanso_salida || bloque?.hora_salida_descanso || '';
    const tieneDescanso = bloque?.tiene_descanso || !!(horaEntradaDescanso && horaSalidaDescanso);
    
    // Calcular horas programadas
    const horaEntradaProgramada = this.convertirHoraAMinutos(horaEntrada);
    const horaSalidaProgramada = this.convertirHoraAMinutos(horaSalida);
    
    let horasATrabajar;
    const esNocturno = bloque?.turno === 'NOCTURNO' || horaEntradaProgramada > horaSalidaProgramada;
    if (esNocturno) {
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
    if (tieneDescanso && horaEntradaDescanso && horaSalidaDescanso) {
      const entradaDescansoProgramada = this.convertirHoraAMinutos(horaEntradaDescanso);
      const salidaDescansoProgramada = this.convertirHoraAMinutos(horaSalidaDescanso);
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
      if (esNocturno) {
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
      
      if (tieneDescanso && marcajes.entradaDescanso !== 'Sin marcaje' && marcajes.salidaDescanso !== 'Sin marcaje') {
        // Con descanso real: horas trabajadas = totalidad - horas descansadas
        const entradaDescansoReal = this.convertirHoraAMinutos(marcajes.entradaDescanso);
        const salidaDescansoReal = this.convertirHoraAMinutos(marcajes.salidaDescanso);
        
        // Calcular horas de descanso considerando cruce de medianoche para turnos nocturnos
        if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
          // El descanso cruza medianoche
          horasDescansadas = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
          
        } else {
          // Descanso normal (diurno o nocturno sin cruce)
          horasDescansadas = salidaDescansoReal - entradaDescansoReal;
        }
        
        horasTrabajadas = horasTotales - horasDescansadas;
        
      } else if (tieneDescanso) {
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
        // Usar horas de PlantillaHorario si están disponibles
        const plantillaHorario = bloque?.PlantillaHorario;
        const horaEntrada = this.formatearHora(plantillaHorario?.hora_entrada || bloque?.hora_entrada || '');
        const horaSalida = this.formatearHora(plantillaHorario?.hora_salida || bloque?.hora_salida || '');
        const horaEntradaDescanso = plantillaHorario?.hora_descanso_entrada || bloque?.hora_entrada_descanso || '';
        const horaSalidaDescanso = plantillaHorario?.hora_descanso_salida || bloque?.hora_salida_descanso || '';
        const tieneDescanso = bloque?.tiene_descanso || !!(horaEntradaDescanso && horaSalidaDescanso);
        
        if (tieneDescanso && horaEntradaDescanso && horaSalidaDescanso) {
          const entradaDescanso = this.formatearHora(horaEntradaDescanso);
          const salidaDescanso = this.formatearHora(horaSalidaDescanso);
          resultado = `${horaEntrada} - ${entradaDescanso} - ${salidaDescanso} - ${horaSalida}`;
        } else {
          resultado = `${horaEntrada} - Sin descanso - ${horaSalida}`;
        }
        break;
      case 'Descanso':
        // Mostrar marcajes reales o "Sin Registros" si no hay marcajes
        
        const marcajesDescanso = this.calcularMarcajesDelDia(empleado, dia, bloque);
        
        
        // Obtener información de descanso de la plantilla si está disponible
        const plantillaDescanso = bloque?.PlantillaHorario;
        const tieneDescansoPlantilla = !!(plantillaDescanso?.hora_descanso_entrada && plantillaDescanso?.hora_descanso_salida);
        
        if (marcajesDescanso.entrada !== 'Sin marcaje' && marcajesDescanso.salida !== 'Sin marcaje') {
          // Mostrar marcajes reales con formato según si hay descanso programado
          if (tieneDescansoPlantilla) {
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

  // Esta función ya no se usa - ahora todo es dinámico según las plantillas

  // Verificar si es sin horario (fechas anteriores a la fecha de inicio)
  isSinHorario(empleado: any, dia: Date): boolean {
    // Si hay una excepción para ese día, NO es "sin horario"
    const fechaStrCheck = this.formatDateLocalYYYYMMDD(new Date(dia));
    const keyCheck = `${empleado?.id}|${fechaStrCheck}`;
    if (this.excepcionesMap.has(keyCheck)) {
      return false;
    }
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
    // Solo distinguir entre sin horario y con horario
    // El resto es dinámico según las plantillas
    if (this.isSinHorario(empleado, dia)) {
      return 'sin-horario';
    }
    
    // Si tiene horario, retornar clase genérica
    return 'con-horario';
  }

  // Métodos para el modal
  abrirModalEmpleado(empleado: any) {
    
    
    
    this.empleadoSeleccionado = empleado;
    this.mostrarModal = true;
    this.resetearFormulario();
    this.cargarHorariosPorSala();
    this.cargarHorariosEmpleado();
    this.cargarExcepcionesEmpleado();
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
    if (!this.empleadoSeleccionado?.Cargo?.Area?.Departamento?.Sala?.id) {
      this.horariosDisponibles = [];
      
      return;
    }

    const salaId = this.empleadoSeleccionado.Cargo.Area.Departamento.Sala.id;
    

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

  private cargarExcepcionesEmpleado() {
    if (!this.empleadoSeleccionado?.id) return;
    this.excepcionesService.listar(this.empleadoSeleccionado.id).subscribe({
      next: (ex: any[]) => {
        const lista = Array.isArray(ex) ? ex : [];
        // Ordenar desc por fecha (más reciente primero)
        this.excepcionesEmpleado = lista.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      },
      error: () => { this.excepcionesEmpleado = []; }
    });
  }

  eliminarExcepcionDirecta(ex: any) {
    if (!ex || !ex.id) return;
    this.excepcionesService.eliminar(ex.id).subscribe({
      next: () => {
        // quitar de la lista del modal
        this.excepcionesEmpleado = (this.excepcionesEmpleado || []).filter((e: any) => e.id !== ex.id);
        // quitar del mapa de la vista principal
        const key = `${this.empleadoSeleccionado?.id}|${ex.fecha}`;
        this.excepcionesMap.delete(key);
        // refrescar agrupación para reflejar en la grilla general si está abierta
        this.agruparEmpleados();
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
        // Actualización local en caliente con el elemento creado que retorna la API
        const nuevo = {
          id: response?.id,
          primer_dia: response?.primer_dia,
          Horario: response?.Horario
        };
        const lista = Array.isArray(this.horariosEmpleado) ? [...this.horariosEmpleado] : [];
        lista.push(nuevo);
        // Ordenar por fecha de inicio ascendente
        this.horariosEmpleado = lista.sort((a: any, b: any) => new Date(a.primer_dia).getTime() - new Date(b.primer_dia).getTime());

        this.resetearFormulario();
        // Reflejar cambios en la vista principal
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
        // Remover localmente
        this.horariosEmpleado = (this.horariosEmpleado || []).filter((he: any) => he.id !== horarioEmpleadoId);
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

  getTurnoFromBloque(bloque: any): string {
    if (!bloque) { return ''; }
    // Si ya viene el campo turno, úsalo
    if (bloque.turno) { return bloque.turno; }
    const plantilla = bloque.PlantillaHorario;
    if (plantilla && typeof plantilla.codigo === 'string') {
      const code = (plantilla.codigo || '').toUpperCase();
      if (code === 'L' || code === 'LIBRE') { return 'LIBRE'; }
    }
    // Inferir por horas si es nocturno
    const entrada = plantilla?.hora_entrada;
    const salida = plantilla?.hora_salida;
    if (entrada && salida) {
      const toMinutes = (t: string) => {
        const [h, m] = t.split(':').map((x: string) => parseInt(x, 10));
        return h * 60 + m;
      };
      return toMinutes(entrada) > toMinutes(salida) ? 'NOCTURNO' : 'DIURNO';
    }
    // Por defecto considerarlo diurno (trabajo)
    return 'DIURNO';
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
    // Copiar los horarios del modal al empleado en la lista principal
    if (this.empleadoSeleccionado?.id) {
      const idx = this.empleados.findIndex(e => e.id === this.empleadoSeleccionado.id);
      if (idx >= 0) {
        this.empleados[idx] = {
          ...this.empleados[idx],
          horariosEmpleado: Array.isArray(this.horariosEmpleado) ? [...this.horariosEmpleado] : []
        };
      }
      // Si existe en la lista filtrada, actualizar también la referencia
      const idxF = this.empleadosFiltrados.findIndex(e => e.id === this.empleadoSeleccionado.id);
      if (idxF >= 0) {
        this.empleadosFiltrados[idxF] = {
          ...this.empleadosFiltrados[idxF],
          horariosEmpleado: Array.isArray(this.horariosEmpleado) ? [...this.horariosEmpleado] : []
        };
      }
    }
    // Regenerar días (por si cambió el rango con el botón Filtrar) y reagrupar
    this.generarDiasDelMes();
    this.agruparEmpleados();
  }

  getContrastColorPlantilla(hexColor: string): string {
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
