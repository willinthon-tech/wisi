import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
import { FeriadosService } from '../../../services/feriados.service';

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
                    [disabled]="loading || !selectedSalaForDataLoad"
                    (change)="onDepartamentoChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let d of departamentosFiltrados" [ngValue]="d.id">{{ d.nombre }}</option>
            </select>
          </div>
          <div class="filter-group col-sm-3">
            <label for="areaSelect">Área:</label>
            <select id="areaSelect" class="form-select"
                    [(ngModel)]="selectedAreaId"
                    [disabled]="loading || !selectedDepartamentoId"
                    (change)="onAreaChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let a of areasFiltradas" [ngValue]="a.id">{{ a.nombre }}</option>
            </select>
          </div>
          <div class="filter-group col-sm-3">
            <label for="cargoSelect">Cargo:</label>
            <select id="cargoSelect" class="form-select"
                    [(ngModel)]="selectedCargoId"
                    [disabled]="loading || !selectedAreaId"
                    (change)="onCargoChange()">
              <option [ngValue]="null">Todo</option>
              <option *ngFor="let c of cargosFiltrados" [ngValue]="c.id">{{ c.nombre }}</option>
            </select>
          </div>

          <div class="filter-group col-sm-3">
            <label for="sexoSelect">Sexo:</label>
            <select id="sexoSelect" class="form-select"
                    [(ngModel)]="selectedSexo"
                    [disabled]="loading || !selectedSalaForDataLoad"
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
                   [disabled]="loading || !selectedSalaForDataLoad"
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
              [disabled]="loading || !selectedSalaForDataLoad"
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
              [disabled]="loading || !selectedSalaForDataLoad"
              [min]="fechaMinimaFiltro"
              [max]="fechaMaximaFiltro"
              (change)="onFiltroLocalChange()">
          </div>
        </div>
        
      </div>

      <!-- Bloque: Selección de tipo de reporte -->
      <div class="sala-selector-section">
        <div class="sala-selector-container">
          <label class="sala-selector-label">Seleccionar tipo de reporte:</label>
          <div class="radio-buttons-group">
            <label class="radio-option">
              <input 
                type="radio" 
                name="tipoReporteSelector" 
                value="global"
                [checked]="tipoReporte === 'global'"
                [disabled]="loading"
                (change)="onTipoReporteChange('global')"
                class="radio-input">
              <span class="radio-label">Marcajes</span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                name="tipoReporteSelector" 
                value="horario"
                [checked]="tipoReporte === 'horario'"
                [disabled]="loading"
                (change)="onTipoReporteChange('horario')"
                class="radio-input">
              <span class="radio-label">Horarios</span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                name="tipoReporteSelector" 
                value="resumen"
                [checked]="tipoReporte === 'resumen'"
                [disabled]="loading"
                (change)="onTipoReporteChange('resumen')"
                class="radio-input">
              <span class="radio-label">Calculos</span>
            </label>
          </div>
        </div>
      </div>


      <div class="grupos-container printable" *ngIf="!loading && hasSearched && grupos.length > 0 && !todosLosGruposEstanVacios()">
        <div class="grupo-card" *ngFor="let grupo of grupos; let i = index" [attr.data-grupo-index]="i">
          <div class="grupo-header">
            <div class="grupo-header-content">
              <h3>{{ getNombreTipoReporte() }}</h3>
              <div class="filtros-activos" *ngIf="getFiltrosActivosTexto()">
                {{ getFiltrosActivosTexto() }}
              </div>
            </div>
            <div class="grupo-actions">
              <span class="empleados-count">{{ grupo.empleados.length }} empleado(s)</span>
              <!-- Botón de Descargar para Marcajes -->
              <button 
                *ngIf="tipoReporte === 'global'"
                class="btn-print-group no-print" 
                (click)="descargarImagenGrupo(grupo)"
                [disabled]="descargandoImagen"
                [class.loading]="descargandoImagen && grupoDescargando === grupo.nombre">
                <span *ngIf="!descargandoImagen || grupoDescargando !== grupo.nombre">Descargar</span>
                <span *ngIf="descargandoImagen && grupoDescargando === grupo.nombre">
                  <span class="spinner-small"></span> Generando...
                </span>
              </button>
              <!-- Botón de Imprimir para Horarios y Calculos -->
              <button 
                *ngIf="tipoReporte === 'horario' || tipoReporte === 'resumen'"
                class="btn-print-group no-print" 
                (click)="printGrupo(grupo)">
                Imprimir
              </button>
            </div>
          </div>
          
          <!-- Vista Resumen: Tabla con métricas agregadas -->
          <div class="grupo-table-container" *ngIf="grupo.empleados.length > 0 && tipoReporte === 'resumen'">
            <div class="table-wrapper">
              <table class="horario-table resumen-table">
                <thead>
                  <tr class="mes-header">
                    <th class="empleado-completo-col-empty" rowspan="2">Empleado</th>
                    <th class="resumen-metric-col">Diurnos</th>
                    <th class="resumen-metric-col">Nocturnos</th>
                    <th class="resumen-metric-col">Horas<br />Diurnos</th>
                    <th class="resumen-metric-col">Horas<br />Nocturnos</th>
                    <th class="resumen-metric-col">Domingos</th>
                    <th class="resumen-metric-col">Feriados</th>
                    <th class="resumen-metric-col" *ngFor="let plantilla of plantillasLibres">
                      {{ plantilla.nombre }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <ng-container *ngFor="let empleado of grupo.empleados">
                    <tr>
                      <td class="empleado-completo-cell">
                        <div class="empleado-completo">
                          <div class="empleado-info">
                            <div class="empleado-nombre">{{ empleado.nombre }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenDiasDiurnosTrabajadosPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenDiasNocturnosTrabajadosPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenHorasDiurnosPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenHorasNocturnoPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenDomingosTrabajadosPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell">
                        {{ getResumenFeriadosTrabajadosPorEmpleado(empleado) }}
                      </td>
                      <td class="resumen-value-cell" *ngFor="let plantilla of plantillasLibres">
                        {{ getResumenDiasPorPlantillaSinHoras(empleado, plantilla.id) }}
                      </td>
                    </tr>
                    <tr class="separador-verde">
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;"></td>
                      <td style="height: 1px !important; background-color: #28a745; padding: 0; margin: 0; border: none;" *ngFor="let plantilla of plantillasLibres"></td>
                    </tr>
                  </ng-container>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Vista Global/Horario: Tabla con días del mes -->
          <div class="grupo-table-container" *ngIf="grupo.empleados.length > 0 && tipoReporte !== 'resumen'">
            <div class="table-wrapper">
              <table class="horario-table">
                <thead>
                  <tr class="mes-header">
                    <th class="empleado-completo-col-empty" [attr.colspan]="tipoReporte === 'horario' ? 1 : 2" [attr.rowspan]="3">Empleado</th>
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
                      <td class="empleado-completo-cell" [attr.rowspan]="tipoReporte === 'horario' ? null : 4">
                        <div class="empleado-completo">
                          <div class="foto-container" *ngIf="tipoReporte !== 'horario'">
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
                            <div class="empleado-cedula" *ngIf="tipoReporte !== 'horario'">{{ empleado.cedula }}</div>
                            <div class="empleado-cargo" *ngIf="tipoReporte !== 'horario'">{{ empleado.Cargo?.nombre || 'Sin cargo' }}</div>
                          </div>
                        </div>
                      </td>
                      <td class="horario-cell" *ngIf="tipoReporte !== 'horario'">
                        <div class="horario-info">
                          Horario
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class]="getTurnoClass(empleado, dia)"
                          [attr.rowspan]="tipoReporte === 'horario' ? null : (isSinHorario(empleado, dia) ? 4 : 1)">
                        <div class="horario-data" 
                             [class.libre-vertical]="isSinHorario(empleado, dia) && tipoReporte !== 'horario'">
                          <span *ngIf="isSinHorario(empleado, dia)" class="sin-horario-wrapper">
                            <span>{{ tipoReporte === 'horario' ? 'SH' : 'SIN HORARIO' }}</span>
                            <button *ngIf="tipoReporte !== 'horario'" class="btn-add-dia"
                                    [ngClass]="hasExcepcion(empleado, dia) ? 'ex-present' : 'ex-empty'"
                                    title="Excepción del día"
                                    (click)="abrirModalExcepcion(empleado, dia)">M</button>
                          </span>
                          <span *ngIf="!isSinHorario(empleado, dia)" class="con-horario-wrapper">
                            <div class="row-horario" *ngIf="tipoReporte !== 'horario'">
                              <div class="col-horario-btn">
                                <button class="btn-ver-marcajes"
                                        title="Ver marcajes del empleado"
                                        (click)="abrirModalMarcajes(empleado, dia)">V</button>
                              </div>
                              <div class="col-horario-badge">
                                <span class="badge-plantilla-horario" 
                                      [style.backgroundColor]="getBloqueHorario(empleado, dia)?.PlantillaHorario?.color || '#ffffff'"
                                      [style.color]="getContrastColorPlantilla(getBloqueHorario(empleado, dia)?.PlantillaHorario?.color)">
                                  {{ getBloqueHorario(empleado, dia)?.PlantillaHorario?.codigo || 'N/A' }}
                                </span>
                              </div>
                              <div class="col-horario-btn">
                                <button class="btn-add-dia mini"
                                        [ngClass]="hasExcepcion(empleado, dia) ? 'ex-present' : 'ex-empty'"
                                        title="Excepción del día"
                                        (click)="abrirModalExcepcion(empleado, dia)">M</button>
                              </div>
                            </div>
                            <span *ngIf="tipoReporte === 'horario'" class="badge-plantilla-horario" 
                                  [style.backgroundColor]="getBloqueHorario(empleado, dia)?.PlantillaHorario?.color || '#ffffff'"
                                  [style.color]="getContrastColorPlantilla(getBloqueHorario(empleado, dia)?.PlantillaHorario?.color)">
                              {{ getBloqueHorario(empleado, dia)?.PlantillaHorario?.codigo || 'N/A' }}
                            </span>
                          </span>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Fila de Marcaje -->
                    <tr *ngIf="tipoReporte !== 'horario'">
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
                    <tr class="fila-calculo" *ngIf="tipoReporte !== 'horario'">
                      <td class="horario-cell">
                        <div class="horario-info">
                          Trabajado
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell calculo-cell" 
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="isSinHorario(empleado, dia) ? 'none' : 'table-cell'">
                        <div class="row calculo-row">
                          <div class="calculo-col-trabajadas" [ngClass]="shouldShowFullWidthTrabajadas(empleado, dia) ? 'col-12' : 'col-6'" [class]="getCalculoClaseTrabajadas(empleado, dia)">
                            {{ getCalculoHorasTrabajadas(empleado, dia) }}
                          </div>
                          <div class="col-6 calculo-col-descansadas" *ngIf="!shouldShowFullWidthTrabajadas(empleado, dia)" [class]="getCalculoClaseDescansadas(empleado, dia)">
                            {{ getCalculoHorasDescansadas(empleado, dia) }}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Fila de Resultado -->
                    <tr *ngIf="tipoReporte !== 'horario'">
                      <td class="horario-cell">
                        <div class="horario-info">
                          Resultado
                        </div>
                      </td>
                      <td *ngFor="let dia of diasDelMes; let i = index" 
                          class="dia-cell" 
                          [class]="getTurnoClass(empleado, dia)"
                          [style.display]="isSinHorario(empleado, dia) ? 'none' : 'table-cell'">
                        <div class="horario-data" [innerHTML]="getResultadoTurno(empleado, dia)"></div>
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
        
        <!-- Modal de Marcajes -->
        <div class="modal-backdrop" *ngIf="showMarcajesModal">
          <div class="modal-card">
            <div class="modal-header">
              <h5>Marcajes del Empleado</h5>
              <button class="btn-close" (click)="cerrarModalMarcajes()">×</button>
            </div>
            <div class="modal-body">
              <div class="mb-2"><strong>Empleado:</strong> {{ modalEmpleado?.nombre }} ({{ modalEmpleado?.cedula }})</div>
              <div class="mb-2"><strong>Fecha de referencia:</strong> {{ modalFechaMarcajes | date:'dd/MM/yyyy' }}</div>
              <div class="mb-2" *ngIf="modalPlantillaInfo">
                <strong>Plantilla de horario:</strong> 
                <span *ngIf="modalPlantillaInfo.PlantillaHorario">
                  {{ modalPlantillaInfo.PlantillaHorario.codigo }} - {{ modalPlantillaInfo.PlantillaHorario.nombre }}
                  <span *ngIf="modalPlantillaInfo.PlantillaHorario.hora_entrada || modalPlantillaInfo.PlantillaHorario.hora_salida">
                    (Entrada: {{ formatearHora(modalPlantillaInfo.PlantillaHorario.hora_entrada) || 'N/A' }} - 
                    Salida: {{ formatearHora(modalPlantillaInfo.PlantillaHorario.hora_salida) || 'N/A' }})
                  </span>
                </span>
                <span *ngIf="!modalPlantillaInfo.PlantillaHorario" class="text-muted">Sin horario asignado</span>
              </div>
              <div class="mb-2" *ngIf="!modalPlantillaInfo">
                <strong>Plantilla de horario:</strong> <span class="text-muted">Sin horario asignado</span>
              </div>
              <div class="mb-3" *ngIf="modalMarcajeCalculado">
                <strong>Marcaje calculado:</strong> 
                <span [innerHTML]="modalMarcajeCalculado"></span>
              </div>
              <div class="mb-3" *ngIf="!modalMarcajeCalculado || modalMarcajeCalculado === 'Sin Registros'">
                <strong>Marcaje calculado:</strong> 
                <span class="text-muted">Sin Registros</span>
              </div>
              <div class="table-responsive">
                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Hora</th>
                      <th>Dispositivo</th>
                      <th>Referencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let marcaje of marcajesModal" [class.marcaje-entrada]="marcaje.esEntrada" [class.marcaje-salida]="marcaje.esSalida">
                      <td>{{ marcaje.fecha | date:'dd/MM/yyyy' }}</td>
                      <td>{{ marcaje.hora }}</td>
                      <td>{{ marcaje.dispositivo || '-' }}</td>
                      <td>{{ marcaje.tipoDia }}</td>
                    </tr>
                    <tr *ngIf="marcajesModal.length === 0">
                      <td colspan="4" style="text-align:center;color:#6c757d;">No hay marcajes disponibles</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" (click)="cerrarModalMarcajes()">Cerrar</button>
            </div>
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

    /* Revert: el scroll vertical vuelve a la página completa */

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
      width: 45px !important;
      min-width: 45px !important;
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

    .empleado-completo-cell {
      vertical-align: top !important;
      height: 100% !important;
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
      min-height: 100%;
      justify-content: flex-start;
      padding: 10px 5px;
    }

    .foto-container {
      flex-shrink: 0;
    }

    .foto-real {
      width: 75px;
      height: 75px;
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
      width: 75px;
      height: 75px;
      background: #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      font-size: 24px;
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
      align-items: center;
      width: 100%;
      justify-content: center;
    }

    .empleado-nombre {
      font-weight: bold;
      color: #333;
      font-size: 14px;
      line-height: 1.2;
      text-align: center;
      width: 100%;
    }

    .empleado-cedula {
      color: #666;
      font-size: 12px;
      line-height: 1.2;
      text-align: center;
      width: 100%;
    }

    .empleado-cargo {
      color: #888;
      font-size: 11px;
      line-height: 1.2;
      text-align: center;
      font-style: italic;
      width: 100%;
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
      width: 45px;
      min-width: 45px;
      height: 45px;
      min-height: 45px;
      text-align: left;
    }

    .horario-col-empty {
      width: 45px;
      min-width: 45px;
      border-right: 2px solid rgba(255, 255, 255, 0.3);
    }

    .horario-info {
      font-size: 10px;
      font-weight: 500;
      color: white !important;
      padding: 4px;
      line-height: 1.2;
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

    /* Quitar padding de las celdas de cálculo */
    .dia-cell.calculo-cell {
      padding: 0 !important;
    }

    .dia-cell.calculo-cell.con-horario {
      padding: 0 !important;
    }

    .dia-cell.calculo-cell.sin-horario {
      padding: 0 !important;
    }

    /* Estilos para la fila de cálculo */
    .calculo-row {
      margin: 0 !important;
      width: 100% !important;
      display: flex !important;
      height: 100% !important;
    }

    .calculo-col-trabajadas,
    .calculo-col-descansadas {
      font-size: 18px !important;
      font-weight: normal !important;
      font-family: 'Arial', sans-serif !important;
      padding: 4px 2px !important;
      text-align: center !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      flex: 0 0 50% !important;
      max-width: 50% !important;
    }

    /* Cuando solo mostramos trabajadas (descanso automático) ocupar todo el ancho */
    .col-12.calculo-col-trabajadas {
      flex: 0 0 100% !important;
      max-width: 100% !important;
    }

    /* Estilos para fondos de cálculo - verde y rojo claritos */
    .col-6.calculo-col-trabajadas.bg-calculo-success,
    .col-12.calculo-col-trabajadas.bg-calculo-success,
    .calculo-col-trabajadas.bg-calculo-success {
      background-color: #D4F5D4 !important; /* Verde súper clarito */
      color: #000000 !important; /* Texto negro */
    }

    .col-6.calculo-col-trabajadas.bg-calculo-danger,
    .col-12.calculo-col-trabajadas.bg-calculo-danger,
    .calculo-col-trabajadas.bg-calculo-danger {
      background-color: #FFE0E5 !important; /* Rojo súper clarito */
      color: #000000 !important; /* Texto negro */
    }

    .col-6.calculo-col-descansadas.bg-calculo-success {
      background-color: #D4F5D4 !important; /* Verde súper clarito */
      color: #000000 !important; /* Texto negro */
    }

    .col-6.calculo-col-descansadas.bg-calculo-danger {
      background-color: #FFE0E5 !important; /* Rojo súper clarito */
      color: #000000 !important; /* Texto negro */
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
      font-size: 24px;
      font-weight: 500;
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

    .grupo-header-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    .grupo-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .filtros-activos {
      font-size: 12px;
      font-weight: 400;
      opacity: 0.9;
      line-height: 1.4;
    }

    .empleados-count {
      background: rgba(255, 255, 255, 0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
    }

    .grupo-actions { display: flex; align-items: center; gap: 10px; }
    .btn-print-group {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.4);
      border-radius: 20px;
      padding: 6px 12px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 100px;
      justify-content: center;
    }
    .btn-print-group:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-1px);
    }
    .btn-print-group:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .btn-print-group.loading {
      opacity: 0.8;
    }
    .spinner-small {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin-small 0.6s linear infinite;
    }
    @keyframes spin-small {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    

    /* Reglas de impresión: solo imprimir el grupo-card específico */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      /* Ocultar navbars y encabezados superiores de toda la app */
      app-navbar, .navbar, header, .topbar, .toolbar, .page-header, .layout-navbar, .site-header {
        display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important;
      }
      /* Ocultar cualquier control de la app no relevante */
      .no-print, .btn, .button, .actions, .grupo-actions, .btn-print-group { display: none !important; }
      /* Mostrar únicamente el grupo-card marcado para imprimir */
      body * { visibility: hidden !important; }
      .grupo-card.print-this, .grupo-card.print-this * { visibility: visible !important; }
      .grupo-card.print-this { 
        position: static !important; 
        left: auto !important; 
        top: auto !important; 
        width: 100% !important;
        page-break-inside: avoid;
        margin: 0 !important;
        padding: 10px !important;
      }
      /* Ocultar otros grupo-cards si existen */
      .grupo-card:not(.print-this) { display: none !important; }
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

    /* Row con 3 columnas: V | Badge | M */
    .con-horario-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 40px;
      width: 100%;
    }
    .row-horario {
      display: flex;
      align-items: center;
      justify-content: space-evenly;
      width: 100%;
      gap: 4px;
    }
    .col-horario-btn {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .col-horario-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 0;
    }
    .badge-plantilla-horario {
      display: inline-block;
      text-align: center;
    }
    .btn-ver-marcajes {
      background: #6c757d; /* gris por defecto */
      color: #fff; /* texto blanco */
      border: none;
      padding: 0 6px;
      border-radius: 4px;
      font-weight: 700;
      cursor: pointer;
      font-size: 12px;
      line-height: 1.2;
      min-width: 20px;
      text-align: center;
    }
    .btn-ver-marcajes:hover {
      background: #5a6268;
    }
    .col-horario-btn .btn-add-dia {
      padding: 0 6px;
      font-size: 12px;
      min-width: 20px;
      text-align: center;
    }

    /* Estilos para marcajes de entrada y salida */
    .marcaje-entrada {
      color: #0066cc !important;
    }
    .marcaje-entrada td {
      color: #0066cc !important;
    }
    .marcaje-salida {
      color: #0066cc !important;
    }
    .marcaje-salida td {
      color: #0066cc !important;
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

    /* Estilos para la sección de resumen */
    .resumen-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e0e0e0;
      margin-bottom: 20px;
      padding: 20px;
    }

    .resumen-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      border-radius: 8px 8px 0 0;
      margin: -20px -20px 20px -20px;
    }

    .resumen-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .resumen-content {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .resumen-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .resumen-label {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .resumen-value {
      font-weight: 700;
      color: #667eea;
      font-size: 16px;
    }

    /* Estilos para la tabla de resumen */
    .resumen-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .resumen-table thead th {
      background: #38B04A;
      color: white;
      padding: 12px 15px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      border: 1px solid #2a8a3a;
    }

    .resumen-table tbody td {
      padding: 12px 15px;
      text-align: center;
      border: 1px solid #e0e0e0;
      font-size: 14px;
    }

    .resumen-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .resumen-table tbody tr:hover {
      background-color: #e9ecef;
    }

    .resumen-metric-col {
      min-width: 150px;
      white-space: normal;
      word-wrap: break-word;
    }

    .resumen-value-cell {
      font-weight: 600;
      color: #333;
    }

    .resumen-table .empleado-completo-cell {
      text-align: left;
      font-weight: 600;
      background-color: #f0f0f0;
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
  // Tipo de reporte (global por defecto)
  tipoReporte: 'global' | 'horario' | 'resumen' = 'global';
  // Feriados para el cálculo de resumen
  feriados: any[] = [];
  // Plantillas libres (sin hora_entrada ni hora_salida) para el cálculo de resumen
  plantillasLibres: any[] = [];
  // Estado de descarga de imagen
  descargandoImagen: boolean = false;
  grupoDescargando: string | null = null;
  
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
  // Modal marcajes
  showMarcajesModal = false;
  modalFechaMarcajes: Date = new Date();
  marcajesModal: any[] = [];
  modalPlantillaInfo: any = null;
  modalMarcajeCalculado: string = '';
  // Evitar que el select dispare onChange al abrir el modal (por el valor inicial)
  suppressPlantillaChange = false;
  // Guardar la plantilla actual de la excepción (si la hay) para evitar guardar si no cambió
  plantillaExcepcionActualId: number | null = null;
  
  // edición de excepción
  isEditExcepcion = false;
  excepcionId: number | null = null;
  
  // Caché de plantillas por sala para optimizar el modal de excepciones
  plantillasPorSalaCache: Map<number, any[]> = new Map();
  todasLasPlantillasCache: any[] | null = null;
  cargandoPlantillas: boolean = false;
  
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
    private plantillasService: PlantillasHorariosService,
    private feriadosService: FeriadosService,
    private sanitizer: DomSanitizer
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

  onTipoReporteChange(tipo: 'global' | 'horario' | 'resumen') {
    this.tipoReporte = tipo;
    
    // Asegurar que los datos estén actualizados y consistentes al cambiar de vista
    if (this.hasSearched) {
      // Si tenemos datos completos cargados, aplicar filtros locales para refrescar la vista
      if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
        // Regenerar días del mes y meses agrupados para asegurar que estén actualizados
        if (this.fechaDesde && this.fechaHasta) {
          this.generarDiasDelMes();
          this.generarMesesAgrupados();
        }
        // Aplicar filtros locales para refrescar la vista con los datos actuales
        this.aplicarFiltrosLocales();
      } else if (this.empleados.length > 0) {
        // Si no hay datos completos pero hay empleados cargados, regenerar días y reagrupar
        if (this.fechaDesde && this.fechaHasta) {
          this.generarDiasDelMes();
          this.generarMesesAgrupados();
        }
        this.agruparEmpleados();
      }
    }
  }

  getNombreTipoReporte(): string {
    switch (this.tipoReporte) {
      case 'global':
        return 'Marcajes';
      case 'horario':
        return 'Horarios';
      case 'resumen':
        return 'Calculos';
      default:
        return 'Marcajes';
    }
  }

  getFiltrosActivosTexto(): string {
    const filtros: string[] = [];
    
    // Sala
    if (this.selectedSalaForDataLoad) {
      const sala = this.userSalas.find(s => s.id === this.selectedSalaForDataLoad);
      if (sala) {
        filtros.push(sala.nombre);
      }
    }
    
    // Departamento
    if (this.selectedDepartamentoId) {
      const depto = this.departamentosFiltrados.find(d => d.id === this.selectedDepartamentoId);
      if (depto) {
        filtros.push(depto.nombre);
      }
    }
    
    // Área
    if (this.selectedAreaId) {
      const area = this.areasFiltradas.find(a => a.id === this.selectedAreaId);
      if (area) {
        filtros.push(area.nombre);
      }
    }
    
    // Cargo
    if (this.selectedCargoId) {
      const cargo = this.cargosFiltrados.find(c => c.id === this.selectedCargoId);
      if (cargo) {
        filtros.push(cargo.nombre);
      }
    }
    
    // Sexo
    if (this.selectedSexo) {
      filtros.push(this.selectedSexo);
    }
    
    // Búsqueda (nombre o cédula)
    if (this.searchText && this.searchText.trim()) {
      filtros.push(this.searchText.trim());
    }
    
    // Fechas
    if (this.fechaDesde) {
      filtros.push(`Desde: ${this.fechaDesde}`);
    }
    if (this.fechaHasta) {
      filtros.push(`Hasta: ${this.fechaHasta}`);
    }
    
    return filtros.length > 0 ? filtros.join(' - ') : '';
  }

  printGrupo(grupo: any): void {
    // Buscar el elemento grupo-card específico usando el índice del grupo
    const grupoIndex = this.grupos.findIndex(g => g.nombre === grupo.nombre);
    if (grupoIndex === -1) {
      return;
    }
    
    const targetElement = document.querySelector(`.grupo-card[data-grupo-index="${grupoIndex}"]`) as HTMLElement;
    
    if (!targetElement) {
      return;
    }
    
    // Asegurar que TypeScript reconozca el tipo
    const elementToPrint: HTMLElement = targetElement;
    
    // Obtener todos los grupo-cards
    const grupoCards = document.querySelectorAll('.grupo-card');
    
    // Marcar el elemento para impresión
    elementToPrint.classList.add('print-this');
    
    // Ocultar otros grupo-cards temporalmente
    grupoCards.forEach((card: Element) => {
      const cardEl = card as HTMLElement;
      if (cardEl !== elementToPrint) {
        cardEl.style.display = 'none';
      }
    });
    
    // Esperar un momento para que el DOM se actualice, luego abrir diálogo de impresión
    setTimeout(() => {
      window.print();
      
      // Limpiar después de la impresión (cuando se cierra el diálogo)
      setTimeout(() => {
        elementToPrint.classList.remove('print-this');
        // Restaurar visibilidad de otros grupo-cards
        grupoCards.forEach((card: Element) => {
          const cardEl = card as HTMLElement;
          cardEl.style.display = '';
        });
      }, 500);
    }, 100);
  }

  async descargarImagenGrupo(grupo: any): Promise<void> {
    // Prevenir múltiples descargas simultáneas
    if (this.descargandoImagen) {
      return;
    }
    
    // Buscar el elemento grupo-card específico usando el índice del grupo
    const grupoIndex = this.grupos.findIndex(g => g.nombre === grupo.nombre);
    if (grupoIndex === -1) {
      return;
    }
    
    const targetElement = document.querySelector(`.grupo-card[data-grupo-index="${grupoIndex}"]`) as HTMLElement;
    
    if (!targetElement) {
      return;
    }
    
    // Marcar como descargando
    this.descargandoImagen = true;
    this.grupoDescargando = grupo.nombre;
    
    try {
      // Importar html2canvas dinámicamente en segundo plano
      const html2canvasPromise = import('html2canvas');
      
      // Obtener todos los grupo-cards
      const grupoCards = document.querySelectorAll('.grupo-card');
      
      // Ocultar otros grupo-cards temporalmente
      grupoCards.forEach((card: Element) => {
        const cardEl = card as HTMLElement;
        if (cardEl !== targetElement) {
          cardEl.style.display = 'none';
        }
      });
      
      // Esperar un momento para que el DOM se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Guardar estilos originales de contenedores con scroll
      const tableContainers = targetElement.querySelectorAll('.grupo-table-container, .table-wrapper');
      const originalStyles: { element: HTMLElement, overflow: string, overflowX: string, overflowY: string }[] = [];
      
      tableContainers.forEach((container: Element) => {
        const el = container as HTMLElement;
        originalStyles.push({
          element: el,
          overflow: el.style.overflow || '',
          overflowX: el.style.overflowX || '',
          overflowY: el.style.overflowY || ''
        });
        // Temporalmente quitar overflow para que todo sea visible
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';
        el.style.overflowY = 'visible';
      });
      
      // Esperar un momento para que los cambios de estilo se apliquen
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Generar canvas con html2canvas (esto se ejecuta en segundo plano)
      const html2canvas = (await html2canvasPromise).default;
      
      // Obtener el ancho y alto completo del contenido (incluyendo scroll)
      // Buscar la tabla dentro del grupo-card para obtener su ancho real
      const table = targetElement.querySelector('.horario-table') as HTMLElement;
      const fullWidth = table ? Math.max(
        table.scrollWidth,
        table.offsetWidth,
        targetElement.scrollWidth,
        targetElement.offsetWidth
      ) : targetElement.scrollWidth;
      
      const fullHeight = Math.max(
        targetElement.scrollHeight,
        targetElement.offsetHeight,
        targetElement.clientHeight
      );
      
      const canvas = await html2canvas(targetElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: fullWidth,
        height: fullHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        allowTaint: false
      });
      
      // Restaurar estilos originales
      originalStyles.forEach(({ element, overflow, overflowX, overflowY }) => {
        element.style.overflow = overflow;
        element.style.overflowX = overflowX;
        element.style.overflowY = overflowY;
      });
      
      // Convertir canvas a imagen y descargar
      const imageUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `Reporte_${this.getNombreTipoReporte()}_${grupo.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Restaurar visibilidad de otros grupo-cards
      grupoCards.forEach((card: Element) => {
        const cardEl = card as HTMLElement;
        cardEl.style.display = '';
      });
      
    } catch (error) {
      // Restaurar visibilidad en caso de error
      const grupoCards = document.querySelectorAll('.grupo-card');
      grupoCards.forEach((card: Element) => {
        const cardEl = card as HTMLElement;
        cardEl.style.display = '';
      });
    } finally {
      // Restaurar estado
      this.descargandoImagen = false;
      this.grupoDescargando = null;
    }
  }

  abrirModalExcepcion(empleado: any, dia: Date) {
    // Optimización: Calcular fecha una sola vez
    const fechaStr = dia instanceof Date ? dia.toISOString().split('T')[0] : dia;
    
    // Optimización: Preparar datos antes de cambiar estado
    const key = `${empleado?.id}|${fechaStr}`;
    const ex = this.excepcionesMap.get(key);
    
    // Configurar estado de una vez
    this.suppressPlantillaChange = true;
    this.modalEmpleado = empleado;
    this.modalFecha = fechaStr;
    this.modalPlantillas = []; // Inicializar vacío, se llenará después
    
    // Prefill si ya existe una excepción
    if (ex) {
      this.isEditExcepcion = true;
      this.excepcionId = ex.id;
      this.selectedPlantillaId = ex.plantilla_horario_id || ex.PlantillaHorario?.id || null;
      this.plantillaExcepcionActualId = this.selectedPlantillaId;
    } else {
      this.selectedPlantillaId = null;
      this.plantillaExcepcionActualId = null;
      this.isEditExcepcion = false;
      this.excepcionId = null;
    }
    
    // Mostrar el modal INMEDIATAMENTE (no esperar a cargar plantillas)
    this.showExcepcionModal = true;
    
    // Usar requestAnimationFrame para liberar supresión después del render
    requestAnimationFrame(() => {
      this.suppressPlantillaChange = false;
    });
    
    // Cargar plantillas en segundo plano (usando caché si está disponible)
    // Usar setTimeout con delay 0 para no bloquear el render
    setTimeout(() => {
      this.cargarPlantillasParaModal(empleado);
    }, 0);
  }

  // Función optimizada para cargar plantillas usando caché
  cargarPlantillasParaModal(empleado: any) {
    // Optimización: Obtener sala_id de forma más eficiente
    const cargo = empleado?.Cargo;
    const area = cargo?.Area;
    const departamento = area?.Departamento;
    const salaId = departamento?.Sala?.id || departamento?.sala_id;
    
    // Si tenemos plantillas en caché para esta sala, usarlas inmediatamente
    if (salaId && this.plantillasPorSalaCache.has(salaId)) {
      const plantillasCache = this.plantillasPorSalaCache.get(salaId)!;
      if (plantillasCache.length > 0) {
        // Usar asignación directa en lugar de spread para mejor rendimiento
        this.modalPlantillas = plantillasCache;
        return;
      }
    }
    
    // Si tenemos todas las plantillas en caché y no hay sala específica, usarlas
    if (!salaId && this.todasLasPlantillasCache) {
      this.modalPlantillas = this.todasLasPlantillasCache;
      return;
    }
    
    // Si no hay caché, cargar desde el servidor
    if (salaId) {
      this.plantillasService.getBySala(salaId).subscribe({
        next: (list: any[]) => {
          const plantillas = Array.isArray(list) ? list : [];
          // Guardar en caché
          this.plantillasPorSalaCache.set(salaId, plantillas);
          
          if (plantillas.length > 0) {
            this.modalPlantillas = plantillas;
          } else {
            // Si no hay plantillas por sala, usar todas las plantillas (con caché)
            this.cargarTodasLasPlantillasParaModal();
          }
        },
        error: () => {
          // En caso de error, intentar cargar todas las plantillas
          this.cargarTodasLasPlantillasParaModal();
        }
      });
    } else {
      this.cargarTodasLasPlantillasParaModal();
    }
  }

  // Función auxiliar para cargar todas las plantillas (con caché)
  cargarTodasLasPlantillasParaModal() {
    // Si ya están en caché, usarlas
    if (this.todasLasPlantillasCache) {
      this.modalPlantillas = this.todasLasPlantillasCache;
      return;
    }
    
    // Si no, cargar desde el servidor
    this.plantillasService.getPlantillasHorarios().subscribe({
      next: (todas: any[]) => {
        const plantillas = Array.isArray(todas) ? todas : [];
        // Guardar en caché
        this.todasLasPlantillasCache = plantillas;
        this.modalPlantillas = plantillas;
      },
      error: () => {
        this.modalPlantillas = [];
      }
    });
  }

  cerrarModalExcepcion() {
    if (this.savingExcepcion) return;
    
    const empleadoIdAnterior = this.modalEmpleado?.id;
    this.showExcepcionModal = false;
    this.modalEmpleado = null;
    this.modalFecha = '';
    this.modalPlantillas = [];
    this.selectedPlantillaId = null;
    this.plantillaExcepcionActualId = null;
    this.isEditExcepcion = false;
    this.excepcionId = null;
    
    // Si se cerró el modal después de hacer cambios, refrescar los datos del empleado afectado
    // para asegurar que la vista principal muestre los datos actualizados
    if (empleadoIdAnterior && this.hasSearched) {
      if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
        // Recargar datos del empleado para asegurar consistencia
        this.recargarDatosEmpleado(empleadoIdAnterior);
      } else if (this.empleados.length > 0) {
        // Si no hay datos completos, al menos regenerar días y reagrupar
        if (this.fechaDesde && this.fechaHasta) {
          this.generarDiasDelMes();
          this.generarMesesAgrupados();
        }
        this.agruparEmpleados();
      }
    }
  }

  abrirModalMarcajes(empleado: any, dia: Date) {
    this.modalEmpleado = empleado;
    this.modalFechaMarcajes = new Date(dia);
    this.marcajesModal = [];
    this.modalPlantillaInfo = null;
    this.modalMarcajeCalculado = '';
    this.showMarcajesModal = true;

    // Obtener la plantilla de horario para este día
    const bloque = this.getBloqueHorario(empleado, dia);
    if (bloque) {
      this.modalPlantillaInfo = bloque;
    }

    // Obtener el marcaje calculado para este día (lo que se muestra en la columna "Marcaje")
    const marcajeInfo = this.getHorarioInfo(empleado, dia, 'Descanso');
    if (marcajeInfo && marcajeInfo !== 'Sin Registros') {
      this.modalMarcajeCalculado = marcajeInfo;
    } else {
      this.modalMarcajeCalculado = 'Sin Registros';
    }

    // Calcular fechas: día anterior, día actual, día siguiente
    const diaAnterior = new Date(dia);
    diaAnterior.setDate(diaAnterior.getDate() - 1);
    diaAnterior.setHours(0, 0, 0, 0);
    
    const diaSiguiente = new Date(dia);
    diaSiguiente.setDate(diaSiguiente.getDate() + 1);
    diaSiguiente.setHours(23, 59, 59, 999);

    // Formatear fechas para la consulta (formato ISO compatible)
    const fechaInicio = diaAnterior.toISOString();
    const fechaFin = diaSiguiente.toISOString();

    // Obtener marcajes del empleado para el rango de fechas
    this.marcajesService.getMarcajes({
      employee_no: empleado.cedula,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin
    }).subscribe({
      next: (response) => {
        const marcajes = response.attlogs || [];
        
        // Fecha de referencia para comparar
        const fechaRef = new Date(dia);
        fechaRef.setHours(0, 0, 0, 0);
        const fechaRefStr = fechaRef.toISOString().split('T')[0];
        
        // Obtener el bloque de horario para calcular qué marcajes se usaron como entrada y salida
        const bloque = this.getBloqueHorario(empleado, dia);
        let horaEntradaCalculada = '';
        let horaSalidaCalculada = '';
        let marcajeEntradaId: number | null = null;
        let marcajeSalidaId: number | null = null;
        
        if (bloque) {
          // Calcular los marcajes del día para obtener qué marcajes se asignaron como entrada y salida
          const marcajesCalculados = this.calcularMarcajesDelDia(empleado, dia, bloque);
          horaEntradaCalculada = marcajesCalculados.entrada;
          horaSalidaCalculada = marcajesCalculados.salida;
          
          // Buscar los marcajes reales que coinciden con las horas calculadas
          // Comparar por hora (HH:MM) sin importar el día
          marcajes.forEach((m: any) => {
            const fechaHora = new Date(m.event_time);
            const horaMarcaje = fechaHora.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
            
            if (horaEntradaCalculada && horaEntradaCalculada !== 'Sin marcaje' && 
                horaMarcaje === horaEntradaCalculada && !marcajeEntradaId) {
              marcajeEntradaId = m.id;
            }
            if (horaSalidaCalculada && horaSalidaCalculada !== 'Sin marcaje' && 
                horaSalidaCalculada !== 'SNM' && horaSalidaCalculada !== 'SDNM' &&
                horaMarcaje === horaSalidaCalculada && !marcajeSalidaId) {
              marcajeSalidaId = m.id;
            }
          });
        }
        
        // Formatear marcajes para el modal
        this.marcajesModal = marcajes.map((m: any) => {
          const fechaHora = new Date(m.event_time);
          const fechaMarcaje = new Date(fechaHora);
          fechaMarcaje.setHours(0, 0, 0, 0);
          const fechaMarcajeStr = fechaMarcaje.toISOString().split('T')[0];
          
          // Determinar el tipo de día
          let tipoDia = '';
          let esEntrada = false;
          let esSalida = false;
          
          if (fechaMarcajeStr < fechaRefStr) {
            tipoDia = 'Día anterior';
          } else if (fechaMarcajeStr > fechaRefStr) {
            tipoDia = 'Día después';
          } else {
            tipoDia = 'Mismo día';
          }
          
          // Verificar si este marcaje fue usado como entrada o salida
          // Mantener el tipo de día correcto (Mismo día o Día después) y agregar (Entrada) o (Salida)
          if (m.id === marcajeEntradaId) {
            tipoDia += ' (Entrada)';
            esEntrada = true;
          } else if (m.id === marcajeSalidaId) {
            tipoDia += ' (Salida)';
            esSalida = true;
          }
          
          return {
            fecha: fechaHora,
            hora: fechaHora.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
            dispositivo: m.Dispositivo?.nombre || '-',
            tipoDia: tipoDia,
            esEntrada: esEntrada,
            esSalida: esSalida,
            id: m.id
          };
        });

        // Ordenar por fecha (más antiguo primero)
        this.marcajesModal.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
      },
      error: (error) => {
        console.error('Error al cargar marcajes:', error);
        this.marcajesModal = [];
      }
    });
  }

  cerrarModalMarcajes() {
    this.showMarcajesModal = false;
    this.modalEmpleado = null;
    this.modalFechaMarcajes = new Date();
    this.marcajesModal = [];
    this.modalPlantillaInfo = null;
    this.modalMarcajeCalculado = '';
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
          
          // Si tenemos datos completos cargados, recargar los datos del empleado afectado
          if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0 && this.modalEmpleado?.id) {
            this.recargarDatosEmpleado(this.modalEmpleado.id);
          } else {
            // Si no, solo refrescar agrupación
            this.agruparEmpleados();
          }
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
          
          // Si tenemos datos completos cargados, recargar los datos del empleado afectado
          if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0 && this.modalEmpleado?.id) {
            this.recargarDatosEmpleado(this.modalEmpleado.id);
          } else {
            // Si no, solo refrescar agrupación
            this.agruparEmpleados();
          }
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
                  
                  // Si tenemos datos completos cargados, recargar los datos del empleado afectado
                  if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0 && this.modalEmpleado?.id) {
                    this.recargarDatosEmpleado(this.modalEmpleado.id);
                  } else {
                    // Si no, solo refrescar agrupación
                    this.agruparEmpleados();
                  }
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
    // Permitir eliminar si hay una excepción existente, sin importar si hay horario repetitivo
    // Solo verificar que estemos en modo edición y tengamos los datos necesarios
    if (!this.isEditExcepcion || !this.modalEmpleado || !this.modalFecha) {
      return false;
    }
    // Si hay una excepción (isEditExcepcion es true), permitir eliminarla
    return true;
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
        
        // Si el modal del empleado está abierto para el mismo empleado, actualizar la lista de excepciones
        if (this.mostrarModal && this.empleadoSeleccionado?.id === this.modalEmpleado?.id) {
          this.cargarExcepcionesEmpleado();
        }
        
        // Si tenemos datos completos cargados, recargar los datos del empleado afectado
        if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0 && this.modalEmpleado?.id) {
          this.recargarDatosEmpleado(this.modalEmpleado.id);
        } else {
          // Si no, solo refrescar agrupación
          this.agruparEmpleados();
        }
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
      // Limpiar caché de plantillas
      this.plantillasPorSalaCache.clear();
      this.todasLasPlantillasCache = null;
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
    
    // Precargar plantillas para esta sala en segundo plano (para optimizar el modal)
    this.precargarPlantillasPorSala(salaId);
    
    // Cargar todos los datos de la sala
    this.cargarDatosCompletosPorSala(salaId);
  }

  // Precargar plantillas por sala en segundo plano para optimizar el modal
  precargarPlantillasPorSala(salaId: number) {
    // Solo precargar si no están en caché
    if (!this.plantillasPorSalaCache.has(salaId)) {
      this.plantillasService.getBySala(salaId).subscribe({
        next: (list: any[]) => {
          const plantillas = Array.isArray(list) ? list : [];
          this.plantillasPorSalaCache.set(salaId, plantillas);
        },
        error: () => {
          // En caso de error, no hacer nada (se cargará cuando se necesite)
        }
      });
    }
  }

  // Cargar todos los datos (horarios y excepciones) sin filtros de fecha
  cargarDatosCompletosPorSala(salaId: number) {
    if (!salaId) {
      this.loading = false;
      return;
    }
    
    // Optimización: Obtener SOLO los empleados de esa sala (no todos)
    this.empleadosService.getEmpleadosBySala(salaId).subscribe({
      next: (response) => {
        // Los empleados ya vienen filtrados por sala desde el servidor
        this.empleadosCompletos = response || [];
        
        // Si no hay empleados, mostrar mensaje y terminar
        if (this.empleadosCompletos.length === 0) {
          this.loading = false;
          this.hasSearched = true;
          this.grupos = [];
          return;
        }
        
        // Cargar horarios para todos los empleados de esta sala
        this.cargarHorariosCompletos().then(() => {
          // Cargar todas las excepciones sin filtros de fecha (solo de empleados de esta sala)
          this.cargarExcepcionesCompletas().then(() => {
            // Cargar feriados y plantillas libres para el cálculo de resumen (solo de esta sala)
            Promise.all([
              this.cargarFeriados(),
              this.cargarPlantillasLibres(salaId)
            ]).then(() => {
              // Calcular fechas mínima y máxima para cargar todos los marcajes
              this.calcularFechasLimiteCompletas().then(() => {
                // Cargar todos los marcajes para el rango completo (solo de empleados de esta sala)
                this.cargarMarcajesCompletos().then(() => {
                  // Aplicar filtros locales iniciales para mostrar los datos
                  this.aplicarFiltrosLocales();
                });
              });
            });
          });
        });
      },
      error: (error) => {
        this.loading = false;
        this.hasSearched = true;
        this.empleadosCompletos = [];
        this.grupos = [];
        // Si falla getEmpleadosBySala, intentar con getEmpleados como fallback
        this.empleadosService.getEmpleados().subscribe({
          next: (response) => {
            const todosEmpleados = response || [];
            // Filtrar empleados por sala en el cliente como fallback
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
            
            if (this.empleadosCompletos.length > 0) {
              // Continuar con la carga normal
              this.cargarHorariosCompletos().then(() => {
                this.cargarExcepcionesCompletas().then(() => {
                  Promise.all([
                    this.cargarFeriados(),
                    this.cargarPlantillasLibres(salaId)
                  ]).then(() => {
                    this.calcularFechasLimiteCompletas().then(() => {
                      this.cargarMarcajesCompletos().then(() => {
                        this.aplicarFiltrosLocales();
                      });
                    });
                  });
                });
              });
            } else {
              this.loading = false;
              this.hasSearched = true;
              this.grupos = [];
            }
          },
          error: (err) => {
            this.loading = false;
            this.hasSearched = true;
            this.empleadosCompletos = [];
            this.grupos = [];
          }
        });
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
    
    const base = this.obtenerBaseEmpleados();
    
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
            if (!marcaje.event_time) return false;
            const fechaMarcaje = new Date(marcaje.event_time).toISOString().split('T')[0];
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
    
    const base = this.obtenerBaseEmpleados();
    
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
    const base = this.obtenerBaseEmpleados();
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

  // Función auxiliar para ordenar empleados: Departamento > Área > Cargo > Nombre
  ordenarEmpleados(empleados: any[]): any[] {
    return empleados.sort((a, b) => {
      // 1. Ordenar por Departamento
      const deptA = a.Cargo?.Area?.Departamento?.nombre || '';
      const deptB = b.Cargo?.Area?.Departamento?.nombre || '';
      if (deptA !== deptB) {
        return deptA.localeCompare(deptB, 'es', { sensitivity: 'base' });
      }
      
      // 2. Ordenar por Área
      const areaA = a.Cargo?.Area?.nombre || '';
      const areaB = b.Cargo?.Area?.nombre || '';
      if (areaA !== areaB) {
        return areaA.localeCompare(areaB, 'es', { sensitivity: 'base' });
      }
      
      // 3. Ordenar por Cargo
      const cargoA = a.Cargo?.nombre || '';
      const cargoB = b.Cargo?.nombre || '';
      if (cargoA !== cargoB) {
        return cargoA.localeCompare(cargoB, 'es', { sensitivity: 'base' });
      }
      
      // 4. Ordenar por Nombre de empleado
      const nombreA = a.nombre || '';
      const nombreB = b.nombre || '';
      return nombreA.localeCompare(nombreB, 'es', { sensitivity: 'base' });
    });
  }

  agruparPorSalas() {
    const gruposMap = new Map<number, { nombre: string; empleados: any[] }>();
    const base = this.obtenerBaseEmpleados();

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

      // Ordenar empleados dentro del grupo
      const grupo = gruposMap.get(salaKey);
      if (grupo) {
        grupo.empleados = this.ordenarEmpleados(grupo.empleados);
      }

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

    // Ordenar empleados dentro de cada grupo
    gruposMap.forEach((grupo, key) => {
      grupo.empleados = this.ordenarEmpleados(grupo.empleados);
    });

    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorAreas() {
    const gruposMap = new Map();
    
    const base = this.obtenerBaseEmpleados();
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
    
    // Ordenar empleados dentro de cada grupo
    gruposMap.forEach((grupo, key) => {
      grupo.empleados = this.ordenarEmpleados(grupo.empleados);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorDepartamentos() {
    const gruposMap = new Map();
    
    const base = this.obtenerBaseEmpleados();
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
    
    // Ordenar empleados dentro de cada grupo
    gruposMap.forEach((grupo, key) => {
      grupo.empleados = this.ordenarEmpleados(grupo.empleados);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  agruparPorCargos() {
    const gruposMap = new Map();
    
    const base = this.obtenerBaseEmpleados();
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
    
    // Ordenar empleados dentro de cada grupo
    gruposMap.forEach((grupo, key) => {
      grupo.empleados = this.ordenarEmpleados(grupo.empleados);
    });
    
    this.grupos = Array.from(gruposMap.values());
  }

  tieneFiltrosAplicados(): boolean {
    // Verificar si hay algún filtro aplicado (excepto la sala por defecto si no hay otros filtros)
    return !!(
      this.selectedDepartamentoId ||
      this.selectedAreaId ||
      this.selectedCargoId ||
      this.selectedSexo ||
      (this.searchText && this.searchText.trim().length > 0)
    );
  }

  obtenerBaseEmpleados(): any[] {
    // Si hay filtros aplicados, usar siempre empleadosFiltrados (incluso si está vacío)
    // Si no hay filtros, usar empleadosFiltrados si tiene datos, sino empleados
    if (this.tieneFiltrosAplicados()) {
      return this.empleadosFiltrados || [];
    }
    return (this.empleadosFiltrados && this.empleadosFiltrados.length > 0) ? this.empleadosFiltrados : this.empleados;
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
      // Turno diurno: marcajes del mismo día + día siguiente (por si hay horas extras que terminan en madrugada)
      const marcajesHoy = this.getMarcajesDelDia(empleado, dia);
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const marcajesManana = this.getMarcajesDelDia(empleado, diaSiguiente);
      marcajesParaAnalizar = [...marcajesHoy, ...marcajesManana].sort((a, b) => 
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      );
    }

    if (marcajesParaAnalizar.length === 0) {
      return { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
    }

    // Crear objeto bloque con horas de plantilla para usar en asignación inteligente
    const tieneDescansoAutomatico = !!plantilla.descanso_automatico;
    const bloqueConPlantilla = {
      hora_entrada: plantilla.hora_entrada,
      hora_salida: plantilla.hora_salida,
      hora_entrada_descanso: plantilla.hora_descanso_entrada || '',
      hora_salida_descanso: plantilla.hora_descanso_salida || '',
      tiene_descanso: tieneDescanso,
      tiene_descanso_automatico: tieneDescansoAutomatico,
      descanso_automatico: plantilla.descanso_automatico || '',
      turno: esTurnoNocturno ? 'NOCTURNO' : 'DIURNO'
    };

    // Analizar marcajes usando la lógica inteligente, pasando el día para identificar marcajes del día siguiente
    const marcajesAnalizados = this.analizarMarcajesInteligente(marcajesParaAnalizar, bloqueConPlantilla, bloqueConPlantilla.turno, dia);

    // Aplicar validaciones de diferencias de tiempo
    const marcajesConValidacion = this.validarDiferenciasTiempo(marcajesAnalizados, bloqueConPlantilla);
    
    // VALIDACIÓN ESPECIAL: Si la entrada del día actual coincide con la salida del día anterior (turno nocturno),
    // ignorar esa entrada porque es la salida del día anterior, no una entrada válida
    const marcajesConValidacionNocturna = this.validarEntradaVsSalidaAnterior(empleado, dia, marcajesConValidacion, bloque);
    
    return marcajesConValidacionNocturna;
  }

  // Validar que la entrada del día actual no sea igual a la salida del día anterior (turno nocturno)
  validarEntradaVsSalidaAnterior(empleado: any, dia: Date, marcajesActuales: { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string }, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    // Si no hay entrada marcada, no hay nada que validar
    if (!marcajesActuales.entrada || marcajesActuales.entrada === 'Sin marcaje') {
      return marcajesActuales;
    }

    // Obtener el día anterior
    const diaAnterior = new Date(dia);
    diaAnterior.setDate(diaAnterior.getDate() - 1);

    // Obtener el bloque horario del día anterior
    const bloqueAnterior = this.getBloqueHorario(empleado, diaAnterior);
    
    // Si no hay bloque anterior, no hay nada que validar
    if (!bloqueAnterior) {
      return marcajesActuales;
    }

    // Verificar si el turno anterior era nocturno (primero verificar esto para evitar procesar si no es necesario)
    const plantillaAnterior = bloqueAnterior?.PlantillaHorario;
    if (!plantillaAnterior || !plantillaAnterior.hora_entrada || !plantillaAnterior.hora_salida) {
      return marcajesActuales;
    }

    const horaEntradaAnterior = this.convertirHoraAMinutos(plantillaAnterior.hora_entrada);
    const horaSalidaAnterior = this.convertirHoraAMinutos(plantillaAnterior.hora_salida);
    const esTurnoAnteriorNocturno = horaEntradaAnterior > horaSalidaAnterior;

    // Verificar si el turno actual es nocturno
    const plantillaActual = bloque?.PlantillaHorario;
    let esTurnoActualNocturno = false;
    if (plantillaActual && plantillaActual.hora_entrada && plantillaActual.hora_salida) {
      const horaEntradaActual = this.convertirHoraAMinutos(plantillaActual.hora_entrada);
      const horaSalidaActual = this.convertirHoraAMinutos(plantillaActual.hora_salida);
      esTurnoActualNocturno = horaEntradaActual > horaSalidaActual;
    }

    // Validar si el turno anterior era nocturno O si el turno actual es nocturno
    // (en ambos casos, la entrada no puede ser igual a la salida del día anterior)
    if (!esTurnoAnteriorNocturno && !esTurnoActualNocturno) {
      return marcajesActuales;
    }

    // Obtener los marcajes del día anterior (sin procesar validaciones para evitar recursión)
    // Usar una bandera para evitar recursión infinita
    const marcajesAnteriores = this.calcularMarcajesDelDiaSinValidacion(empleado, diaAnterior, bloqueAnterior);
    
    // Si no hay salida del día anterior, no hay nada que validar
    if (!marcajesAnteriores.salida || marcajesAnteriores.salida === 'Sin marcaje' || marcajesAnteriores.salida === 'SNM') {
      return marcajesActuales;
    }

    // Convertir las horas a minutos para comparar
    const entradaActualMinutos = this.convertirHoraAMinutos(marcajesActuales.entrada);
    const salidaAnteriorMinutos = this.convertirHoraAMinutos(marcajesAnteriores.salida);

    // Si la entrada del día actual es igual a la salida del día anterior, invalidar la entrada
    // Si además no hay salida válida, invalidar también la salida para que se muestre "Sin Registros"
    if (entradaActualMinutos === salidaAnteriorMinutos && entradaActualMinutos > 0) {
      // Invalidar la entrada del día actual
      // Si no hay salida válida o la salida también es inválida, invalidar todo para mostrar "Sin Registros"
      const tieneSalidaValida = marcajesActuales.salida && 
                                 marcajesActuales.salida !== 'Sin marcaje' && 
                                 marcajesActuales.salida !== 'SNM';
      
      if (!tieneSalidaValida) {
        // Si no hay salida válida, invalidar todo para que se muestre "Sin Registros"
        return {
          entrada: 'Sin marcaje',
          entradaDescanso: 'Sin marcaje',
          salidaDescanso: 'Sin marcaje',
          salida: 'Sin marcaje'
        };
      } else {
        // Si hay salida válida, solo invalidar la entrada
        // Pero en este caso, para que se muestre "Sin Registros", también invalidamos la salida
        // porque la entrada inválida hace que el registro completo sea inválido
        return {
          entrada: 'Sin marcaje',
          entradaDescanso: marcajesActuales.entradaDescanso || 'Sin marcaje',
          salidaDescanso: marcajesActuales.salidaDescanso || 'Sin marcaje',
          salida: 'Sin marcaje'
        };
      }
    }

    return marcajesActuales;
  }

  // Calcular marcajes del día sin aplicar la validación de entrada vs salida anterior (para evitar recursión)
  calcularMarcajesDelDiaSinValidacion(empleado: any, dia: Date, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
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
      esTurnoNocturno = true;
      const marcajesHoy = this.getMarcajesDelDia(empleado, dia);
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const marcajesManana = this.getMarcajesDelDia(empleado, diaSiguiente);
      marcajesParaAnalizar = [...marcajesHoy, ...marcajesManana].sort((a, b) => 
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      );
    } else {
      // Turno diurno: marcajes del mismo día + día siguiente (por si hay horas extras que terminan en madrugada)
      const marcajesHoy = this.getMarcajesDelDia(empleado, dia);
      const diaSiguiente = new Date(dia);
      diaSiguiente.setDate(diaSiguiente.getDate() + 1);
      const marcajesManana = this.getMarcajesDelDia(empleado, diaSiguiente);
      marcajesParaAnalizar = [...marcajesHoy, ...marcajesManana].sort((a, b) => 
        new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
      );
    }

    if (marcajesParaAnalizar.length === 0) {
      return { entrada: 'Sin marcaje', entradaDescanso: 'Sin marcaje', salidaDescanso: 'Sin marcaje', salida: 'Sin marcaje' };
    }

    // Crear objeto bloque con horas de plantilla
    const bloqueConPlantilla = {
      hora_entrada: plantilla.hora_entrada,
      hora_salida: plantilla.hora_salida,
      hora_entrada_descanso: plantilla.hora_descanso_entrada || '',
      hora_salida_descanso: plantilla.hora_descanso_salida || '',
      tiene_descanso: tieneDescanso,
      turno: esTurnoNocturno ? 'NOCTURNO' : 'DIURNO'
    };

    // Analizar marcajes usando la lógica inteligente
    const marcajesAnalizados = this.analizarMarcajesInteligente(marcajesParaAnalizar, bloqueConPlantilla, bloqueConPlantilla.turno, dia);

    // Aplicar validaciones de diferencias de tiempo (pero NO la validación de entrada vs salida anterior)
    const marcajesConValidacion = this.validarDiferenciasTiempo(marcajesAnalizados, bloqueConPlantilla);
    
    return marcajesConValidacion;
  }

  // Asignar marcajes de manera inteligente basándose en las horas programadas
  asignarMarcajesInteligente(marcajes: any[], bloque: any, turno: string, diaTurno?: Date): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const horasProgramadas = {
      entrada: this.convertirHoraAMinutos(bloque.hora_entrada),
      entradaDescanso: this.convertirHoraAMinutos(bloque.hora_entrada_descanso),
      salidaDescanso: this.convertirHoraAMinutos(bloque.hora_salida_descanso),
      salida: this.convertirHoraAMinutos(bloque.hora_salida)
    };

    // Determinar si es turno nocturno (hora entrada > hora salida)
    const esNocturno = bloque.turno === 'NOCTURNO' || horasProgramadas.entrada > horasProgramadas.salida;

    // Para turnos nocturnos Y diurnos, identificar qué marcajes son del día siguiente/anterior usando la fecha del día del turno
    // (Los diurnos también pueden tener horas extras que terminan en la madrugada del día siguiente)
    let fechaDiaTurno: Date | null = null;
    if (diaTurno) {
      fechaDiaTurno = new Date(diaTurno);
      fechaDiaTurno.setHours(0, 0, 0, 0);
    }

    const marcajesConHoras = marcajes.map(marcaje => {
      const fechaMarcaje = new Date(marcaje.event_time);
      const fechaMarcajeInicio = new Date(fechaMarcaje);
      fechaMarcajeInicio.setHours(0, 0, 0, 0);
      
      // Un marcaje es del día siguiente si su fecha es >= fechaDiaTurno + 1 día
      // Aplica tanto para nocturnos como diurnos (horas extras)
      const esDelDiaSiguiente = fechaDiaTurno && 
        fechaMarcajeInicio.getTime() >= fechaDiaTurno.getTime() + (24 * 60 * 60 * 1000);
      
      // Un marcaje es del día anterior si su fecha es < fechaDiaTurno
      // NUNCA debe usarse como salida (ni para nocturnos ni diurnos)
      const esDelDiaAnterior = fechaDiaTurno && 
        fechaMarcajeInicio.getTime() < fechaDiaTurno.getTime();
      
      return {
        marcaje,
        hora: this.convertirHoraAMinutos(this.formatearHora(new Date(marcaje.event_time).toTimeString().split(' ')[0])),
        fecha: fechaMarcaje,
        esDelDiaSiguiente: esDelDiaSiguiente || false,
        esDelDiaAnterior: esDelDiaAnterior || false
      };
    });

    // Asignar cada marcaje al horario programado más cercano
    const asignaciones = {
      entrada: '',
      entradaDescanso: '',
      salidaDescanso: '',
      salida: ''
    };

    const marcajesUsados = new Set();

    // Asignar entrada
    let entradaAsignada = '';
    if (esNocturno) {
      // TURNO NOCTURNO: Entrada es el ÚLTIMO marcaje del día (o el único si solo hay uno)
      // No puede ser del día siguiente ni anterior
      const marcajesDelDia = marcajesConHoras
        .filter(m => !m.esDelDiaSiguiente && !m.esDelDiaAnterior)
        .sort((a, b) => a.hora - b.hora);
      
      if (marcajesDelDia.length > 0) {
        const ultimoMarcaje = marcajesDelDia[marcajesDelDia.length - 1];
        entradaAsignada = this.formatearHora(new Date(ultimoMarcaje.marcaje.event_time).toTimeString().split(' ')[0]);
        marcajesUsados.add(ultimoMarcaje.marcaje);
      } else {
        entradaAsignada = 'Sin marcaje';
      }
    } else {
      // TURNO DIURNO: Entrada es el PRIMER marcaje del día (no del día siguiente ni anterior)
      const marcajesDelDia = marcajesConHoras
        .filter(m => !m.esDelDiaSiguiente && !m.esDelDiaAnterior)
        .sort((a, b) => a.hora - b.hora);
      
      if (marcajesDelDia.length > 0) {
        const primerMarcaje = marcajesDelDia[0];
        entradaAsignada = this.formatearHora(new Date(primerMarcaje.marcaje.event_time).toTimeString().split(' ')[0]);
        marcajesUsados.add(primerMarcaje.marcaje);
      } else {
        entradaAsignada = 'Sin marcaje';
      }
    }
    asignaciones.entrada = entradaAsignada;

    // Asignar salida SOLO si hay entrada
    // La salida se busca basándose en la entrada encontrada
    let salidaAsignada = 'Sin marcaje';
    if (entradaAsignada && entradaAsignada !== 'Sin marcaje') {
      // Asignar salida (más cercano a hora_salida) - hacerlo antes para poder filtrar marcajes de descanso
      // Para turnos nocturnos, la salida es del día siguiente
      // Para turnos diurnos, pasar la entrada asignada para validar que salida !== entrada
      salidaAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.salida, marcajesUsados, esNocturno, true, horasProgramadas.entrada, entradaAsignada);
    }
    asignaciones.salida = salidaAsignada;

    // Asignar entrada descanso si hay descanso manual definido en la plantilla
    if (bloque.tiene_descanso && horasProgramadas.entradaDescanso > 0) {
      const entradaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.entradaDescanso, marcajesUsados, esNocturno, false, horasProgramadas.entrada);
      asignaciones.entradaDescanso = entradaDescansoAsignada;

      // Asignar salida descanso solo si hay descanso definido
      if (horasProgramadas.salidaDescanso > 0) {
        // Determinar si el descanso cruza medianoche (solo para turnos nocturnos)
        const descansoCruzaMedianoche = esNocturno && horasProgramadas.salidaDescanso < horasProgramadas.entradaDescanso;
        const salidaDescansoAsignada = this.encontrarMarcajeMasCercano(marcajesConHoras, horasProgramadas.salidaDescanso, marcajesUsados, esNocturno, descansoCruzaMedianoche, horasProgramadas.entrada);
        asignaciones.salidaDescanso = salidaDescansoAsignada;
      }
    }
    // Si hay descanso automático, buscar marcajes de descanso entre entrada y salida
    else if (bloque.tiene_descanso_automatico && asignaciones.entrada !== 'Sin marcaje' && asignaciones.salida !== 'Sin marcaje') {
      // Buscar marcajes que estén entre la entrada y la salida y que no hayan sido usados
      const entradaMinutos = this.convertirHoraAMinutos(asignaciones.entrada);
      const salidaMinutos = this.convertirHoraAMinutos(asignaciones.salida);
      
      // Determinar si la salida es del día siguiente buscando el marcaje original
      let salidaEsDelDiaSiguiente = false;
      const marcajeSalida = marcajesConHoras.find(m => {
        const horaMarcaje = this.convertirHoraAMinutos(this.formatearHora(new Date(m.marcaje.event_time).toTimeString().split(' ')[0]));
        return horaMarcaje === salidaMinutos && marcajesUsados.has(m.marcaje);
      });
      if (marcajeSalida) {
        salidaEsDelDiaSiguiente = marcajeSalida.esDelDiaSiguiente;
      } else if (esNocturno) {
        // Si no encontramos el marcaje y es nocturno, asumimos que es del día siguiente si salida < entrada
        salidaEsDelDiaSiguiente = salidaMinutos < entradaMinutos;
      }
      
      // Filtrar marcajes disponibles que estén entre entrada y salida
      const marcajesDescansoDisponibles = marcajesConHoras.filter(m => {
        if (marcajesUsados.has(m.marcaje)) return false;
        const horaMarcaje = m.hora;
        
        // Para turnos nocturnos, considerar el cruce de medianoche
        if (esNocturno) {
          if (salidaEsDelDiaSiguiente) {
            // Si la salida es del día siguiente:
            // - Marcajes del mismo día después de entrada son descanso
            // - Marcajes del día siguiente antes de salida son descanso
            if (m.esDelDiaSiguiente) {
              return horaMarcaje < salidaMinutos;
            } else {
              return horaMarcaje > entradaMinutos;
            }
          } else {
            // Si la salida es del mismo día:
            // - Solo marcajes del mismo día entre entrada y salida son descanso
            if (m.esDelDiaSiguiente) {
              return false;
            } else {
              return horaMarcaje > entradaMinutos && horaMarcaje < salidaMinutos;
            }
          }
        } else {
          // Para turnos diurnos, el marcaje debe estar entre entrada y salida
          if (salidaEsDelDiaSiguiente) {
            // Si la salida es del día siguiente:
            // - Marcajes del mismo día después de entrada son descanso
            // - Marcajes del día siguiente antes de salida son descanso
            if (m.esDelDiaSiguiente) {
              return horaMarcaje < salidaMinutos;
            } else {
              return horaMarcaje > entradaMinutos;
            }
          } else {
            // Si la salida es del mismo día:
            // - Solo marcajes del mismo día entre entrada y salida son descanso
            if (m.esDelDiaSiguiente) {
              return false;
            } else {
              return horaMarcaje > entradaMinutos && horaMarcaje < salidaMinutos;
            }
          }
        }
      });
      
      // Ordenar por hora
      marcajesDescansoDisponibles.sort((a, b) => a.hora - b.hora);
      
      // Si hay al menos 2 marcajes disponibles, asignar el primero como entrada descanso y el segundo como salida descanso
      if (marcajesDescansoDisponibles.length >= 2) {
        const entradaDescansoMarcaje = marcajesDescansoDisponibles[0];
        const salidaDescansoMarcaje = marcajesDescansoDisponibles[1];
        
        // Verificar que la entrada descanso sea antes que la salida descanso
        if (entradaDescansoMarcaje.hora < salidaDescansoMarcaje.hora || 
            (esNocturno && entradaDescansoMarcaje.esDelDiaSiguiente === false && salidaDescansoMarcaje.esDelDiaSiguiente === true)) {
          asignaciones.entradaDescanso = this.formatearHora(new Date(entradaDescansoMarcaje.marcaje.event_time).toTimeString().split(' ')[0]);
          marcajesUsados.add(entradaDescansoMarcaje.marcaje);
          
          asignaciones.salidaDescanso = this.formatearHora(new Date(salidaDescansoMarcaje.marcaje.event_time).toTimeString().split(' ')[0]);
          marcajesUsados.add(salidaDescansoMarcaje.marcaje);
        }
      }
    }

    // Aplicar validaciones de diferencias de tiempo
    const asignacionesConValidacion = this.validarDiferenciasTiempo(asignaciones, bloque);
    
    return asignacionesConValidacion;
  }

  // Convertir hora HH:MM a minutos para comparación
  convertirHoraAMinutos(hora: string): number {
    if (!hora) return 0;
    // Asegurar que sea string y hacer trim
    const horaStr = String(hora).trim();
    if (!horaStr || !horaStr.includes(':')) return 0;
    const partes = horaStr.split(':');
    if (partes.length < 2) return 0;
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);
    if (isNaN(horas) || isNaN(minutos)) return 0;
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
  analizarMarcajesInteligente(marcajes: any[], bloque: any, turno: string, diaTurno?: Date): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
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
        const marcajesAsignados = this.asignarMarcajesInteligente(marcajesOrdenados, bloque, turno, diaTurno);
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
        const marcajesAsignados = this.asignarMarcajesInteligente(marcajesOrdenados, bloque, turno, diaTurno);
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
    const descansoAutomatico = plantilla?.descanso_automatico || null;
    const tieneDescansoManual = bloque?.tiene_descanso || !!(horaEntradaDescanso && horaSalidaDescanso);
    const tieneDescansoAutomatico = !!descansoAutomatico;
    
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
    if (tieneDescansoAutomatico) {
      // Si hay descanso automático, usar ese valor
      horasDeDescanso = this.convertirHoraAMinutos(descansoAutomatico);
    } else if (tieneDescansoManual && horaEntradaDescanso && horaSalidaDescanso) {
      // Si hay descanso manual, calcular la diferencia
      const entradaDescansoProgramada = this.convertirHoraAMinutos(horaEntradaDescanso);
      const salidaDescansoProgramada = this.convertirHoraAMinutos(horaSalidaDescanso);
      
      // Si es turno nocturno y el descanso cruza medianoche (salida < entrada)
      if (esNocturno && salidaDescansoProgramada < entradaDescansoProgramada) {
        // El descanso cruza medianoche: calcular hasta medianoche + desde medianoche hasta salida
        horasDeDescanso = (24 * 60 - entradaDescansoProgramada) + salidaDescansoProgramada;
      } else {
        // Descanso normal (diurno o nocturno sin cruce)
        horasDeDescanso = salidaDescansoProgramada - entradaDescansoProgramada;
      }
    }
    
    // Ajustar horas a trabajar: restar el descanso automático si existe
    if (tieneDescansoAutomatico) {
      horasATrabajar = horasATrabajar - horasDeDescanso;
    }
    
    // Calcular horas reales trabajadas
    let horasTrabajadas = 0;
    let horasDescansadas = 0;
    
    // Verificar si hay marcajes de descanso válidos (definir antes para usar en toda la función)
    const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajes.entradaDescanso) && 
                                  this.esMarcajeDescansoValido(marcajes.salidaDescanso);
    
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
      
      if (tieneDescansoAutomatico) {
        // Si hay descanso automático
        if (tieneMarcajesDescanso) {
          // Si hay marcajes de descanso válidos, calcular el descanso real
          const entradaDescansoReal = this.convertirHoraAMinutos(marcajes.entradaDescanso);
          const salidaDescansoReal = this.convertirHoraAMinutos(marcajes.salidaDescanso);
          
          // Calcular horas de descanso real considerando cruce de medianoche para turnos nocturnos
          let horasDescansadasReales = 0;
          if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
            // El descanso cruza medianoche
            horasDescansadasReales = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
          } else {
            // Descanso normal (diurno o nocturno sin cruce)
            horasDescansadasReales = salidaDescansoReal - entradaDescansoReal;
          }
          
          // Horas trabajadas = totales - descansadas reales
          horasTrabajadas = horasTotales - horasDescansadasReales;
          
          // Mostrar el tiempo REAL de descanso (no el balance)
          // El balance solo se usa para determinar el color (rojo/verde)
          horasDescansadas = horasDescansadasReales; // Mostrar el tiempo real descansado
        } else {
          // Si no hay marcajes de descanso, NO se descuenta de las horas trabajadas
          // Las horas trabajadas son el total sin descontar descanso
          horasTrabajadas = horasTotales;
          horasDescansadas = 0; // No se muestra descanso descontado en este caso
        }
      } else if (tieneDescansoManual && !tieneDescansoAutomatico && marcajes.entradaDescanso !== 'Sin marcaje' && marcajes.salidaDescanso !== 'Sin marcaje') {
        // Solo procesar descanso manual si NO hay descanso automático
        // Con descanso manual real: horas trabajadas = totalidad - horas descansadas
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
        
      } else if (tieneDescansoManual && !tieneDescansoAutomatico) {
        // Solo procesar descanso manual si NO hay descanso automático
        // Sin descanso real pero con descanso manual programado: asumir que tomó el descanso programado
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
    
    // Formatear horas descansadas (tiempo real de descanso, no balance)
    // Si hay descanso automático pero NO hay marcajes válidos, no mostrar nada
    let horasDescansadasFormateadas = '';
    if (tieneDescansoAutomatico && !tieneMarcajesDescanso) {
      horasDescansadasFormateadas = ''; // No mostrar nada cuando no hay marcajes válidos
    } else {
      horasDescansadasFormateadas = this.formatearMinutosAHora(horasDescansadas);
    }
    
    // Verificar si hay marcajes reales
    const tieneMarcajes = marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje';
    
    // Si no hay marcajes, mostrar solo: 00:00 - 00:00 (segundo y cuarto valor)
    if (!tieneMarcajes) {
      const texto = `00:00 - 00:00`;
      return { texto, claseColor: '' };
    }
    
    // Determinar colores de fondo para cada grupo
    let claseFondoTrabajadas = '';
    let claseFondoDescansadas = '';
    
    if (tieneMarcajes) {
      // Calcular horas esperadas a trabajar (descontando descanso si hay)
      let horasEsperadasTrabajadas = horasATrabajar;
      
      // Si hay descanso manual, descontar las horas de descanso esperadas
      if (tieneDescansoManual && horasDeDescanso > 0) {
        horasEsperadasTrabajadas = horasATrabajar - horasDeDescanso;
      }
      // Si hay descanso automático, ya se descontó arriba en horasATrabajar
      
      // Color de fondo para horas trabajadas (primer valor)
      // Comparar horas trabajadas (ya descontadas) vs horas esperadas a trabajar (descontadas)
      if (horasTrabajadas < horasEsperadasTrabajadas) {
        claseFondoTrabajadas = 'bg-calculo-danger'; // Fondo rojo clarito
        
      } else if (horasTrabajadas > horasEsperadasTrabajadas) {
        claseFondoTrabajadas = 'bg-calculo-success'; // Fondo verde clarito
        
      }
      
      // Color de fondo para horas descansadas (segundo valor) - solo si hay descanso programado
      if (horasDeDescanso > 0) {
        // Si hay descanso automático Y hay marcajes de descanso válidos, comparar descanso real vs estipulado
        if (tieneDescansoAutomatico && tieneMarcajesDescanso) {
          // horasDescansadas contiene el tiempo real descansado
          // Si descansó MENOR a lo estipulado → verde (bien, descansó menos)
          // Si descansó MAYOR o IGUAL a lo estipulado → rojo (malo, descansó más o igual)
          if (horasDescansadas < horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-success'; // Fondo verde: descansó menos de lo estipulado
          } else {
            claseFondoDescansadas = 'bg-calculo-danger'; // Fondo rojo: descansó más o igual a lo estipulado
          }
        } else if (!tieneDescansoAutomatico) {
          // Para descanso manual, comparar como antes
          if (horasDescansadas > horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-danger'; // Fondo rojo clarito
          } else if (horasDescansadas < horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-success'; // Fondo verde clarito
          }
        }
      }
    }
    
    // Construir texto solo con el segundo (trabajado) y cuarto (descansado) valor
    // Cada valor va en su propio span con fondo si corresponde
    const separador = '&nbsp;-&nbsp;';
    
    // Si hay descanso automático y NO hay marcajes válidos, mostrar solo horas trabajadas (sin dividir)
    if (tieneDescansoAutomatico && !tieneMarcajesDescanso) {
      const trabajadasHtml = claseFondoTrabajadas 
        ? `<span class="${claseFondoTrabajadas}">${horasTrabajadasFormateadas}</span>`
        : horasTrabajadasFormateadas;
      const texto = trabajadasHtml;
      return { texto, claseColor: '' };
    }
    
    // Si hay descanso automático con marcajes válidos O descanso manual, mostrar ambos valores
    const trabajadasHtml = claseFondoTrabajadas 
      ? `<span class="${claseFondoTrabajadas}">${horasTrabajadasFormateadas}</span>`
      : horasTrabajadasFormateadas;
    
    const descansadasHtml = claseFondoDescansadas 
      ? `<span class="${claseFondoDescansadas}">${horasDescansadasFormateadas}</span>`
      : horasDescansadasFormateadas;
    
    const texto = `${trabajadasHtml}${separador}${descansadasHtml}`;
    
    return { texto, claseColor: '' };
  }

  // Obtener solo las horas trabajadas para el cálculo
  getCalculoHorasTrabajadas(empleado: any, dia: Date): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque || this.isSinHorario(empleado, dia)) {
      return '00:00';
    }
    const valores = this.getCalculoValores(empleado, dia, bloque);
    return valores.horasTrabajadas;
  }

  // Obtener solo las horas descansadas para el cálculo
  getCalculoHorasDescansadas(empleado: any, dia: Date): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque || this.isSinHorario(empleado, dia)) {
      return '00:00';
    }
    
    // Obtener valores calculados
    const valores = this.getCalculoValores(empleado, dia, bloque);
    
    // Si hay descanso automático en la plantilla, verificar si hay marcajes válidos
    if (bloque?.PlantillaHorario?.descanso_automatico) {
      const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
      const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajes.entradaDescanso) && 
                                    this.esMarcajeDescansoValido(marcajes.salidaDescanso);
      
      // Si NO hay marcajes válidos (Sin marcaje, DNM, etc.), no mostrar columna de descanso
      if (!tieneMarcajesDescanso) {
        return '';
      }
      // Si hay marcajes válidos, retornar el balance (ya calculado en getCalculoValores)
    }
    
    return valores.horasDescansadas;
  }

  // Obtener la clase CSS para horas trabajadas
  getCalculoClaseTrabajadas(empleado: any, dia: Date): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque || this.isSinHorario(empleado, dia)) {
      return '';
    }
    const resumenCalculo = this.getCalculoClases(empleado, dia, bloque);
    return resumenCalculo.claseTrabajadas;
  }

  // Obtener la clase CSS para horas descansadas
  getCalculoClaseDescansadas(empleado: any, dia: Date): string {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque || this.isSinHorario(empleado, dia)) {
      return '';
    }
    
    // Si hay descanso automático, verificar si hay marcajes de descanso válidos
    if (bloque?.PlantillaHorario?.descanso_automatico) {
      const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
      const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajes.entradaDescanso) && 
                                    this.esMarcajeDescansoValido(marcajes.salidaDescanso);
      
      // Si hay marcajes de descanso válidos, retornar la clase (para mostrar el balance)
      if (tieneMarcajesDescanso) {
        const resumenCalculo = this.getCalculoClases(empleado, dia, bloque);
        return resumenCalculo.claseDescansadas;
      }
      // Si no hay marcajes de descanso, no mostrar clase (ocupa todo el ancho)
      return '';
    }
    
    const resumenCalculo = this.getCalculoClases(empleado, dia, bloque);
    return resumenCalculo.claseDescansadas;
  }

  // Helper: indica si hay descanso automático en la plantilla del día
  isDescansoAutomaticoDay(empleado: any, dia: Date): boolean {
    const bloque = this.getBloqueHorario(empleado, dia);
    return !!bloque?.PlantillaHorario?.descanso_automatico;
  }

  // Helper: verificar si un marcaje de descanso es válido (no contiene "Sin marcaje", "DNM" o "SDNM")
  esMarcajeDescansoValido(marcaje: string): boolean {
    if (!marcaje) return false;
    const marcajeStr = String(marcaje).trim();
    // Verificar si contiene "Sin marcaje", "DNM" o "SDNM" (no solo igualdad exacta)
    return marcajeStr !== 'Sin marcaje' && 
           marcajeStr !== 'DNM' && 
           marcajeStr !== 'SDNM' &&
           !marcajeStr.includes('Sin marcaje') &&
           !marcajeStr.includes('DNM') &&
           !marcajeStr.includes('SDNM');
  }

  // Helper: indica si la columna de trabajadas debe ocupar todo el ancho
  // (cuando hay descanso automático O cuando no hay descanso de ningún tipo)
  shouldShowFullWidthTrabajadas(empleado: any, dia: Date): boolean {
    const bloque = this.getBloqueHorario(empleado, dia);
    if (!bloque) return false;
    
    const plantilla = bloque?.PlantillaHorario;
    const tieneDescansoAutomatico = !!plantilla?.descanso_automatico;
    const tieneDescansoManual = bloque?.tiene_descanso || !!(plantilla?.hora_descanso_entrada && plantilla?.hora_descanso_salida);
    
    // Si hay descanso automático, verificar si hay marcajes de descanso válidos
    if (tieneDescansoAutomatico) {
      const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
      const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajes.entradaDescanso) && 
                                    this.esMarcajeDescansoValido(marcajes.salidaDescanso);
      
      // Si hay marcajes de descanso válidos, dividir el bloque (retornar false)
      if (tieneMarcajesDescanso) {
        return false;
      }
      // Si no hay marcajes de descanso, ocupar todo el ancho
      return true;
    }
    
    // Ocupar todo el ancho si no hay descanso de ningún tipo
    return !tieneDescansoManual;
  }

  // Calcular alertas de marcaje (Ent Ant Hora, Ent Des Hora, Sal Ant Hora, Sal Des Hora)
  calcularAlertasMarcaje(empleado: any, dia: Date, bloque: any): string {
    const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
    const plantilla = bloque?.PlantillaHorario;
    
    // Si no hay plantilla o marcajes, no hay alertas
    if (!plantilla || !marcajes) {
      return '';
    }

    // Obtener horas programadas
    const horaEntradaProgramada = this.convertirHoraAMinutos(plantilla.hora_entrada);
    const horaSalidaProgramada = this.convertirHoraAMinutos(plantilla.hora_salida);
    
    const alertas: string[] = [];
    const TOLERANCIA_MINUTOS = 20;

    // Validar entrada
    if (marcajes.entrada && marcajes.entrada !== 'Sin marcaje' && horaEntradaProgramada > 0) {
      const entradaRealMinutos = this.convertirHoraAMinutos(marcajes.entrada);
      
      if (entradaRealMinutos > 0) {
        const diferencia = entradaRealMinutos - horaEntradaProgramada;
        
        // Si llegó más de 20 minutos antes
        if (diferencia < -TOLERANCIA_MINUTOS) {
          const diferenciaAbsoluta = Math.abs(diferencia);
          const diferenciaFormateada = this.formatearDiferenciaHHMM(diferenciaAbsoluta);
          alertas.push(`<span style="font-weight: bold;">Ent Ant (${diferenciaFormateada})</span>`);
        }
        // Si llegó más de 20 minutos después
        else if (diferencia > TOLERANCIA_MINUTOS) {
          const diferenciaFormateada = this.formatearDiferenciaHHMM(diferencia);
          alertas.push(`<span style="color: red; font-weight: bold;">Ent Des (${diferenciaFormateada})</span>`);
        }
      }
    }

    // Validar salida
    if (marcajes.salida && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM' && horaSalidaProgramada > 0) {
      const salidaRealMinutos = this.convertirHoraAMinutos(marcajes.salida);
      const entradaRealMinutos = marcajes.entrada && marcajes.entrada !== 'Sin marcaje' 
        ? this.convertirHoraAMinutos(marcajes.entrada) 
        : horaEntradaProgramada;
      
      if (salidaRealMinutos > 0) {
        // Determinar si realmente cruza medianoche basándose en los marcajes reales
        // Si la salida real es menor que la entrada real, significa que cruzó medianoche
        const cruzaMedianocheReal = salidaRealMinutos < entradaRealMinutos;
        const esTurnoNocturnoProgramado = horaEntradaProgramada > horaSalidaProgramada;
        
        let diferencia: number;
        
        if (cruzaMedianocheReal) {
          // La salida real es del día siguiente (cruza medianoche)
          // Ajustar la salida programada si también cruza medianoche
          if (esTurnoNocturnoProgramado) {
            // Ambas cruzan medianoche: comparación directa
            diferencia = salidaRealMinutos - horaSalidaProgramada;
          } else {
            // La programada no cruza pero la real sí: ajustar
            // La salida programada está en el mismo día, pero la real está al día siguiente
            // Diferencia = (24*60 - horaSalidaProgramada) + salidaRealMinutos - (24*60 - horaEntradaProgramada) - (horaEntradaProgramada - horaSalidaProgramada)
            // Simplificado: salidaRealMinutos - horaSalidaProgramada (pero considerando el cruce)
            diferencia = salidaRealMinutos - horaSalidaProgramada;
          }
        } else if (esTurnoNocturnoProgramado && !cruzaMedianocheReal) {
          // La programada cruza medianoche pero la real NO cruza (salió antes)
          // Ajustar: la salida programada está al día siguiente, pero la real está el mismo día
          // Necesitamos comparar correctamente
          // Si la salida real es mayor que la entrada real, está el mismo día
          // La diferencia debe considerar que la programada esperaba cruzar medianoche
          const salidaProgramadaAjustada = horaSalidaProgramada + (24 * 60); // Ajustar al día siguiente
          diferencia = salidaRealMinutos - salidaProgramadaAjustada;
        } else {
          // Ninguna cruza medianoche: diferencia simple
          diferencia = salidaRealMinutos - horaSalidaProgramada;
        }
        
        // Si salió más de 20 minutos antes
        if (diferencia < -TOLERANCIA_MINUTOS) {
          const diferenciaAbsoluta = Math.abs(diferencia);
          const diferenciaFormateada = this.formatearDiferenciaHHMM(diferenciaAbsoluta);
          alertas.push(`<span style="color: red; font-weight: bold;">Sal Ant (${diferenciaFormateada})</span>`);
        }
        // Si salió más de 20 minutos después
        else if (diferencia > TOLERANCIA_MINUTOS) {
          const diferenciaFormateada = this.formatearDiferenciaHHMM(diferencia);
          alertas.push(`<span style="font-weight: bold;">Sal Des (${diferenciaFormateada})</span>`);
        }
      }
    }

    return alertas.join(' - ');
  }

  // Formatear diferencia de minutos a formato legible (ej: "30 min", "1h 15 min")
  formatearDiferenciaMinutos(minutos: number): string {
    if (minutos < 60) {
      return `${minutos} min`;
    } else {
      const horas = Math.floor(minutos / 60);
      const minutosRestantes = minutos % 60;
      if (minutosRestantes === 0) {
        return `${horas}h`;
      } else {
        return `${horas}h ${minutosRestantes} min`;
      }
    }
  }

  // Formatear diferencia a HH:MM siempre (con padding 2 dígitos)
  private formatearDiferenciaHHMM(minutos: number): string {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = minutos % 60;
    const hh = horas.toString().padStart(2, '0');
    const mm = minutosRestantes.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // Calcular el resultado del turno (D, N, M, E, o vacío)
  // IMPORTANTE: Usar los datos que se muestran en la columna "Marcaje" directamente
  getResultadoTurno(empleado: any, dia: Date): SafeHtml {
    const bloque = this.getBloqueHorario(empleado, dia);
    const sinHorario = this.isSinHorario(empleado, dia);
    
    if (!bloque || sinHorario) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }

    // Usar el mismo método que se usa para mostrar en "Marcaje"
    const marcajeInfo = this.getHorarioInfo(empleado, dia, 'Descanso');
    
    // Constantes para los rangos
    const HORA_DIURNO_INICIO = 5 * 60; // 5:00 = 300 minutos
    const HORA_DIURNO_FIN = 19 * 60; // 19:00 = 1140 minutos
    const HORA_NOCTURNO_FIN = 23 * 60; // 23:00 = 1380 minutos
    
    // CASO 1: Si NO hay registro en entrada Y NO hay registro en salida → Campo vacío
    const marcajeInfoTrimmed = marcajeInfo ? String(marcajeInfo).trim() : '';
    
    // Validar casos especiales: Sin Registros, Sin horario, vacío
    // Verificar múltiples variaciones para asegurar que se detecte correctamente
    if (!marcajeInfoTrimmed || 
        marcajeInfoTrimmed === 'Sin Registros' || 
        marcajeInfoTrimmed === 'Sin horario' ||
        marcajeInfoTrimmed.toLowerCase().includes('sin registro') ||
        marcajeInfoTrimmed.toLowerCase().includes('sin registros') ||
        marcajeInfoTrimmed === 'Sin marcaje' ||
        marcajeInfoTrimmed.toLowerCase() === 'sin marcaje') {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    
    // Parsear el string que se muestra en "Marcaje"
    // Formato esperado: 
    // - "HH:MM - Sin descanso - HH:MM" (entrada y salida)
    // - "HH:MM - DNM - HH:MM" (con descanso)
    // - "HH:MM - Sin descanso - SNM" (sin salida marcada)
    // - "HH:MM" (solo entrada, sin salida)
    let entradaStr = '';
    let salidaStr = '';
    let tieneEntrada = false;
    let tieneSalida = false;
    
    // Si contiene " - ", es formato con entrada y posible salida
    if (marcajeInfoTrimmed.includes(' - ')) {
      const partes = marcajeInfoTrimmed.split(' - ');
      entradaStr = partes[0]?.trim() || '';
      
      // Validar si entrada es válida (formato HH:MM)
      if (entradaStr && entradaStr.match(/^\d{1,2}:\d{2}$/)) {
        tieneEntrada = true;
      }
      
      // La salida está en la última parte - verificar si es válida
      const ultimaParte = partes[partes.length - 1]?.trim() || '';
      
      // Si la última parte tiene formato HH:MM (no es "SNM", "SDNM", etc.), es salida válida
      if (ultimaParte && ultimaParte.match(/^\d{1,2}:\d{2}$/)) {
        salidaStr = ultimaParte;
        tieneSalida = true;
      }
    } else {
      // Si no tiene " - ", verificar si es solo entrada (HH:MM)
      if (marcajeInfoTrimmed.match(/^\d{1,2}:\d{2}$/)) {
        entradaStr = marcajeInfoTrimmed;
        tieneEntrada = true;
        tieneSalida = false;
      }
    }
    
    // CASO 2: Si NO hay entrada Y NO hay salida → Campo vacío
    if (!tieneEntrada && !tieneSalida) {
      return this.sanitizer.bypassSecurityTrustHtml('');
    }
    
    // CASO 3: Si solo hay entrada (sin salida) → "ERROR"
    if (tieneEntrada && !tieneSalida) {
      return this.sanitizer.bypassSecurityTrustHtml('<span style="font-weight: bold;">ERROR</span>');
    }
    
    // CASO 4: Si NO tenemos entrada O NO tenemos salida → "ERROR"
    // (Este caso debería ser raro, pero por seguridad)
    if (!tieneEntrada || !tieneSalida) {
      return this.sanitizer.bypassSecurityTrustHtml('<span style="font-weight: bold;">ERROR</span>');
    }
    
    // Convertir las horas a minutos
    const entradaMinutos = this.convertirHoraAMinutos(entradaStr);
    const salidaMinutos = this.convertirHoraAMinutos(salidaStr);
    
    // Si las conversiones fallaron, error
    if (isNaN(entradaMinutos) || isNaN(salidaMinutos)) {
      return this.sanitizer.bypassSecurityTrustHtml('<span style="font-weight: bold;">ERROR</span>');
    }
    
    // Determinar si la salida es del día siguiente (salida < entrada)
    const esSalidaDelDiaSiguiente = salidaMinutos < entradaMinutos;
    
    // Calcular alertas de marcaje
    const alertas = this.calcularAlertasMarcaje(empleado, dia, bloque);
    
    let resultadoTexto = '';
    
    // CASO 5: Si la salida es del día siguiente (00:00, 01:00, etc.) o > 23:00 → "NOCTURNO"
    // PRIORIDAD ABSOLUTA: Verificar esto PRIMERO
    if (esSalidaDelDiaSiguiente || salidaMinutos > HORA_NOCTURNO_FIN) {
      resultadoTexto = '<span style="font-weight: bold;">NOCTURNO</span>';
    }
    // CASO 6: DIURNO PURO
    // Si entrada entre 5:00 AM y 7:00 PM (19:00) y salida <= 19:00 → "DIURNO"
    // IMPORTANTE: salida debe ser <= 19:00 (1140 minutos) - esto es CRÍTICO
    else if (entradaMinutos >= HORA_DIURNO_INICIO && 
        entradaMinutos < HORA_DIURNO_FIN &&
        salidaMinutos > entradaMinutos && 
        salidaMinutos <= HORA_DIURNO_FIN) {
      resultadoTexto = '<span style="font-weight: bold;">DIURNO</span>';
    }
    // CASO 7: MIXTO
    // Si entrada entre 5:00 AM y 7:00 PM, salida > 19:00 pero <= 23:00 → "M {diurnas} - {nocturnas}"
    // IMPORTANTE: salida debe ser > 19:00 (1140) y <= 23:00 (1380)
    else if (entradaMinutos >= HORA_DIURNO_INICIO && 
        entradaMinutos < HORA_DIURNO_FIN &&
        salidaMinutos > HORA_DIURNO_FIN && 
        salidaMinutos <= HORA_NOCTURNO_FIN) {
      // Calcular horas diurnas: desde entrada hasta 19:00
      const horasDiurnas = HORA_DIURNO_FIN - entradaMinutos;
      // Calcular horas nocturnas: desde 19:00 hasta salida
      const horasNocturnas = salidaMinutos - HORA_DIURNO_FIN;
      
      const horasDiurnasFormateadas = this.formatearMinutosAHora(horasDiurnas);
      const horasNocturnasFormateadas = this.formatearMinutosAHora(horasNocturnas);
      
      resultadoTexto = `<span style="font-weight: bold;">( D ) ${horasDiurnasFormateadas} - ( N ) ${horasNocturnasFormateadas}</span>`;
    }
    // Por defecto: Nocturno
    else {
      resultadoTexto = '<span style="font-weight: bold;">NOCTURNO</span>';
    }
    
    // Agregar alertas en una línea separada si existen
    if (alertas && alertas.trim() !== '') {
      resultadoTexto = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%;">${resultadoTexto}<div style="font-size: 0.75em; line-height: 1.2; margin-top: 2px;">${alertas}</div></div>`;
    }
    
    return this.sanitizer.bypassSecurityTrustHtml(resultadoTexto);
  }

  // Método auxiliar para obtener los valores calculados
  getCalculoValores(empleado: any, dia: Date, bloque: any): { horasTrabajadas: string, horasDescansadas: string } {
    const marcajesCalculo = this.calcularMarcajesDelDia(empleado, dia, bloque);
    const plantilla = bloque?.PlantillaHorario;
    const horaEntrada = plantilla?.hora_entrada || bloque?.hora_entrada || '';
    const horaSalida = plantilla?.hora_salida || bloque?.hora_salida || '';
    const horaEntradaDescanso = plantilla?.hora_descanso_entrada || bloque?.hora_entrada_descanso || '';
    const horaSalidaDescanso = plantilla?.hora_descanso_salida || bloque?.hora_salida_descanso || '';
    const descansoAutomatico = plantilla?.descanso_automatico || null;
    const tieneDescansoManual = bloque?.tiene_descanso || !!(horaEntradaDescanso && horaSalidaDescanso);
    const tieneDescansoAutomatico = !!descansoAutomatico;
    
    const horaEntradaProgramada = this.convertirHoraAMinutos(horaEntrada);
    const horaSalidaProgramada = this.convertirHoraAMinutos(horaSalida);
    
    let horasATrabajar;
    const esNocturno = bloque?.turno === 'NOCTURNO' || horaEntradaProgramada > horaSalidaProgramada;
    if (esNocturno) {
      if (horaSalidaProgramada < horaEntradaProgramada) {
        horasATrabajar = (24 * 60 - horaEntradaProgramada) + horaSalidaProgramada;
      } else {
        horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
      }
    } else {
      horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
    }
    
    let horasDeDescanso = 0;
    if (tieneDescansoAutomatico) {
      // Si hay descanso automático, usar ese valor
      horasDeDescanso = this.convertirHoraAMinutos(descansoAutomatico);
    } else if (tieneDescansoManual && horaEntradaDescanso && horaSalidaDescanso) {
      const entradaDescansoProgramada = this.convertirHoraAMinutos(horaEntradaDescanso);
      const salidaDescansoProgramada = this.convertirHoraAMinutos(horaSalidaDescanso);
      if (esNocturno && salidaDescansoProgramada < entradaDescansoProgramada) {
        horasDeDescanso = (24 * 60 - entradaDescansoProgramada) + salidaDescansoProgramada;
      } else {
        horasDeDescanso = salidaDescansoProgramada - entradaDescansoProgramada;
      }
    }
    
    // Ajustar horas a trabajar: restar el descanso automático si existe
    if (tieneDescansoAutomatico) {
      horasATrabajar = horasATrabajar - horasDeDescanso;
    }
    
    let horasTrabajadas = 0;
    let horasDescansadas = 0;
    
    // Verificar si hay marcajes de descanso válidos (definir antes para usar en toda la función)
    const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajesCalculo.entradaDescanso) && 
                                  this.esMarcajeDescansoValido(marcajesCalculo.salidaDescanso);
    
    const tieneMarcajes = marcajesCalculo.entrada !== 'Sin marcaje' && marcajesCalculo.salida !== 'Sin marcaje' && marcajesCalculo.salida !== 'SNM';
    
    if (tieneMarcajes) {
      const horaEntradaReal = this.convertirHoraAMinutos(marcajesCalculo.entrada);
      const horaSalidaReal = this.convertirHoraAMinutos(marcajesCalculo.salida);
      
      let horasTotales;
      if (esNocturno) {
        if (horaSalidaReal < horaEntradaReal) {
          horasTotales = (24 * 60 - horaEntradaReal) + horaSalidaReal;
        } else {
          horasTotales = horaSalidaReal - horaEntradaReal;
        }
      } else {
        horasTotales = horaSalidaReal - horaEntradaReal;
      }
      
      if (tieneDescansoAutomatico) {
        // Si hay descanso automático
        if (tieneMarcajesDescanso) {
          // Si hay marcajes de descanso válidos, calcular el descanso real
          const entradaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.entradaDescanso);
          const salidaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.salidaDescanso);
          
          // Calcular horas de descanso real considerando cruce de medianoche para turnos nocturnos
          let horasDescansadasReales = 0;
          if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
            horasDescansadasReales = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
          } else {
            horasDescansadasReales = salidaDescansoReal - entradaDescansoReal;
          }
          
          // Horas trabajadas = totales - descansadas reales
          horasTrabajadas = horasTotales - horasDescansadasReales;
          
          // Mostrar el tiempo REAL de descanso (no el balance)
          // El balance solo se usa para determinar el color (rojo/verde)
          horasDescansadas = horasDescansadasReales; // Mostrar el tiempo real descansado
        } else {
          // Si no hay marcajes de descanso, NO se descuenta de las horas trabajadas
          // Las horas trabajadas son el total sin descontar descanso
          horasTrabajadas = horasTotales;
          horasDescansadas = 0; // No se muestra descanso descontado en este caso
        }
      } else if (tieneDescansoManual && !tieneDescansoAutomatico && marcajesCalculo.entradaDescanso !== 'Sin marcaje' && marcajesCalculo.salidaDescanso !== 'Sin marcaje') {
        // Solo procesar descanso manual si NO hay descanso automático
        const entradaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.entradaDescanso);
        const salidaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.salidaDescanso);
        
        if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
          horasDescansadas = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
        } else {
          horasDescansadas = salidaDescansoReal - entradaDescansoReal;
        }
        horasTrabajadas = horasTotales - horasDescansadas;
      } else if (tieneDescansoManual && !tieneDescansoAutomatico) {
        // Solo procesar descanso manual si NO hay descanso automático
        horasDescansadas = horasDeDescanso;
        horasTrabajadas = horasTotales - horasDescansadas;
      } else {
        horasTrabajadas = horasTotales;
        horasDescansadas = 0;
      }
    }
    
    // Formatear horas descansadas (tiempo real de descanso, no balance)
    // Si hay descanso automático pero NO hay marcajes válidos, retornar cadena vacía
    let horasDescansadasFormateadas = '';
    if (tieneDescansoAutomatico && !tieneMarcajesDescanso) {
      horasDescansadasFormateadas = ''; // No mostrar nada cuando no hay marcajes válidos
    } else {
      horasDescansadasFormateadas = this.formatearMinutosAHora(horasDescansadas);
    }
    
    return {
      horasTrabajadas: this.formatearMinutosAHora(horasTrabajadas),
      horasDescansadas: horasDescansadasFormateadas
    };
  }

  // Método auxiliar para obtener las clases CSS sin generar el texto
  getCalculoClases(empleado: any, dia: Date, bloque: any): { claseTrabajadas: string, claseDescansadas: string } {
    const marcajesCalculo = this.calcularMarcajesDelDia(empleado, dia, bloque);
    const plantilla = bloque?.PlantillaHorario;
    const horaEntrada = plantilla?.hora_entrada || bloque?.hora_entrada || '';
    const horaSalida = plantilla?.hora_salida || bloque?.hora_salida || '';
    const horaEntradaDescanso = plantilla?.hora_descanso_entrada || bloque?.hora_entrada_descanso || '';
    const horaSalidaDescanso = plantilla?.hora_descanso_salida || bloque?.hora_salida_descanso || '';
    const descansoAutomatico = plantilla?.descanso_automatico || null;
    const tieneDescansoManual = bloque?.tiene_descanso || !!(horaEntradaDescanso && horaSalidaDescanso);
    const tieneDescansoAutomatico = !!descansoAutomatico;
    
    const horaEntradaProgramada = this.convertirHoraAMinutos(horaEntrada);
    const horaSalidaProgramada = this.convertirHoraAMinutos(horaSalida);
    
    let horasATrabajar;
    const esNocturno = bloque?.turno === 'NOCTURNO' || horaEntradaProgramada > horaSalidaProgramada;
    if (esNocturno) {
      if (horaSalidaProgramada < horaEntradaProgramada) {
        horasATrabajar = (24 * 60 - horaEntradaProgramada) + horaSalidaProgramada;
      } else {
        horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
      }
    } else {
      horasATrabajar = horaSalidaProgramada - horaEntradaProgramada;
    }
    
    let horasDeDescanso = 0;
    if (tieneDescansoAutomatico) {
      // Si hay descanso automático, usar ese valor
      horasDeDescanso = this.convertirHoraAMinutos(descansoAutomatico);
    } else if (tieneDescansoManual && horaEntradaDescanso && horaSalidaDescanso) {
      const entradaDescansoProgramada = this.convertirHoraAMinutos(horaEntradaDescanso);
      const salidaDescansoProgramada = this.convertirHoraAMinutos(horaSalidaDescanso);
      if (esNocturno && salidaDescansoProgramada < entradaDescansoProgramada) {
        horasDeDescanso = (24 * 60 - entradaDescansoProgramada) + salidaDescansoProgramada;
      } else {
        horasDeDescanso = salidaDescansoProgramada - entradaDescansoProgramada;
      }
    }
    
    // Ajustar horas a trabajar: restar el descanso automático si existe
    if (tieneDescansoAutomatico) {
      horasATrabajar = horasATrabajar - horasDeDescanso;
    }
    
    let horasTrabajadas = 0;
    let horasDescansadas = 0;
    
    // Verificar si hay marcajes de descanso válidos (definir antes para usar en toda la función)
    const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajesCalculo.entradaDescanso) && 
                                  this.esMarcajeDescansoValido(marcajesCalculo.salidaDescanso);
    
    const tieneMarcajes = marcajesCalculo.entrada !== 'Sin marcaje' && marcajesCalculo.salida !== 'Sin marcaje' && marcajesCalculo.salida !== 'SNM';
    
    if (tieneMarcajes) {
      const horaEntradaReal = this.convertirHoraAMinutos(marcajesCalculo.entrada);
      const horaSalidaReal = this.convertirHoraAMinutos(marcajesCalculo.salida);
      
      let horasTotales;
      if (esNocturno) {
        if (horaSalidaReal < horaEntradaReal) {
          horasTotales = (24 * 60 - horaEntradaReal) + horaSalidaReal;
        } else {
          horasTotales = horaSalidaReal - horaEntradaReal;
        }
      } else {
        horasTotales = horaSalidaReal - horaEntradaReal;
      }
      
      if (tieneDescansoAutomatico) {
        // Si hay descanso automático
        if (tieneMarcajesDescanso) {
          // Si hay marcajes de descanso válidos, calcular el descanso real
          const entradaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.entradaDescanso);
          const salidaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.salidaDescanso);
          
          // Calcular horas de descanso real considerando cruce de medianoche para turnos nocturnos
          let horasDescansadasReales = 0;
          if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
            horasDescansadasReales = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
          } else {
            horasDescansadasReales = salidaDescansoReal - entradaDescansoReal;
          }
          
          // Horas trabajadas = totales - descansadas reales
          horasTrabajadas = horasTotales - horasDescansadasReales;
          
          // Calcular balance de descanso (diferencia entre descanso real y descanso automático esperado)
          // Este valor se usará para determinar el color
          const balanceDescanso = horasDescansadasReales - horasDeDescanso;
          horasDescansadas = balanceDescanso; // Usar horasDescansadas para el balance
        } else {
          // Si no hay marcajes de descanso, NO se descuenta de las horas trabajadas
          // Las horas trabajadas son el total sin descontar descanso
          horasTrabajadas = horasTotales;
          horasDescansadas = 0; // No se muestra descanso descontado en este caso
        }
      } else if (tieneDescansoManual && marcajesCalculo.entradaDescanso !== 'Sin marcaje' && marcajesCalculo.salidaDescanso !== 'Sin marcaje') {
        const entradaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.entradaDescanso);
        const salidaDescansoReal = this.convertirHoraAMinutos(marcajesCalculo.salidaDescanso);
        
        if (esNocturno && salidaDescansoReal < entradaDescansoReal) {
          horasDescansadas = (24 * 60 - entradaDescansoReal) + salidaDescansoReal;
        } else {
          horasDescansadas = salidaDescansoReal - entradaDescansoReal;
        }
        horasTrabajadas = horasTotales - horasDescansadas;
      } else if (tieneDescansoManual) {
        horasDescansadas = horasDeDescanso;
        horasTrabajadas = horasTotales - horasDescansadas;
      } else {
        horasTrabajadas = horasTotales;
        horasDescansadas = 0;
      }
    }
    
    let claseFondoTrabajadas = '';
    let claseFondoDescansadas = '';
    
    if (tieneMarcajes) {
      // Calcular horas esperadas a trabajar (descontando descanso si hay)
      let horasEsperadasTrabajadas = horasATrabajar;
      
      // Si hay descanso manual, descontar las horas de descanso esperadas
      if (tieneDescansoManual && horasDeDescanso > 0) {
        horasEsperadasTrabajadas = horasATrabajar - horasDeDescanso;
      }
      // Si hay descanso automático, ya se descontó arriba en horasATrabajar
      
      // Comparar horas trabajadas (ya descontadas) vs horas esperadas a trabajar (descontadas)
      if (horasTrabajadas < horasEsperadasTrabajadas) {
        claseFondoTrabajadas = 'bg-calculo-danger';
      } else if (horasTrabajadas > horasEsperadasTrabajadas) {
        claseFondoTrabajadas = 'bg-calculo-success';
      }
      
      // Color de fondo para horas descansadas - solo si hay descanso programado
      if (horasDeDescanso > 0) {
        // Si hay descanso automático Y hay marcajes de descanso válidos, comparar descanso real vs estipulado
        if (tieneDescansoAutomatico && tieneMarcajesDescanso) {
          // horasDescansadas contiene el tiempo real descansado
          // Si descansó MENOR a lo estipulado → verde (bien, descansó menos)
          // Si descansó MAYOR o IGUAL a lo estipulado → rojo (malo, descansó más o igual)
          if (horasDescansadas < horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-success'; // Fondo verde: descansó menos de lo estipulado
          } else {
            claseFondoDescansadas = 'bg-calculo-danger'; // Fondo rojo: descansó más o igual a lo estipulado
          }
        } else if (!tieneDescansoAutomatico) {
          // Para descanso manual, comparar como antes
          if (horasDescansadas > horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-danger';
          } else if (horasDescansadas < horasDeDescanso) {
            claseFondoDescansadas = 'bg-calculo-success';
          }
        }
      }
    }
    
    return { claseTrabajadas: claseFondoTrabajadas, claseDescansadas: claseFondoDescansadas };
  }

  // Validar diferencias de tiempo entre marcajes
  validarDiferenciasTiempo(marcajes: { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string }, bloque: any): { entrada: string, entradaDescanso: string, salidaDescanso: string, salida: string } {
    const resultado = { ...marcajes };

    // Validar que salida tenga al menos 1 hora de diferencia de entrada
    // Validación de diferencia entre entrada y salida ELIMINADA
    // Ya no se marca como SNM si la diferencia es menor a 60 minutos

    // Validaciones de diferencias de tiempo para descansos ELIMINADAS
    // Ya no se marcan como DNM o SDNM si las diferencias son menores a 10 minutos

    return resultado;
  }

  // Encontrar el marcaje más cercano a una hora programada
  encontrarMarcajeMasCercano(marcajesConHoras: any[], horaProgramada: number, marcajesUsados: Set<any>, esNocturno: boolean = false, esHoraSalida: boolean = false, horaEntradaProgramada: number = 0, entradaAsignada: string = ''): string {
    let marcajeMasCercano = null;
    let menorDiferencia = Infinity;

    // Si estamos buscando la salida, hacer dos pasadas: primero prioridad 1, luego prioridad 2
    if (esHoraSalida) {
      // PASADA 1: Buscar solo en marcajes de PRIORIDAD 1
      if (esNocturno) {
        // TURNO NOCTURNO - PRIORIDAD 1: Primer marcaje del día siguiente
        // Solo buscar si hay entrada asignada (base principal)
        if (entradaAsignada && entradaAsignada !== 'Sin marcaje') {
          // Ordenar marcajes del día siguiente por hora
          const marcajesDiaSiguiente = marcajesConHoras
            .filter(m => m.esDelDiaSiguiente && !marcajesUsados.has(m.marcaje))
            .sort((a, b) => a.hora - b.hora);
          
          if (marcajesDiaSiguiente.length > 0) {
            // Para determinar si el primer marcaje del día siguiente es la entrada del día siguiente,
            // necesitamos TODOS los marcajes del día siguiente (incluyendo los usados)
            const todosMarcajesDiaSiguiente = marcajesConHoras
              .filter(m => m.esDelDiaSiguiente)
              .sort((a, b) => a.hora - b.hora);
            
            if (todosMarcajesDiaSiguiente.length > 0) {
              // La entrada del día siguiente es el PRIMER marcaje del día siguiente (si es diurno)
              // o el ÚLTIMO marcaje del día siguiente (si es nocturno)
              // Como no sabemos si el día siguiente es diurno o nocturno, asumimos que es el PRIMER marcaje
              // (como diurno) para la comparación
              const entradaDiaSiguiente = todosMarcajesDiaSiguiente[0];
              const horaEntradaDiaSiguiente = entradaDiaSiguiente.hora;
              const primerMarcajeDisponible = marcajesDiaSiguiente[0];
              const horaPrimerMarcajeDisponible = primerMarcajeDisponible.hora;
              
              // Si hay MÁS de un marcaje disponible del día siguiente, el primero puede ser la salida
              // aunque sea igual a la entrada del día siguiente, porque el segundo marcaje será la entrada
              if (marcajesDiaSiguiente.length > 1) {
                // Hay múltiples marcajes: el primero puede ser salida, el segundo será entrada
                marcajeMasCercano = primerMarcajeDisponible;
              } else {
                // Solo hay UN marcaje disponible del día siguiente
                // Si el marcaje es menor a 12:00 (medianoche), es salida del turno nocturno anterior
                const horaEnMinutos = horaPrimerMarcajeDisponible;
                const medianoche = 12 * 60; // 12:00 en minutos
                
                if (horaEnMinutos < medianoche) {
                  // El marcaje es antes de las 12:00, es salida del turno nocturno
                  marcajeMasCercano = primerMarcajeDisponible;
                } else {
                  // El marcaje es después de las 12:00, verificar si es igual a la entrada del día siguiente
                  if (horaPrimerMarcajeDisponible !== horaEntradaDiaSiguiente) {
                    // El único marcaje disponible NO es igual a la entrada del día siguiente
                    // Entonces SÍ puede ser salida
                    marcajeMasCercano = primerMarcajeDisponible;
                  }
                  // Si el único marcaje disponible ES igual a la entrada del día siguiente,
                  // entonces NO puede ser salida (pasará a PRIORIDAD 2)
                }
              }
            } else {
              // Si no hay marcajes del día siguiente en total, asignar el primer marcaje disponible
              marcajeMasCercano = marcajesDiaSiguiente[0];
            }
          }
        }
      } else {
        // TURNO DIURNO - PRIORIDAD 1: Marcajes del mismo día
        // Solo buscar si hay entrada asignada (base principal)
        if (entradaAsignada && entradaAsignada !== 'Sin marcaje') {
          const horaEntradaAsignada = this.convertirHoraAMinutos(entradaAsignada);
          
          for (const marcajeConHora of marcajesConHoras) {
            if (marcajesUsados.has(marcajeConHora.marcaje)) continue;
            
            // Descartar marcajes del día anterior
            if (marcajeConHora.esDelDiaAnterior) {
              continue;
            }
            
            // TURNO DIURNO - PRIORIDAD 1: Marcajes del mismo día (00:00-23:59, DESPUÉS de la entrada asignada)
            // La salida debe estar en el mismo día y DESPUÉS de la entrada (no igual)
            const esPrioridad1 = !marcajeConHora.esDelDiaSiguiente && marcajeConHora.hora > horaEntradaAsignada;
            
            if (esPrioridad1) {
              const diferencia = Math.abs(marcajeConHora.hora - horaProgramada);
              if (diferencia < menorDiferencia) {
                menorDiferencia = diferencia;
                marcajeMasCercano = marcajeConHora;
              }
            }
          }
        }
      }
      
      // Si encontramos uno de prioridad 1, retornarlo
      if (marcajeMasCercano) {
        marcajesUsados.add(marcajeMasCercano.marcaje);
        return this.formatearHora(new Date(marcajeMasCercano.marcaje.event_time).toTimeString().split(' ')[0]);
      }
      
      // PASADA 2: Si no encontramos de prioridad 1, buscar en PRIORIDAD 2
      // Para NOCTURNO: solo buscar en el mismo día si NO hay marcajes del día siguiente disponibles
      // Para DIURNO: buscar en el primer marcaje del día siguiente
      if (!esNocturno) {
        // TURNO DIURNO - PRIORIDAD 2: Primer marcaje del día siguiente
        // Solo buscar si hay entrada asignada (base principal)
        if (entradaAsignada && entradaAsignada !== 'Sin marcaje') {
          // Ordenar marcajes del día siguiente por hora
          const marcajesDiaSiguiente = marcajesConHoras
            .filter(m => m.esDelDiaSiguiente && !marcajesUsados.has(m.marcaje))
            .sort((a, b) => a.hora - b.hora);
          
          if (marcajesDiaSiguiente.length > 0) {
            // Tomar el primer marcaje del día siguiente como posible salida
            const primerMarcajeDiaSiguiente = marcajesDiaSiguiente[0];
            
            // Calcular la entrada del día siguiente: el primer marcaje del día siguiente
            // (usando TODOS los marcajes del día siguiente, no solo los no usados)
            const todosMarcajesDiaSiguiente = marcajesConHoras
              .filter(m => m.esDelDiaSiguiente)
              .sort((a, b) => a.hora - b.hora);
            
            if (todosMarcajesDiaSiguiente.length > 0) {
              const entradaDiaSiguiente = todosMarcajesDiaSiguiente[0];
              const horaEntradaDiaSiguiente = entradaDiaSiguiente.hora;
              const horaPrimerMarcaje = primerMarcajeDiaSiguiente.hora;
              
              // Verificar si el primer marcaje del día siguiente es igual a la entrada del día siguiente
              // Si son iguales (misma hora), NO puede ser salida del día anterior
              if (horaPrimerMarcaje === horaEntradaDiaSiguiente) {
                // El primer marcaje del día siguiente es la entrada del día siguiente
                // Por lo tanto, NO puede ser salida del día anterior
                marcajeMasCercano = null;
              } else {
                // El primer marcaje del día siguiente NO es igual a la entrada del día siguiente
                // (esto significa que la entrada del día siguiente es otro marcaje diferente)
                // Entonces el primer marcaje SÍ puede ser salida del día anterior
                marcajeMasCercano = primerMarcajeDiaSiguiente;
              }
            }
          }
        }
      } else {
        // TURNO NOCTURNO - PRIORIDAD 2: Marcajes del mismo día de la entrada
        // SOLO si NO se encontró salida en el día siguiente (prioridad 1)
        // Solo buscar si hay entrada asignada (base principal)
        if (entradaAsignada && entradaAsignada !== 'Sin marcaje') {
          // Verificar primero si realmente no hay marcajes del día siguiente disponibles
          const hayMarcajesDiaSiguiente = marcajesConHoras.some(m => 
            m.esDelDiaSiguiente && 
            !marcajesUsados.has(m.marcaje)
          );
          
          // Solo buscar en el mismo día si NO hay marcajes del día siguiente disponibles
          if (!hayMarcajesDiaSiguiente) {
            const horaEntradaAsignada = this.convertirHoraAMinutos(entradaAsignada);
            
            for (const marcajeConHora of marcajesConHoras) {
              if (marcajesUsados.has(marcajeConHora.marcaje)) continue;
              
              // Descartar marcajes del día anterior
              if (marcajeConHora.esDelDiaAnterior) {
                continue;
              }
              
              // Descartar marcajes del día siguiente (ya se buscaron en prioridad 1)
              if (marcajeConHora.esDelDiaSiguiente) {
                continue;
              }
              
              // La salida debe ser del mismo día, DESPUÉS de la entrada (no antes) y NO puede ser igual a la entrada
              if (marcajeConHora.hora > horaEntradaAsignada) {
                const diferencia = Math.abs(marcajeConHora.hora - horaProgramada);
                if (diferencia < menorDiferencia) {
                  menorDiferencia = diferencia;
                  marcajeMasCercano = marcajeConHora;
                }
              }
            }
          }
        }
      }
    } else {
      // Para entrada (nocturno o diurno), calcular diferencia normal sin prioridades
      for (const marcajeConHora of marcajesConHoras) {
        if (marcajesUsados.has(marcajeConHora.marcaje)) continue;
        
        const diferencia = Math.abs(marcajeConHora.hora - horaProgramada);
        if (diferencia < menorDiferencia) {
          menorDiferencia = diferencia;
          marcajeMasCercano = marcajeConHora;
        }
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
        const tieneDescansoAutomatico = !!plantillaHorario?.descanso_automatico;
        
        if (tieneDescanso && horaEntradaDescanso && horaSalidaDescanso) {
          const entradaDescanso = this.formatearHora(horaEntradaDescanso);
          const salidaDescanso = this.formatearHora(horaSalidaDescanso);
          resultado = `${horaEntrada} - ${entradaDescanso} - ${salidaDescanso} - ${horaSalida}`;
        } else if (tieneDescansoAutomatico) {
          // Con descanso automático, mostrar etiqueta "Desc Auto"
          resultado = `${horaEntrada} - Desc Auto - ${horaSalida}`;
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
        const tieneDescansoAutomatico2 = !!plantillaDescanso?.descanso_automatico;
        
        // Verificar si hay marcajes de descanso válidos (entrada y salida de descanso)
        const tieneMarcajesDescanso = this.esMarcajeDescansoValido(marcajesDescanso.entradaDescanso) && 
                                      this.esMarcajeDescansoValido(marcajesDescanso.salidaDescanso);
        
        if (marcajesDescanso.entrada !== 'Sin marcaje' && marcajesDescanso.salida !== 'Sin marcaje') {
          // Si hay descanso automático, verificar primero si hay marcajes válidos
          if (tieneDescansoAutomatico2) {
            // Con descanso automático: verificar si hay marcajes de descanso válidos
            if (tieneMarcajesDescanso) {
              // Si hay marcajes de descanso válidos, mostrar ambos como descanso manual
              resultado = `${marcajesDescanso.entrada} - ${marcajesDescanso.entradaDescanso} - ${marcajesDescanso.salidaDescanso} - ${marcajesDescanso.salida}`;
            } else {
              // Si no hay marcajes de descanso válidos, mostrar "Desc Auto" (solo entrada y salida)
              // Si la salida es SNM, tratarla como "Sin marcaje"
              if (marcajesDescanso.salida === 'SNM' || marcajesDescanso.salida === 'Sin marcaje') {
                resultado = marcajesDescanso.entrada; // Solo mostrar entrada
              } else {
                resultado = `${marcajesDescanso.entrada} - Desc Auto - ${marcajesDescanso.salida}`;
              }
            }
          } else if (tieneDescansoPlantilla) {
            // Si hay descanso programado (manual)
            // Si hay DNM o SDNM, tratarlos como "Sin marcaje"
            if (marcajesDescanso.entradaDescanso === 'DNM' || marcajesDescanso.salidaDescanso === 'DNM' || 
                marcajesDescanso.salidaDescanso === 'SDNM' ||
                marcajesDescanso.entradaDescanso === 'Sin marcaje' || marcajesDescanso.salidaDescanso === 'Sin marcaje') {
              // Si no hay descanso válido, mostrar solo entrada y salida (sin descanso)
              if (marcajesDescanso.salida === 'SNM' || marcajesDescanso.salida === 'Sin marcaje') {
                resultado = marcajesDescanso.entrada; // Solo mostrar entrada
              } else {
                resultado = `${marcajesDescanso.entrada} - Sin descanso - ${marcajesDescanso.salida}`;
              }
            } else {
              resultado = `${marcajesDescanso.entrada} - ${marcajesDescanso.entradaDescanso} - ${marcajesDescanso.salidaDescanso} - ${marcajesDescanso.salida}`;
            }
          } else {
            // Sin descanso de ningún tipo
            // Si la salida es SNM, tratarla como "Sin marcaje"
            if (marcajesDescanso.salida === 'SNM' || marcajesDescanso.salida === 'Sin marcaje') {
              resultado = marcajesDescanso.entrada; // Solo mostrar entrada
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
    const empleadoIdAnterior = this.empleadoSeleccionado?.id;
    
    this.mostrarModal = false;
    this.empleadoSeleccionado = null;
    this.horariosDisponibles = [];
    this.horariosEmpleado = [];
    this.resetearFormulario();
    
    // Si se cerró el modal después de hacer cambios, refrescar los datos del empleado afectado
    // para asegurar que la vista principal muestre los datos actualizados
    if (empleadoIdAnterior && this.hasSearched) {
      if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
        // Recargar datos del empleado para asegurar consistencia
        this.recargarDatosEmpleado(empleadoIdAnterior);
      } else if (this.empleados.length > 0) {
        // Si no hay datos completos, al menos regenerar días y reagrupar
        if (this.fechaDesde && this.fechaHasta) {
          this.generarDiasDelMes();
          this.generarMesesAgrupados();
        }
        this.agruparEmpleados();
      }
    }
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
        this.excepcionesCompletas.delete(key);
        
        // Recargar la lista de excepciones del empleado en el modal para asegurar que esté actualizada
        if (this.mostrarModal && this.empleadoSeleccionado?.id) {
          this.cargarExcepcionesEmpleado();
        }
        
        // Si tenemos datos completos cargados, recargar los datos del empleado afectado
        if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0 && this.empleadoSeleccionado?.id) {
          this.recargarDatosEmpleado(this.empleadoSeleccionado.id);
        } else {
          // Si no, solo refrescar agrupación
          this.agruparEmpleados();
        }
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

        // Recalcular la fecha mínima permitida después de agregar un nuevo horario
        this.calcularFechaMinimaPermitida();
        
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
        
        // Recalcular la fecha mínima permitida después de eliminar
        this.calcularFechaMinimaPermitida();
        
        // Si el formulario tiene una fecha que ya no es válida, resetearla
        if (this.nuevoHorario.primer_dia && this.fechaMinimaPermitida) {
          const fechaFormulario = new Date(this.nuevoHorario.primer_dia);
          const fechaMinima = new Date(this.fechaMinimaPermitida);
          if (fechaFormulario < fechaMinima) {
            this.nuevoHorario.primer_dia = '';
          }
        }
        
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
      
      // Si tenemos datos completos cargados, recargar los datos del empleado afectado
      if (this.selectedSalaForDataLoad && this.empleadosCompletos.length > 0) {
        this.recargarDatosEmpleado(this.empleadoSeleccionado.id);
      }
    }
    // Regenerar días (por si cambió el rango con el botón Filtrar) y reagrupar
    this.generarDiasDelMes();
    this.agruparEmpleados();
  }

  // Recargar datos del empleado afectado después de crear/eliminar horarios o excepciones
  recargarDatosEmpleado(empleadoId: number) {
    if (!empleadoId) return;
    
    // Si el modal está abierto y es el mismo empleado, también actualizar los horarios del modal
    const esEmpleadoDelModal = this.mostrarModal && this.empleadoSeleccionado?.id === empleadoId;
    
    // Recargar horarios del empleado en empleadosCompletos
    const empleadoCompleto = this.empleadosCompletos.find(e => e.id === empleadoId);
    if (empleadoCompleto) {
      this.empleadosService.getHorariosEmpleado(empleadoId).subscribe({
        next: (horarios) => {
          empleadoCompleto.horariosEmpleado = horarios || [];
          
          // Si el modal está abierto para este empleado, actualizar también los horarios del modal
          if (esEmpleadoDelModal) {
            this.horariosEmpleado = horarios || [];
            // Recalcular la fecha mínima permitida para el formulario
            this.calcularFechaMinimaPermitida();
            // Si el formulario tiene una fecha que ya no es válida, resetearla
            if (this.nuevoHorario.primer_dia && this.fechaMinimaPermitida) {
              const fechaFormulario = new Date(this.nuevoHorario.primer_dia);
              const fechaMinima = new Date(this.fechaMinimaPermitida);
              if (fechaFormulario < fechaMinima) {
                this.nuevoHorario.primer_dia = '';
              }
            }
          }
          
          // Recargar excepciones completas para actualizar el mapa
          this.cargarExcepcionesCompletas().then(() => {
            // Recalcular fechas límite si es necesario
            this.calcularFechasLimiteCompletas().then(() => {
              // Aplicar filtros locales para actualizar la vista
              this.aplicarFiltrosLocales();
            });
          });
        },
        error: () => {
          empleadoCompleto.horariosEmpleado = [];
          
          // Si el modal está abierto para este empleado, actualizar también los horarios del modal
          if (esEmpleadoDelModal) {
            this.horariosEmpleado = [];
            this.fechaMinimaPermitida = '';
            // Resetear el formulario si no hay horarios
            if (this.nuevoHorario.primer_dia) {
              this.nuevoHorario.primer_dia = '';
            }
          }
          
          // Aún así, recargar excepciones y aplicar filtros
          this.cargarExcepcionesCompletas().then(() => {
            this.aplicarFiltrosLocales();
          });
        }
      });
    } else {
      // Si no está en empleadosCompletos, solo recargar excepciones
      this.cargarExcepcionesCompletas().then(() => {
        this.aplicarFiltrosLocales();
      });
    }
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

  // Cargar feriados para el cálculo de resumen
  async cargarFeriados(): Promise<void> {
    return new Promise((resolve) => {
      this.feriadosService.getFeriados().subscribe({
        next: (feriados: any[]) => {
          this.feriados = feriados || [];
          resolve();
        },
        error: () => {
          this.feriados = [];
          resolve();
        }
      });
    });
  }

  // Cargar plantillas libres (sin hora_entrada ni hora_salida) para el cálculo de resumen
  // Optimización: Si hay sala seleccionada, cargar solo las plantillas de esa sala
  async cargarPlantillasLibres(salaId?: number): Promise<void> {
    return new Promise((resolve) => {
      // Si hay sala seleccionada, cargar solo las plantillas de esa sala
      const observable = salaId 
        ? this.plantillasService.getPlantillasHorariosBySala(salaId)
        : this.plantillasService.getPlantillasHorarios();
      
      observable.subscribe({
        next: (plantillas: any[]) => {
          // Filtrar solo las plantillas que no tienen hora_entrada ni hora_salida
          this.plantillasLibres = (plantillas || []).filter((p: any) => 
            !p.hora_entrada && !p.hora_salida
          );
          resolve();
        },
        error: () => {
          this.plantillasLibres = [];
          resolve();
        }
      });
    });
  }

  // Verificar si una fecha es feriado (validando la tabla de feriados de la sala asociada)
  esFeriado(fecha: Date, salaId: number): boolean {
    if (!salaId || !this.feriados || this.feriados.length === 0) {
      return false;
    }
    
    const fechaStr = this.formatDateLocalYYYYMMDD(fecha);
    
    // Buscar en la tabla de feriados de la sala asociada
    return this.feriados.some(f => {
      if (!f.sala_id || f.sala_id !== salaId) {
        return false;
      }
      
      // Formatear la fecha del feriado de manera consistente
      let feriadoFecha = '';
      if (f.fecha) {
        // Si es string, usarlo directamente; si es Date, formatearlo
        if (typeof f.fecha === 'string') {
          feriadoFecha = f.fecha.split('T')[0]; // Remover hora si existe
        } else {
          feriadoFecha = this.formatDateLocalYYYYMMDD(new Date(f.fecha));
        }
      }
      
      return feriadoFecha === fechaStr;
    });
  }

  // Verificar si una plantilla es día libre (sin hora_entrada ni hora_salida)
  esDiaLibre(bloque: any): boolean {
    if (!bloque) return false;
    const plantilla = bloque.PlantillaHorario;
    if (!plantilla) return false;
    // Día libre: no tiene hora_entrada ni hora_salida
    return !plantilla.hora_entrada && !plantilla.hora_salida;
  }

  // Obtener sala_id de un empleado
  getSalaId(empleado: any): number | null {
    return empleado?.Cargo?.Area?.Departamento?.Sala?.id || 
           empleado?.Cargo?.Area?.Departamento?.sala_id || 
           null;
  }

  // Calcular resumen: Días Diurnos Trabajados (por empleado) - basado en el campo Resultado
  getResumenDiasDiurnosTrabajadosPorEmpleado(empleado: any): number {
    let count = 0;
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          const resultadoHtml = this.getResultadoTurno(empleado, dia);
          // Convertir SafeHtml a string para verificar contenido
          const resultadoStr = resultadoHtml ? String(resultadoHtml).toUpperCase() : '';
          
          // Verificar si es mixto (contiene tanto ( D ) como ( N ))
          const esMixto = resultadoStr.includes('( D )') && resultadoStr.includes('( N )');
          
          // SOLO contar turnos DIURNOS PUROS (no mixtos)
          // Un turno diurno puro contiene "DIURNO" pero NO es mixto
          if (!esMixto && resultadoStr.includes('DIURNO')) {
            count++;
          }
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Días Nocturnos Trabajados (por empleado) - basado en el campo Resultado
  getResumenDiasNocturnosTrabajadosPorEmpleado(empleado: any): number {
    let count = 0;
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          const resultadoHtml = this.getResultadoTurno(empleado, dia);
          // Convertir SafeHtml a string para verificar contenido
          const resultadoStr = resultadoHtml ? String(resultadoHtml).toUpperCase() : '';
          
          // Verificar si es mixto (contiene tanto ( D ) como ( N ))
          const esMixto = resultadoStr.includes('( D )') && resultadoStr.includes('( N )');
          
          // SOLO contar turnos NOCTURNOS PUROS (no mixtos)
          // Un turno nocturno puro contiene "NOCTURNO" pero NO es mixto
          if (!esMixto && resultadoStr.includes('NOCTURNO')) {
            count++;
          }
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Horas Diurnos (por empleado) - SOLO de turnos mixtos
  getResumenHorasDiurnosPorEmpleado(empleado: any): string {
    let totalMinutos = 0;
    const HORA_DIURNO_INICIO = 5 * 60; // 5:00 = 300 minutos
    const HORA_DIURNO_FIN = 19 * 60; // 19:00 = 1140 minutos
    const HORA_NOCTURNO_FIN = 23 * 60; // 23:00 = 1380 minutos
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
          // Verificar si tiene marcajes válidos
          if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
            const entradaMinutos = this.convertirHoraAMinutos(marcajes.entrada);
            const salidaMinutos = this.convertirHoraAMinutos(marcajes.salida);
            
            if (!isNaN(entradaMinutos) && !isNaN(salidaMinutos)) {
              // Verificar si es mixto
              const esMixto = entradaMinutos >= HORA_DIURNO_INICIO && 
                entradaMinutos < HORA_DIURNO_FIN &&
                salidaMinutos > HORA_DIURNO_FIN && 
                salidaMinutos <= HORA_NOCTURNO_FIN;
              
              // SOLO contar horas de turnos mixtos
              if (esMixto) {
                // Para mixtos: horas diurnas = desde entrada hasta 19:00
                const horasDiurnasMixto = HORA_DIURNO_FIN - entradaMinutos;
                totalMinutos += horasDiurnasMixto;
              }
            }
          }
        }
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }

  // Calcular resumen: Horas Nocturno (por empleado) - SOLO de turnos mixtos
  getResumenHorasNocturnoPorEmpleado(empleado: any): string {
    let totalMinutos = 0;
    const HORA_DIURNO_INICIO = 5 * 60; // 5:00 = 300 minutos
    const HORA_DIURNO_FIN = 19 * 60; // 19:00 = 1140 minutos
    const HORA_NOCTURNO_FIN = 23 * 60; // 23:00 = 1380 minutos
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
          // Verificar si tiene marcajes válidos
          if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
            const entradaMinutos = this.convertirHoraAMinutos(marcajes.entrada);
            const salidaMinutos = this.convertirHoraAMinutos(marcajes.salida);
            
            if (!isNaN(entradaMinutos) && !isNaN(salidaMinutos)) {
              // Verificar si es mixto
              const esMixto = entradaMinutos >= HORA_DIURNO_INICIO && 
                entradaMinutos < HORA_DIURNO_FIN &&
                salidaMinutos > HORA_DIURNO_FIN && 
                salidaMinutos <= HORA_NOCTURNO_FIN;
              
              // SOLO contar horas de turnos mixtos
              if (esMixto) {
                // Para mixtos: horas nocturnas = desde 19:00 hasta salida
                const horasNocturnasMixto = salidaMinutos - HORA_DIURNO_FIN;
                totalMinutos += horasNocturnasMixto;
              }
            }
          }
        }
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }

  // Calcular resumen: Días Domingos Trabajados (por empleado) - si tiene registro de diurno, nocturno o mixto
  getResumenDomingosTrabajadosPorEmpleado(empleado: any): number {
    let count = 0;
    
    this.diasDelMes.forEach(dia => {
      // Verificar si es domingo (getDay() === 0)
      if (dia.getDay() === 0) {
        // Verificar si el empleado trabajó ese día (tiene marcajes de diurno, nocturno o mixto)
        if (!this.isSinHorario(empleado, dia)) {
          const bloque = this.getBloqueHorario(empleado, dia);
          if (bloque) {
            const resultadoHtml = this.getResultadoTurno(empleado, dia);
            // Si tiene resultado (DIURNO, NOCTURNO o MIXTO), trabajó
            if (resultadoHtml) {
              const resultadoStr = String(resultadoHtml).toUpperCase();
              // Verificar si contiene DIURNO, NOCTURNO o es mixto (contiene ( D ) o ( N ))
              if (resultadoStr.includes('DIURNO') || resultadoStr.includes('NOCTURNO') || 
                  resultadoStr.includes('( D )') || resultadoStr.includes('( N )')) {
                count++;
              }
            }
          }
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Días Domingos Trabajados (total global - para compatibilidad)
  getResumenDomingosTrabajados(): number {
    let count = 0;
    const empleadosBase = this.obtenerBaseEmpleados();
    
    empleadosBase.forEach(empleado => {
      count += this.getResumenDomingosTrabajadosPorEmpleado(empleado);
    });
    
    return count;
  }

  // Calcular resumen: Días trabajados por una plantilla específica sin hora_entrada ni hora_salida
  // Cuenta incluso si no tiene marcajes (como las plantillas "L" con "Sin Registros")
  getResumenDiasPorPlantillaSinHoras(empleado: any, plantillaId: number): number {
    let count = 0;
    
    this.diasDelMes.forEach(dia => {
      const bloque = this.getBloqueHorario(empleado, dia);
      if (bloque && this.esDiaLibre(bloque)) {
        // Es plantilla sin hora_entrada ni hora_salida
        const bloquePlantillaId = bloque?.PlantillaHorario?.id;
        // Verificar si coincide con la plantilla buscada
        if (bloquePlantillaId === plantillaId) {
          // Contar el día si tiene la plantilla asignada (incluso sin marcajes)
          // Esto incluye casos como "L" con "Sin Registros"
          count++;
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Plantillas sin hora entrada/salida (por empleado) - para compatibilidad
  getResumenLibresTrabajadosPorEmpleado(empleado: any): string {
    // Si no hay plantillas sin hora_entrada ni hora_salida, retornar vacío
    if (!this.plantillasLibres || this.plantillasLibres.length === 0) {
      return '';
    }

    // Crear un mapa para contar días trabajados por cada plantilla (usando id como clave)
    const diasPorPlantilla: Map<number, { nombre: string, dias: number }> = new Map();
    
    // Inicializar TODAS las plantillas sin hora_entrada ni hora_salida con 0
    this.plantillasLibres.forEach((plantilla: any) => {
      const nombre = plantilla.nombre || '';
      const id = plantilla.id;
      if (nombre && id) {
        diasPorPlantilla.set(id, { nombre, dias: 0 });
      }
    });

    // Contar días trabajados por cada plantilla
    this.diasDelMes.forEach(dia => {
      const bloque = this.getBloqueHorario(empleado, dia);
      if (bloque && this.esDiaLibre(bloque)) {
        // Es plantilla sin hora_entrada ni hora_salida
        const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
        // Si tiene marcajes, trabajó
        if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
          const plantillaId = bloque?.PlantillaHorario?.id;
          if (plantillaId && diasPorPlantilla.has(plantillaId)) {
            const plantillaData = diasPorPlantilla.get(plantillaId);
            if (plantillaData) {
              plantillaData.dias = (plantillaData.dias || 0) + 1;
            }
          }
        }
      }
    });

    // Construir el string mostrando TODAS las plantillas sin hora_entrada ni hora_salida
    // Formato: "Libre: 2, Vacaciones: 0, Feriado: 1" (mostrando todas, incluso con 0 días)
    const resultados: string[] = [];
    diasPorPlantilla.forEach((data) => {
      resultados.push(`${data.nombre}: ${data.dias}`);
    });

    return resultados.length > 0 ? resultados.join(', ') : '';
  }

  // Calcular resumen: Días Libres Trabajados (por empleado) - para compatibilidad
  getResumenDiasLibresTrabajadosPorEmpleado(empleado: any): number {
    let count = 0;
    
    this.diasDelMes.forEach(dia => {
      const bloque = this.getBloqueHorario(empleado, dia);
      if (bloque && this.esDiaLibre(bloque)) {
        // Es día libre (plantilla sin hora_entrada ni hora_salida)
        const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
        // Si tiene marcajes, trabajó en día libre
        if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
          count++;
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Días Libres Trabajados (total global - para compatibilidad)
  getResumenDiasLibresTrabajados(): number {
    let count = 0;
    const empleadosBase = this.obtenerBaseEmpleados();
    
    empleadosBase.forEach(empleado => {
      count += this.getResumenDiasLibresTrabajadosPorEmpleado(empleado);
    });
    
    return count;
  }

  // Calcular resumen: Totales de Nocturnos Trabajadas (horas) (por empleado)
  getResumenNocturnosTrabajadasPorEmpleado(empleado: any): string {
    let totalMinutos = 0;
    const HORA_DIURNO_INICIO = 5 * 60; // 5:00 = 300 minutos
    const HORA_DIURNO_FIN = 19 * 60; // 19:00 = 1140 minutos
    const HORA_NOCTURNO_FIN = 23 * 60; // 23:00 = 1380 minutos
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          // Verificar si es turno NOCTURNO (usar la propiedad turno del bloque)
          const esNocturno = bloque.turno === 'NOCTURNO';
          
          if (esNocturno) {
            const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
            // Verificar si tiene marcajes válidos
            if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
              const entradaMinutos = this.convertirHoraAMinutos(marcajes.entrada);
              const salidaMinutos = this.convertirHoraAMinutos(marcajes.salida);
              
              if (!isNaN(entradaMinutos) && !isNaN(salidaMinutos)) {
                // Verificar que NO sea mixto (los mixtos se calculan en otro método)
                // Es mixto si: entrada entre 5:00 y 19:00, y salida > 19:00 pero <= 23:00
                const esMixto = entradaMinutos >= HORA_DIURNO_INICIO && 
                  entradaMinutos < HORA_DIURNO_FIN &&
                  salidaMinutos > HORA_DIURNO_FIN && 
                  salidaMinutos <= HORA_NOCTURNO_FIN;
                
                // Solo contar turnos nocturnos puros (no mixtos)
                if (!esMixto) {
                  // Calcular horas trabajadas
                  const valores = this.getCalculoValores(empleado, dia, bloque);
                  const horasTrabajadas = this.convertirHoraAMinutos(valores.horasTrabajadas);
                  if (!isNaN(horasTrabajadas)) {
                    totalMinutos += horasTrabajadas;
                  }
                }
              }
            }
          }
        }
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }

  // Calcular resumen: Totales de Nocturnos Trabajadas (horas) (total global - para compatibilidad)
  getResumenNocturnosTrabajadas(): string {
    let totalMinutos = 0;
    const empleadosBase = this.obtenerBaseEmpleados();
    
    empleadosBase.forEach(empleado => {
      const horasStr = this.getResumenNocturnosTrabajadasPorEmpleado(empleado);
      const minutos = this.convertirHoraAMinutos(horasStr);
      if (!isNaN(minutos)) {
        totalMinutos += minutos;
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }

  // Calcular resumen: Totales de Feriados Trabajados (días) (por empleado) - si trabajó ese día
  // Valida la tabla de feriados de la sala asociada y verifica si hay registros/marcajes en fechas feriadas
  getResumenFeriadosTrabajadosPorEmpleado(empleado: any): number {
    let count = 0;
    const salaId = this.getSalaId(empleado);
    if (!salaId) return 0;
    
    this.diasDelMes.forEach(dia => {
      // Validar si es feriado en la tabla de feriados de la sala asociada
      if (this.esFeriado(dia, salaId)) {
        // Es feriado - verificar si hay registros/marcajes (trabajó ese día)
        if (!this.isSinHorario(empleado, dia)) {
          const bloque = this.getBloqueHorario(empleado, dia);
          if (bloque) {
            // Verificar si hay marcajes reales (entrada y salida)
            const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
            const tieneMarcajes = marcajes.entrada !== 'Sin marcaje' && 
                                  marcajes.salida !== 'Sin marcaje' && 
                                  marcajes.salida !== 'SNM';
            
            if (tieneMarcajes) {
              // Hay registros/marcajes en fecha feriada - incrementar contador
              const resultadoHtml = this.getResultadoTurno(empleado, dia);
              // Verificar que tenga resultado válido (DIURNO, NOCTURNO o MIXTO)
              if (resultadoHtml) {
                const resultadoStr = String(resultadoHtml).toUpperCase();
                // Verificar si contiene DIURNO, NOCTURNO o es mixto (contiene ( D ) o ( N ))
                if (resultadoStr.includes('DIURNO') || resultadoStr.includes('NOCTURNO') || 
                    resultadoStr.includes('( D )') || resultadoStr.includes('( N )')) {
                  count++;
                }
              }
            }
          }
        }
      }
    });
    
    return count;
  }

  // Calcular resumen: Totales de Feriados Trabajados (días) (total global - para compatibilidad)
  getResumenFeriadosTrabajados(): number {
    let count = 0;
    const empleadosBase = this.obtenerBaseEmpleados();
    
    empleadosBase.forEach(empleado => {
      count += this.getResumenFeriadosTrabajadosPorEmpleado(empleado);
    });
    
    return count;
  }

  // Calcular resumen: Totales de Horas Nocturnas Trabajadas de los Mixtos Totales (por empleado)
  getResumenHorasNocturnasMixtosPorEmpleado(empleado: any): string {
    let totalMinutos = 0;
    const HORA_DIURNO_INICIO = 5 * 60; // 5:00 = 300 minutos
    const HORA_DIURNO_FIN = 19 * 60; // 19:00 = 1140 minutos
    const HORA_NOCTURNO_FIN = 23 * 60; // 23:00 = 1380 minutos
    
    this.diasDelMes.forEach(dia => {
      if (!this.isSinHorario(empleado, dia)) {
        const bloque = this.getBloqueHorario(empleado, dia);
        if (bloque) {
          const marcajes = this.calcularMarcajesDelDia(empleado, dia, bloque);
          // Verificar si tiene marcajes válidos
          if (marcajes.entrada !== 'Sin marcaje' && marcajes.salida !== 'Sin marcaje' && marcajes.salida !== 'SNM') {
            const entradaMinutos = this.convertirHoraAMinutos(marcajes.entrada);
            const salidaMinutos = this.convertirHoraAMinutos(marcajes.salida);
            
            if (!isNaN(entradaMinutos) && !isNaN(salidaMinutos)) {
              // Verificar si es MIXTO
              // Es mixto si: entrada entre 5:00 y 19:00, y salida > 19:00 pero <= 23:00
              const esMixto = entradaMinutos >= HORA_DIURNO_INICIO && 
                entradaMinutos < HORA_DIURNO_FIN &&
                salidaMinutos > HORA_DIURNO_FIN && 
                salidaMinutos <= HORA_NOCTURNO_FIN;
              
              if (esMixto) {
                // Calcular horas nocturnas: desde 19:00 hasta salida
                const horasNocturnas = salidaMinutos - HORA_DIURNO_FIN;
                totalMinutos += horasNocturnas;
              }
            }
          }
        }
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }

  // Calcular resumen: Totales de Horas Nocturnas Trabajadas de los Mixtos Totales (total global - para compatibilidad)
  getResumenHorasNocturnasMixtos(): string {
    let totalMinutos = 0;
    const empleadosBase = this.obtenerBaseEmpleados();
    
    empleadosBase.forEach(empleado => {
      const horasStr = this.getResumenHorasNocturnasMixtosPorEmpleado(empleado);
      const minutos = this.convertirHoraAMinutos(horasStr);
      if (!isNaN(minutos)) {
        totalMinutos += minutos;
      }
    });
    
    return this.formatearMinutosAHora(totalMinutos);
  }
}

