import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService, Empleado } from '../../../services/empleados.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';

interface EmpleadoForm {
  id: number | null;
  foto: string;
  nombre: string;
  cedula: string;
  cedula_tipo: string; // V o E
  fecha_ingreso: string;
  fecha_cumpleanos: string;
  sexo: string;
  cargo_id: number | null;
  dispositivos: number[];
}
import { BiometricImageService } from '../../../services/biometric-image.service';
import { ImageValidationService } from '../../../services/image-validation.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { TareasAutomaticasService } from '../../../services/tareas-automaticas.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription, firstValueFrom } from 'rxjs';
import { take, filter } from 'rxjs/operators';

@Component({
  selector: 'app-empleados-list',
  imports: [CommonModule, FormsModule],
  template: `
    <div class="empleados-container">
      <div class="header">
        <button 
          class="btn btn-success" 
          [class.disabled]="!canAdd()"
          [disabled]="!canAdd()"
          (click)="canAdd() ? showCargoSelector() : null">
          Agregar
        </button>
        <button 
          class="btn btn-info position-relative" 
          [disabled]="!tareasCount || tareasCount === 0"
          (click)="goToTareas()">
          Ver Tareas
          <span *ngIf="tareasCount > 0" class="badge bg-danger position-absolute top-0 start-100 translate-middle">
            {{ tareasCount }}
          </span>
        </button>
      </div>
      
      <!-- Filtro de empleados -->
      <div class="filter-container" *ngIf="!loading">
        <div class="search-input-wrapper">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Buscar empleados por nombre, cédula, cargo..." 
            [(ngModel)]="filtroTexto"
            (input)="aplicarFiltro()">
        </div>
      </div>
      
      <div *ngIf="loading" class="loading-indicator">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p>Cargando empleados...</p>
      </div>
      
      <div class="table-wrapper" *ngIf="!loading">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th (click)="sortBy('nombre')" class="sortable-header" title="Haz clic para ordenar">
                Nombre
                <span class="sort-icon">{{ sortColumn === 'nombre' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </th>
              <th (click)="sortBy('cedula')" class="sortable-header" title="Haz clic para ordenar">
                Cédula
                <span class="sort-icon">{{ sortColumn === 'cedula' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </th>
              <th (click)="sortBy('cargo')" class="sortable-header" title="Haz clic para ordenar">
                Cargo
                <span class="sort-icon">{{ sortColumn === 'cargo' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </th>
              <th (click)="sortBy('edad')" class="sortable-header" title="Haz clic para ordenar">
                Edad
                <span class="sort-icon">{{ sortColumn === 'edad' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </th>
              <th (click)="sortBy('antiguedad')" class="sortable-header" title="Haz clic para ordenar">
                Antigüedad
                <span class="sort-icon">{{ sortColumn === 'antiguedad' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕' }}</span>
              </th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleadosFiltrados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img 
                  *ngIf="empleado.foto" 
                  [src]="'data:image/jpeg;base64,' + empleado.foto" 
                  alt="Foto del empleado"
                  class="employee-photo clickable-photo"
                  (click)="verDetalleEmpleado(empleado)"
                  title="Haz clic para ver detalles"
                />
                <span *ngIf="!empleado.foto" class="no-photo clickable-photo" (click)="verDetalleEmpleado(empleado)" title="Haz clic para ver detalles">Sin foto</span>
              </td>
              <td>{{ empleado.nombre }}</td>
              <td>{{ empleado.cedula }}</td>
              <td>{{ empleado.Cargo?.nombre || 'Sin asignar' }}</td>
              <td class="text-center">
                <span class="edad-badge">{{ calcularEdad(empleado.fecha_cumpleanos) }}</span>
              </td>
              <td class="text-center">
                <span class="antiguedad-badge">{{ calcularAntiguedad(empleado.fecha_ingreso) }}</span>
              </td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editEmpleado(empleado) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-warning btn-sm me-1" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? borrarEmpleado(empleado.id) : null">
                  Borrar empleado
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete()"
                  [disabled]="!canDelete()"
                  (click)="canDelete() ? deleteEmpleado(empleado.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="empleadosFiltrados.length === 0" class="no-data">
        <p *ngIf="filtroTexto">No se encontraron empleados que coincidan con "{{ filtroTexto }}"</p>
        <p *ngIf="!filtroTexto">No hay empleados registrados</p>
      </div>

      <!-- Modal para ver detalles del empleado -->
      <div *ngIf="showDetalleModal" class="modal-overlay" (click)="closeDetalleModal()">
        <div class="modal-content detalle-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalles del Empleado</h3>
            <button class="close-btn" (click)="closeDetalleModal()">&times;</button>
          </div>
          <div class="modal-body detalle-body">
            <div *ngIf="empleadoDetalle" class="detalle-container">
              <!-- Foto del empleado -->
              <div class="detalle-foto-section">
                <img 
                  *ngIf="empleadoDetalle.foto" 
                  [src]="'data:image/jpeg;base64,' + empleadoDetalle.foto" 
                  alt="Foto del empleado"
                  class="detalle-foto"
                />
                <div *ngIf="!empleadoDetalle.foto" class="detalle-foto-placeholder">
                  <i class="fas fa-user"></i>
                  <span>Sin foto</span>
                </div>
              </div>

              <!-- Información del empleado -->
              <div class="detalle-info">
                <div class="info-row">
                  <span class="info-label">Nombre completo:</span>
                  <span class="info-value">{{ empleadoDetalle.nombre }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Cédula:</span>
                  <span class="info-value">{{ empleadoDetalle.cedula }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Cargo:</span>
                  <span class="info-value">{{ empleadoDetalle.Cargo?.nombre || 'Sin asignar' }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Área:</span>
                  <span class="info-value">{{ empleadoDetalle.Cargo?.Area?.nombre || 'Sin asignar' }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Departamento:</span>
                  <span class="info-value">{{ empleadoDetalle.Cargo?.Area?.Departamento?.nombre || 'Sin asignar' }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Sala:</span>
                  <span class="info-value">{{ empleadoDetalle.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin asignar' }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Edad:</span>
                  <span class="info-value">{{ calcularEdad(empleadoDetalle.fecha_cumpleanos) }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Antigüedad:</span>
                  <span class="info-value">{{ calcularAntiguedad(empleadoDetalle.fecha_ingreso) }}</span>
                </div>

                <div class="info-row">
                  <span class="info-label">Sexo:</span>
                  <span class="info-value">{{ empleadoDetalle.sexo || 'No especificado' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeDetalleModal()">Cerrar</button>
          </div>
        </div>
      </div>

      <!-- Modal para crear empleado -->
      <div *ngIf="showCargoModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ selectedEmpleado ? 'Editar Empleado' : 'Crear Nuevo Empleado' }}</h3>
            <button class="close-btn" (click)="closeCargoSelector()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="createEmpleado()" #empleadoForm="ngForm">
              <div class="form-group">
                <input 
                  type="file" 
                  #fileInput
                  id="fotoEmpleado" 
                  name="fotoEmpleado"
                  (change)="onFileSelected($event)"
                  class="hidden-file-input"
                  accept="image/*"
                  [required]="!selectedEmpleado || !selectedEmpleado?.foto"
                />
                
                <!-- Estado inicial: solo área de selección -->
                <div *ngIf="!originalImage && !nuevoEmpleado.foto" class="photo-upload-area" (click)="fileInput.click()">
                  <div class="photo-placeholder">
                    <div class="placeholder-icon">📷</div>
                    <div class="placeholder-text">Haz clic para seleccionar foto</div>
                  </div>
                </div>
                
                <!-- Estado de edición: imagen con controles debajo -->
                <div *ngIf="originalImage" class="photo-edit-container">
                  <div class="photo-canvas-container">
                    <canvas 
                      id="cropCanvas" 
                      width="300" 
                      height="300"
                      (mousedown)="onMouseDown($event)"
                      (mousemove)="onMouseMove($event)"
                      (mouseup)="onMouseUp()"
                      (mouseleave)="onMouseUp()"
                      class="crop-canvas">
                    </canvas>
                  </div>
                  
                  <!-- Slider de zoom vertical al lado del cuadro verde -->
                  <div class="zoom-slider-side">
                    <div class="custom-slider">
                      <div class="slider-track"></div>
                      <div class="slider-thumb" 
                           [style.top]="getSliderPosition() + '%'"
                           (mousedown)="startSliderDrag($event)">
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Vista previa de la foto procesada -->
                <div *ngIf="nuevoEmpleado.foto && !originalImage" class="photo-preview" (click)="fileInput.click()">
                  <img [src]="'data:image/jpeg;base64,' + nuevoEmpleado.foto" alt="Vista previa" class="preview-image">
                </div>
              </div>
              
              <!-- Botones de edición de imagen -->
              <div *ngIf="originalImage" class="row mb-4">
                <div class="col-6">
                  <button type="button" class="btn btn-secondary w-100" (click)="cancelImageEdit()">
                    Cancelar Edición
                  </button>
                </div>
                <div class="col-6">
                  <button type="button" class="btn btn-success w-100" (click)="processCroppedImage()">
                    Procesar Imagen
                  </button>
                </div>
              </div>
              
              
              
              <!-- Mensaje de procesamiento (solo si no es validación inicial) -->
              <div *ngIf="processingMessage && !isInitialValidating && !initialValidation" class="processing-message">
                <div class="spinner"></div>
                <span>{{ processingMessage }}</span>
              </div>
              
              
              <div class="form-group">
                <label for="cedulaEmpleado">Cédula:</label>
                <div class="cedula-input-container">
                  <!-- Select de tipo de cédula - solo para empleados nuevos -->
                  <select 
                    *ngIf="!selectedEmpleado"
                    [(ngModel)]="nuevoEmpleado.cedula_tipo"
                    class="cedula-tipo-select"
                    name="cedulaTipo"
                  >
                    <option value="V">V</option>
                    <option value="E">E</option>
                  </select>
                  
                  <!-- Input de cédula -->
                  <input 
                    type="text" 
                    id="cedulaEmpleado" 
                    name="cedulaEmpleado"
                    [(ngModel)]="nuevoEmpleado.cedula"
                    (ngModelChange)="limpiarPuntosCedula()"
                    (keyup)="validarCedula()"
                    (keypress)="onCedulaKeyPress($event)"
                    (paste)="onCedulaPaste($event)"
                    class="form-control cedula-input"
                    [class.is-invalid]="cedulaError"
                    [disabled]="selectedEmpleado"
                    [placeholder]="selectedEmpleado ? 'Cédula (solo lectura)' : 'Ingrese el número de cédula'"
                    [readonly]="selectedEmpleado"
                    required
                  />
                </div>
                <div *ngIf="cedulaError" class="invalid-feedback">
                  {{ cedulaError }}
                </div>
                <div *ngIf="validandoCedula" class="text-muted small">
                  <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Verificando cédula...
                </div>
              </div>


              <div class="form-group">
                <label for="nombreEmpleado">Nombre:</label>
                <input 
                  type="text" 
                  id="nombreEmpleado" 
                  name="nombreEmpleado"
                  [(ngModel)]="nuevoEmpleado.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del empleado"
                  required
                />
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="fechaIngreso">Fecha de Ingreso:</label>
                    <input 
                      type="date" 
                      id="fechaIngreso" 
                      name="fechaIngreso"
                      [(ngModel)]="nuevoEmpleado.fecha_ingreso"
                      class="form-control"
                      required
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="fechaCumpleanos">Fecha de Cumpleaños:</label>
                    <input 
                      type="date" 
                      id="fechaCumpleanos" 
                      name="fechaCumpleanos"
                      [(ngModel)]="nuevoEmpleado.fecha_cumpleanos"
                      class="form-control"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="sexoEmpleado">Sexo:</label>
                <select 
                  id="sexoEmpleado" 
                  name="sexoEmpleado"
                  [(ngModel)]="nuevoEmpleado.sexo"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione el sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              
              <div class="form-group">
                <label for="cargoSelect">Cargo:</label>
                <select 
                  id="cargoSelect" 
                  name="cargoSelect"
                  [(ngModel)]="nuevoEmpleado.cargo_id"
                  (ngModelChange)="onCargoChange()"
                  (change)="onCargoChange()"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione un cargo</option>
                  <option *ngFor="let cargo of userCargos" [value]="cargo.id">
                    {{ cargo.nombre }} ({{ cargo.Area?.Departamento?.Sala?.nombre || 'Sin sala' }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="dispositivosSelect">Dispositivos:</label>
                <div class="dispositivos-checkbox-container" [class.disabled]="!nuevoEmpleado.cargo_id">
                  <div *ngIf="!nuevoEmpleado.cargo_id" class="no-cargo-selected">
                    <p class="text-muted">Primero selecciona un cargo para ver los dispositivos disponibles</p>
                  </div>
                  <div *ngIf="nuevoEmpleado.cargo_id && userDispositivos.length === 0" class="no-dispositivos-sala">
                    <p class="text-muted">No hay dispositivos asociados en la sala seleccionada</p>
                  </div>
                  <div *ngFor="let dispositivo of userDispositivos" class="dispositivo-checkbox-item">
                    <input 
                      type="checkbox" 
                      [id]="'dispositivo_' + dispositivo.id"
                      [value]="dispositivo.id"
                      [checked]="isDispositivoSelected(dispositivo.id)"
                      [disabled]="!nuevoEmpleado.cargo_id"
                      (change)="onDispositivoChange(dispositivo.id, $event)"
                      class="dispositivo-checkbox"
                    />
                    <label [for]="'dispositivo_' + dispositivo.id" class="dispositivo-label" [class.disabled]="!nuevoEmpleado.cargo_id">
                      {{ dispositivo.nombre }} - {{ dispositivo.Sala?.nombre || 'Sin sala' }}
                    </label>
                  </div>
                </div>
                <small class="form-text text-muted">
                  <span *ngIf="!nuevoEmpleado.cargo_id">Selecciona un cargo primero</span>
                  <span *ngIf="nuevoEmpleado.cargo_id && userDispositivos.length > 0">Opcional: Selecciona uno o varios dispositivos de la sala</span>
                  <span *ngIf="nuevoEmpleado.cargo_id && userDispositivos.length === 0">Esta sala no tiene dispositivos disponibles</span>
                </small>
              </div>
              

              
              
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeCargoSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!isFormValid()">
                  {{ selectedEmpleado ? 'Actualizar Empleado' : 'Guardar Empleado' }}
                </button>
              </div>
            </form>
            
            <div *ngIf="userCargos.length === 0 && !selectedEmpleado" class="no-cargos">
              <p>No tienes cargos asignados</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .empleados-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
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

    .header .btn-info {
      background: #17a2b8;
      color: white;
    }

    .header .btn-info:hover {
      background: #138496;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(23, 162, 184, 0.3);
    }

    .header .btn-info:disabled {
      background: #6c757d;
      color: #adb5bd;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .filter-container {
      margin-bottom: 20px;
      padding: 0;
      width: 100%;
    }

    .search-input-wrapper {
      width: 100%;
      position: relative;
    }

    .search-input {
      width: 100%;
      padding: 8px 12px;
      font-size: 14px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      background: white;
      transition: all 0.3s ease;
      box-sizing: border-box;
      height: 36px;
    }

    .search-input:focus {
      border-color: #007bff;
      box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
      outline: none;
    }

    .search-input::placeholder {
      color: #6c757d;
      font-style: italic;
    }

    .header .btn-info:disabled:hover {
      background: #6c757d;
      transform: none;
      box-shadow: none;
    }

    .badge {
      font-size: 0.75em;
      padding: 0.25em 0.5em;
      border-radius: 50%;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
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

    .loading-indicator {
      text-align: center;
      padding: 40px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      margin: 20px 0;
    }

    .spinner-border {
      width: 3rem;
      height: 3rem;
      margin-bottom: 15px;
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

    .sortable-header {
      cursor: pointer;
      user-select: none;
      transition: background-color 0.2s;
      position: relative;
    }

    .sortable-header:hover {
      background-color: #495057;
    }

    .sort-icon {
      margin-left: 8px;
      font-size: 14px;
      display: inline-block !important;
      opacity: 0.85;
      color: #ffffff !important;
      transition: all 0.2s;
      width: auto !important;
      height: auto !important;
      visibility: visible !important;
    }

    .sortable-header:hover .sort-icon {
      opacity: 1 !important;
      color: #fff !important;
      transform: scale(1.15);
    }

    .sort-icon.fa-sort-up,
    .sort-icon.fa-sort-down {
      opacity: 1 !important;
      color: #fff !important;
      font-weight: bold;
    }

    th.sortable-header {
      position: relative;
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

    .employee-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .clickable-photo {
      cursor: pointer;
      transition: transform 0.2s, opacity 0.2s;
    }

    .clickable-photo:hover {
      transform: scale(1.1);
      opacity: 0.9;
    }

    .no-photo {
      color: #6c757d;
      font-style: italic;
      font-size: 12px;
      padding: 8px;
      display: inline-block;
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

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-warning {
      background: #ffc107;
      color: #212529;
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

    .mb-1 {
      margin-bottom: 0.25rem;
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

    .no-cargos {
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

    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    /* Estilos para el modal de detalles */
    .detalle-modal {
      max-width: 1000px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }

    .detalle-body {
      padding: 30px !important;
    }

    @media (max-width: 768px) {
      .detalle-container {
        flex-direction: column;
        align-items: center;
      }

      .detalle-foto-section {
        width: 100%;
      }
    }

    .detalle-container {
      display: flex;
      flex-direction: row;
      gap: 40px;
      align-items: center;
    }

    .detalle-foto-section {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-shrink: 0;
      width: 400px;
    }

    .detalle-foto {
      width: 380px;
      height: 380px;
      border-radius: 50%;
      object-fit: cover;
      border: 6px solid #28a745;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .detalle-foto-placeholder {
      width: 380px;
      height: 380px;
      border-radius: 50%;
      background: #e9ecef;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border: 6px solid #6c757d;
      color: #6c757d;
      font-size: 80px;
    }

    .detalle-foto-placeholder i {
      margin-bottom: 10px;
    }

    .detalle-foto-placeholder span {
      font-size: 14px;
      font-weight: 500;
    }

    .detalle-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
      flex: 1;
      min-width: 0;
    }

    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #e9ecef;
      align-items: flex-start;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-label {
      font-weight: 600;
      color: #495057;
      min-width: 160px;
      margin-right: 15px;
      font-size: 14px;
    }

    .info-value {
      color: #212529;
      font-size: 14px;
      flex: 1;
      word-break: break-word;
    }

    .hidden-file-input {
      display: none;
    }

    .photo-upload-area {
      width: 240px;
      height: 240px;
      border: 2px dashed #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 10px auto;
      position: relative;
      overflow: hidden;
    }

    .photo-upload-area:hover {
      border-color: #28a745;
      background-color: #f8f9fa;
    }

    .photo-preview {
      width: 240px;
      height: 240px;
      border: 2px dashed #e9ecef;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.3s ease;
      margin: 10px auto;
      position: relative;
      overflow: hidden;
    }

    .photo-preview:hover {
      border-color: #28a745;
      background-color: #f8f9fa;
    }

    .preview-image {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .photo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #6c757d;
    }

    .placeholder-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .placeholder-text {
      font-size: 12px;
      line-height: 1.2;
    }

    /* Estilos para el contenedor de edición de imagen */
    .photo-edit-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      margin-top: 10px;
      position: relative; /* Para posicionar el slider absoluto */
      width: 300px;
      height: 300px;
      margin: auto;
    }

    .photo-canvas-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      border-radius: 0;
      padding: 0;
      border: none;
    }

    .zoom-slider-side {
      position: absolute;
      right: 0px; /* Pegado al cuadro */
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10;
    }

    .custom-slider {
      position: relative;
      width: 4px;
      height: 200px;
      background: transparent;
      cursor: pointer;
      border-radius: 2px;
    }

    .slider-track {
      position: absolute;
      left: 0;
      top: 0;
      width: 4px;
      height: 100%;
      background: linear-gradient(to bottom, #28a745, #20c997);
      border-radius: 2px;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }

    .slider-thumb {
      position: absolute;
      left: -8px;
      width: 20px;
      height: 20px;
      background: linear-gradient(135deg, #28a745, #20c997);
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(40, 167, 69, 0.4), 0 0 0 1px rgba(40, 167, 69, 0.2);
      transition: all 0.2s ease;
    }

    .slider-thumb:hover {
      transform: scale(1.15);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.5), 0 0 0 2px rgba(40, 167, 69, 0.3);
    }

    .slider-thumb:active {
      transform: scale(1.05);
      box-shadow: 0 1px 4px rgba(40, 167, 69, 0.6), 0 0 0 1px rgba(40, 167, 69, 0.4);
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

    /* Estilos para el modal de recorte */
    .crop-modal {
      max-width: 800px;
      width: 95%;
    }

    .crop-container {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }

    .crop-canvas-container {
      display: flex;
      justify-content: center;
      align-items: center;
      background: transparent;
      border-radius: 0;
      padding: 0;
    }

    .crop-canvas {
      border: none;
      border-radius: 0;
      cursor: move;
      background: transparent;
      box-shadow: none;
    }

    .bottom-crop-controls {
      display: flex;
      justify-content: center;
      gap: 30px;
      margin: 20px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .control-group {
      background: white;
      padding: 15px 20px;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      min-width: 120px;
    }

    .control-group h4 {
      margin: 0 0 10px 0;
      font-size: 14px;
      font-weight: 600;
      color: #495057;
    }





    .zoom-percentage {
      margin-top: 10px;
      font-size: 14px;
      font-weight: 600;
      color: #495057;
      text-align: center;
    }

    .position-controls {
      display: flex;
      gap: 8px;
    }

    .control-label {
      font-size: 12px;
      color: #6c757d;
      font-weight: 600;
    }

    .crop-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .processing-message {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 15px;
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 8px;
      margin: 15px 0;
      color: #1976d2;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid #2196f3;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .validation-result {
      margin-top: 15px;
      padding: 15px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .validation-valid {
      background: #d4edda;
      border: 1px solid #c3e6cb;
      color: #155724;
    }

    .validation-invalid {
      background: #f8d7da;
      border: 1px solid #f5c6cb;
      color: #721c24;
    }

    .validation-icon {
      font-size: 18px;
    }

    .validation-message {
      font-weight: 500;
    }

    .biometric-analysis {
      margin-top: 20px;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .biometric-analysis h4 {
      margin: 0 0 15px 0;
      color: #495057;
      font-size: 16px;
    }

    .analysis-content {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .quality-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .quality-excellent {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .quality-good {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .quality-fair {
      background: #fff3cd;
      color: #856404;
      border: 1px solid #ffeaa7;
    }

    .quality-poor {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .score {
      font-size: 14px;
      color: #495057;
      font-weight: 600;
    }

    .recommendations h5 {
      margin: 0 0 8px 0;
      font-size: 14px;
      color: #495057;
    }

    .recommendations ul {
      margin: 0;
      padding-left: 20px;
    }

    .recommendations li {
      font-size: 13px;
      color: #6c757d;
      margin-bottom: 4px;
    }

    .btn-outline-primary {
      background: #007bff;
      color: white;
      border: none;
    }

    .btn-outline-primary:hover {
      background: #0056b3;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
    }

    .btn-outline-secondary {
      background: #6c757d;
      color: white;
      border: none;
    }

    .btn-outline-secondary:hover {
      background: #5a6268;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(108, 117, 125, 0.3);
    }

    .btn-outline-warning {
      background: #ffc107;
      color: #212529;
      border: none;
    }

    .btn-outline-warning:hover {
      background: #e0a800;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Estilos para checkboxes de dispositivos */
    .dispositivos-checkbox-container {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 10px;
      background: #f8f9fa;
    }

    .dispositivo-checkbox-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      padding: 5px;
      border-radius: 4px;
      transition: background-color 0.2s ease;
    }

    .dispositivo-checkbox-item:hover {
      background-color: #e9ecef;
    }

    .dispositivo-checkbox {
      margin-right: 10px;
      transform: scale(1.2);
      cursor: pointer;
    }

    .dispositivo-label {
      cursor: pointer;
      font-size: 14px;
      color: #495057;
      margin: 0;
      flex: 1;
      line-height: 1.4;
    }

    .dispositivo-label:hover {
      color: #28a745;
    }

    .dispositivos-checkbox-container.disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    /* Estilos para el contenedor de cédula */
    .cedula-input-container {
      display: flex;
      gap: 5px;
      align-items: center;
    }

    .cedula-tipo-select {
      width: 60px;
      height: 49px; /* Misma altura que los otros inputs */
      padding: 0.375rem 0.75rem;
      border: 1px solid #ced4da;
      border-radius: 0.375rem;
      background-color: #fff;
      font-weight: bold;
      text-align: center;
      font-size: 1rem;
      line-height: 1.5;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cedula-input {
      flex: 1;
    }

    .dispositivo-label.disabled {
      color: #6c757d;
      cursor: not-allowed;
    }

    .dispositivo-checkbox:disabled {
      cursor: not-allowed;
    }

    .no-cargo-selected {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-style: italic;
    }

    .no-dispositivos-sala {
      text-align: center;
      padding: 20px;
      color: #6c757d;
      font-style: italic;
    }

    .text-center {
      text-align: center;
    }

    .edad-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
      white-space: nowrap;
    }

    .antiguedad-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(245, 87, 108, 0.3);
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .photo-edit-container {
        gap: 10px;
      }
      
      .zoom-controls-horizontal {
        gap: 8px;
      }
      
    }
  `]
})
export class EmpleadosListComponent implements OnInit, OnDestroy {
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  filtroTexto: string = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  userCargos: any[] = [];
  userDispositivos: any[] = [];
  tareasCount: number = 0;
  dispositivosAnteriores: number[] = [];
  dispositivosNuevos: number[] = [];
  showCargoModal = false;
  showDetalleModal = false;
  empleadoDetalle: any = null;
  loading: boolean = false;
  permissionsLoaded: boolean = false;
  selectedEmpleado: any = null;
  nuevoEmpleado: EmpleadoForm = {
    id: null,
    foto: '',
    nombre: '',
    cedula: '',
    cedula_tipo: 'V',
    fecha_ingreso: '',
    fecha_cumpleanos: '',
    sexo: '',
    cargo_id: null,
    dispositivos: [] as number[]
  };
  
  hasChanges: boolean = false;
  // Cambios clave para dispositivos: nombre, cédula o foto
  keyFieldsChanged: boolean = false;
  
  
  // Método para forzar el mapeo de dispositivos (para testing)
  forzarMapeoDispositivos(): void {
    if (this.selectedEmpleado && this.selectedEmpleado.dispositivos) {
      // Forzando mapeo de dispositivos
      
      const dispositivosIds = this.selectedEmpleado.dispositivos.map((d: any) => d.id);
      
      this.nuevoEmpleado.dispositivos = dispositivosIds;
      
      // Detectar cambios
      this.detectChanges();
    }
  }
  
  // Método para resetear hasChanges manualmente (para testing)
  resetearHasChanges(): void {
    this.hasChanges = false;
  }

  // Variables para validación de cédula
  cedulaError: string = '';
  validandoCedula: boolean = false;
  
  // Variable para rastrear si se está editando la foto
  editandoFoto: boolean = false;

  // Variables para el recorte manual
  showCropModal = false;
  originalImage: string = '';
  cropData = {
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    scale: 1,
    imageWidth: 0,
    imageHeight: 0,
    imageOffsetX: 0,
    imageOffsetY: 0
  };
  initialCropData = {
    x: 25,
    y: 25,
    width: 250,
    height: 250,
    scale: 1
  };
  cropCanvas: HTMLCanvasElement | null = null;
  cropCtx: CanvasRenderingContext2D | null = null;
  isDragging = false;
  isSliderDragging = false; // Variable separada para el slider
  dragStart = { x: 0, y: 0 };
  startImageOffsetX = 0;
  startImageOffsetY = 0;
  zoomPercentage = 100; // Porcentaje de zoom (1-1000)
  processingMessage = '';
  initialValidation: {valid: boolean, message: string} | null = null;
  isInitialValidating = false;

  private permissionsSubscription?: Subscription;

  constructor(
    private empleadosService: EmpleadosService,
    private biometricImageService: BiometricImageService,
    private imageValidationService: ImageValidationService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private router: Router,
    private tareasAutomaticasService: TareasAutomaticasService,
    private authService: AuthService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  // Helper para convertir EmpleadoForm a Partial<Empleado>
  private toEmpleadoData(form: EmpleadoForm): any {
    // IMPORTANTE: La cédula debe manejarse exactamente como está en la BD
    // Solo agregar V/E si es un empleado NUEVO y la cédula no tiene V/E
    let cedulaCompleta = form.cedula || '';
    
    // Solo agregar V/E si es un empleado NUEVO (id es null) y la cédula no empieza con V o E
    if (form.id === null && cedulaCompleta && !cedulaCompleta.match(/^[VE]/i)) {
      cedulaCompleta = (form.cedula_tipo || 'V') + cedulaCompleta;
    }
    // Si es edición (id no es null), usar la cédula tal cual (ya viene con V/E de la BD)
    // Si ya tiene V/E, usarla tal cual (evitar duplicación)
    
    const data = {
      id: form.id || undefined,
      foto: form.foto,
      nombre: form.nombre,
      cedula: cedulaCompleta,
      fecha_ingreso: form.fecha_ingreso,
      fecha_cumpleanos: form.fecha_cumpleanos,
      sexo: form.sexo,
      cargo_id: form.cargo_id || undefined,
      dispositivos: form.dispositivos || []
    };
    
    return data;
  }

  ngOnInit(): void {
    // Verificar y cargar módulos si es necesario (necesarios para verificar permisos)
    const currentModules = this.modulesService.getCurrentModules();
    if (!currentModules || currentModules.length === 0) {
      this.modulesService.loadModules();
    }
    
    // Verificar si los permisos ya están cargados (para cuando se navega desde otra vista)
    const currentPermissions = this.permissionsService.getCurrentPermissions();
    
    // Función auxiliar para verificar si todo está listo y cargar
    const checkAndLoad = () => {
      const modules = this.modulesService.getCurrentModules();
      if (modules && modules.length > 0 && currentPermissions && currentPermissions.length > 0) {
        if (!this.permissionsLoaded) {
          this.permissionsLoaded = true;
          this.loadEmpleados();
        }
      } else if (!modules || modules.length === 0) {
        // Si los módulos no están cargados, esperar a que se carguen
        this.modulesService.modules$.pipe(filter(m => m.length > 0), take(1)).subscribe(() => {
          if (!this.permissionsLoaded && currentPermissions && currentPermissions.length > 0) {
            this.permissionsLoaded = true;
            this.loadEmpleados();
          }
        });
      }
    };
    
    if (currentPermissions && currentPermissions.length > 0) {
      // Si los permisos ya están cargados, verificar módulos
      checkAndLoad();
    } else {
      // Forzar carga de permisos si no están cargados
      this.permissionsService.forceReloadPermissions();
    }
    
    // Esperar a que los permisos estén cargados antes de cargar empleados
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      if (permissions && permissions.length > 0) {
        if (!this.permissionsLoaded) {
          // Verificar que los módulos también estén cargados
          const modules = this.modulesService.getCurrentModules();
          if (modules && modules.length > 0) {
            this.permissionsLoaded = true;
            this.loadEmpleados();
          } else {
            // Esperar a que se carguen los módulos
            this.modulesService.modules$.pipe(filter(m => m.length > 0), take(1)).subscribe(() => {
              this.permissionsLoaded = true;
              this.loadEmpleados();
            });
          }
        }
      }
    });
    
    // Timeout de respaldo para cargar empleados si los permisos no se cargan
    setTimeout(() => {
      if (!this.permissionsLoaded) {
        
        this.permissionsLoaded = true;
        this.loadEmpleados();
      }
    }, 500); // Reducido a 500ms para carga más rápida
    
    // Esperar a que el usuario esté disponible antes de cargar tareas
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadTareasCount();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  canAdd(): boolean {
    return this.permissionsService.canAddByName('Empleados');
  }

  canEdit(): boolean {
    return this.permissionsService.canEditByName('Empleados');
  }

  canDelete(): boolean {
    return this.permissionsService.canDeleteByName('Empleados');
  }

  loadEmpleados(): void {
    this.empleadosService.getEmpleados().subscribe({
      next: (empleados) => {
        this.empleados = empleados;
        this.aplicarFiltro(); // Aplicar filtro inicial
      },
      error: (error) => {
        
      }
    });
  }

  aplicarFiltro(): void {
    if (!this.filtroTexto.trim()) {
      this.empleadosFiltrados = [...this.empleados];
    } else {
      const filtro = this.filtroTexto.toLowerCase().trim();
      this.empleadosFiltrados = this.empleados.filter(empleado => 
        empleado.nombre?.toLowerCase().includes(filtro) ||
        empleado.cedula?.toLowerCase().includes(filtro) ||
        empleado.Cargo?.nombre?.toLowerCase().includes(filtro) ||
        empleado.Cargo?.Area?.Departamento?.Sala?.nombre?.toLowerCase().includes(filtro)
      );
    }
    
    // Aplicar ordenamiento si está activo
    this.aplicarOrdenamiento();
  }

  sortBy(column: string): void {
    // Si ya está ordenando por esta columna, cambiar la dirección
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si no, empezar ordenando ascendente
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    // Aplicar el ordenamiento
    this.aplicarOrdenamiento();
  }

  aplicarOrdenamiento(): void {
    if (!this.sortColumn) {
      return;
    }

    this.empleadosFiltrados.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      switch (this.sortColumn) {
        case 'nombre':
          valueA = (a.nombre || '').toLowerCase();
          valueB = (b.nombre || '').toLowerCase();
          break;
        
        case 'cedula':
          valueA = (a.cedula || '').toLowerCase();
          valueB = (b.cedula || '').toLowerCase();
          break;
        
        case 'cargo':
          valueA = (a.Cargo?.nombre || '').toLowerCase();
          valueB = (b.Cargo?.nombre || '').toLowerCase();
          break;
        
        case 'edad':
          // Calcular edad numérica para ordenar
          valueA = this.calcularEdadNumero(a.fecha_cumpleanos);
          valueB = this.calcularEdadNumero(b.fecha_cumpleanos);
          break;
        
        case 'antiguedad':
          // Calcular antigüedad en días para ordenar
          valueA = this.calcularAntiguedadDias(a.fecha_ingreso);
          valueB = this.calcularAntiguedadDias(b.fecha_ingreso);
          break;
        
        default:
          return 0;
      }

      // Comparar valores
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  calcularEdadNumero(fechaCumpleanos: string): number {
    if (!fechaCumpleanos) return 0;
    const hoy = new Date();
    const cumpleanos = new Date(fechaCumpleanos);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const mes = hoy.getMonth() - cumpleanos.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }
    return edad;
  }

  calcularAntiguedadDias(fechaIngreso: string): number {
    if (!fechaIngreso) return 0;
    const hoy = new Date();
    const ingreso = new Date(fechaIngreso);
    const diffTime = hoy.getTime() - ingreso.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  verDetalleEmpleado(empleado: any): void {
    this.empleadoDetalle = empleado;
    this.showDetalleModal = true;
  }

  closeDetalleModal(): void {
    this.showDetalleModal = false;
    this.empleadoDetalle = null;
  }

  showCargoSelector(): void {
    this.loadUserCargos();
    // No cargar dispositivos inicialmente, se cargarán cuando se seleccione un cargo
    this.userDispositivos = [];
    this.resetForm();
    this.showCargoModal = true;
  }

  closeCargoSelector(): void {
    this.showCargoModal = false;
    this.selectedEmpleado = null;
    this.resetForm();
  }

  loadUserCargos(): void {
    
    this.empleadosService.getUserCargos().subscribe({
      next: (cargos) => {
        
        this.userCargos = cargos;
      },
      error: (error) => {
        
      }
    });
  }


  loadUserDispositivos(): void {
    
    
    // Solo cargar dispositivos si hay un cargo seleccionado
    if (this.nuevoEmpleado.cargo_id) {
      // Buscar el cargo seleccionado (manejar tanto string como number)
      const cargoSeleccionado = this.userCargos.find(cargo => 
        cargo.id == this.nuevoEmpleado.cargo_id || 
        cargo.id === Number(this.nuevoEmpleado.cargo_id) ||
        Number(cargo.id) === this.nuevoEmpleado.cargo_id
      );
      
      
      
      if (cargoSeleccionado) {
        this.empleadosService.getUserDispositivos().subscribe({
          next: (dispositivos: any[]) => {
            
            
            // Filtrar dispositivos por la sala del cargo seleccionado
            if (cargoSeleccionado.Area?.Departamento?.Sala?.id) {
              const salaId = cargoSeleccionado.Area.Departamento.Sala.id;
              
              
              this.userDispositivos = dispositivos.filter(dispositivo => {
                const dispositivoSalaId = dispositivo.Sala?.id;
                
                return dispositivoSalaId === salaId;
              });
              
              
              
              // Forzar detección de cambios para actualizar los checkboxes
              setTimeout(() => {
                
                this.forceCheckboxUpdate();
              }, 50);
            } else {
              
              this.userDispositivos = [];
            }
          },
          error: (error: any) => {
            
          }
        });
      } else {
        
        this.userDispositivos = [];
      }
    } else {
      
      this.userDispositivos = [];
    }
  }

  onCargoChange(): void {
    
    
    
    
    // Guardar dispositivos actuales antes de cambiar
    const dispositivosActuales = [...(this.nuevoEmpleado.dispositivos || [])];
    
    
    // Solo limpiar dispositivos si es un empleado nuevo
    if (!this.selectedEmpleado) {
      // Solo para empleados nuevos, limpiar dispositivos si no hay cargo
      if (!this.nuevoEmpleado.cargo_id) {
        
        this.nuevoEmpleado.dispositivos = [];
      }
    } else {
      // Si es edición, NUNCA limpiar dispositivos automáticamente
      
      
      const cargoAnterior = this.selectedEmpleado.Cargo?.id;
      const cargoNuevo = this.nuevoEmpleado.cargo_id;
      
      
      // En edición, siempre mantener los dispositivos seleccionados
      
    }
    
    // Cargar dispositivos de la nueva sala
    this.loadUserDispositivos();
    // Detectar cambios
    this.detectChanges();
    
    // Debuggear estado después del cambio
    setTimeout(() => {
      this.debugEstado();
    }, 100);
  }

  // Función helper para verificar si un dispositivo está seleccionado
  isDispositivoSelected(dispositivoId: number): boolean {
    
    
    
    
    
    if (!this.nuevoEmpleado.dispositivos || !Array.isArray(this.nuevoEmpleado.dispositivos)) {
      
      return false;
    }
    
    const isSelected = this.nuevoEmpleado.dispositivos.includes(dispositivoId);
    
    
    return isSelected;
  }

  // Método para forzar la actualización de los checkboxes
  forceCheckboxUpdate(): void {
    
    
    
    
    // Forzar detección de cambios
    this.detectChanges();
    
    // Pequeño delay para asegurar que Angular actualice la vista
    setTimeout(() => {
      
    }, 100);
  }

  // Método de debugging para ver el estado completo
  debugEstado(): void {
    
    
    
    
    
    
    
    
    if (this.userDispositivos.length > 0) {
      
      this.userDispositivos.forEach(dispositivo => {
        const isSelected = this.isDispositivoSelected(dispositivo.id);
        
      });
    }
    
  }

  onDispositivoChange(dispositivoId: number, event: any): void {
    if (event.target.checked) {
      // Agregar dispositivo si no está ya seleccionado
      if (!this.nuevoEmpleado.dispositivos.includes(dispositivoId)) {
        this.nuevoEmpleado.dispositivos.push(dispositivoId);
      }
    } else {
      // Remover dispositivo
      this.nuevoEmpleado.dispositivos = this.nuevoEmpleado.dispositivos.filter(id => id !== dispositivoId);
    }
    
    // Detectar cambios
    this.detectChanges();
  }

  resetForm(): void {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    
    this.nuevoEmpleado = {
      id: null,
      foto: '', // Siempre vacío al crear nuevo empleado
      nombre: '',
      cedula: '',
      cedula_tipo: 'V', // Por defecto V (Venezolano)
      fecha_ingreso: todayString,
      fecha_cumpleanos: todayString,
      sexo: '',
      cargo_id: null,
      dispositivos: []
    };
    
    
    
    
    // Limpiar variables de procesamiento de imagen
    this.originalImage = '';
    this.processingMessage = '';
    this.initialValidation = null;
    this.isInitialValidating = false;
    
    // Limpiar errores de validación
    this.cedulaError = '';
    this.validandoCedula = false;
    this.editandoFoto = false;
    this.cropData = {
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      scale: 1,
      imageWidth: 0,
      imageHeight: 0,
      imageOffsetX: 0,
      imageOffsetY: 0
    };
    this.initialCropData = { ...this.cropData };
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.startImageOffsetX = 0;
    this.startImageOffsetY = 0;
    this.isSliderDragging = false;
  }

  async onFileSelected(event: any): Promise<void> {
    const file = event.target.files[0];
    if (file) {
      try {
        // Marcar que se está editando la foto (crear o editar)
        this.editandoFoto = true;
        
        // Verificar que sea una imagen válida
        if (!file.type.startsWith('image/')) {
          
          return;
        }

        // Convertir a base64
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageBase64 = e.target?.result as string;
          
          // Validar que sea una imagen de persona válida
          this.isInitialValidating = true;
          this.initialValidation = await this.validatePersonImage(imageBase64);
          
          if (this.initialValidation?.valid) {
            this.originalImage = imageBase64;
            this.initializeCropInModal();
          } else {
            this.originalImage = '';
            
          }
          
          this.isInitialValidating = false;
        };
        reader.readAsDataURL(file);
        
      } catch (error) {
        
        
      }
    }
  }

  // Validar que la imagen sea de una persona
  async validatePersonImage(imageBase64: string): Promise<{valid: boolean, message: string}> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Crear canvas para analizar la imagen
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({valid: false, message: 'Error procesando imagen'});
            return;
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          // Obtener datos de píxeles
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Análisis básico de la imagen
          const analysis = this.analyzeImageForPerson(data, canvas.width, canvas.height);
          
          if (analysis.isPerson) {
            resolve({valid: true, message: 'Imagen válida de persona'});
          } else {
            resolve({valid: false, message: analysis.reason});
          }
        } catch (error) {
          resolve({valid: false, message: 'Error analizando imagen'});
        }
      };
      img.onerror = () => {
        resolve({valid: false, message: 'Error cargando imagen'});
      };
      img.src = imageBase64;
    });
  }

  // Análisis estricto para detectar si es una imagen real de persona de carne y hueso
  analyzeImageForPerson(data: Uint8ClampedArray, width: number, height: number): {isPerson: boolean, reason: string} {
    // Verificar que la imagen no sea demasiado pequeña
    if (width < 150 || height < 150) {
      return {isPerson: false, reason: 'La imagen es demasiado pequeña para ser una foto de persona'};
    }

    // Verificar que la imagen no sea demasiado grande (probablemente no es una foto de persona)
    if (width > 3000 || height > 3000) {
      return {isPerson: false, reason: 'La imagen es demasiado grande para ser una foto de persona'};
    }

    // Análisis estricto para detectar personas reales vs ilustraciones/muñecos
    let colorVariation = 0;
    let skinTonePixels = 0;
    let naturalGradients = 0;
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a > 0) { // Solo píxeles no transparentes
        totalPixels++;
        
        // Detectar tonos de piel realistas (sensibilidad extremadamente reducida)
        if (r > 40 && r < 255 && g > 10 && g < 255 && b > 10 && b < 255) {
          skinTonePixels++;
        }

        // Calcular variación de color
        const pixelVariation = Math.abs(r - g) + Math.abs(g - b) + Math.abs(r - b);
        colorVariation += pixelVariation;

        // Calcular gradientes naturales (fotos reales tienen más variación)
        if (i + 4 < data.length) {
          const nextR = data[i + 4];
          const nextG = data[i + 5];
          const nextB = data[i + 6];
          const gradient = Math.abs(r - nextR) + Math.abs(g - nextG) + Math.abs(b - nextB);
          naturalGradients += gradient;
        }
      }
    }

    if (totalPixels === 0) {
      return {isPerson: false, reason: 'Imagen vacía o inválida'};
    }

    const avgColorVariation = colorVariation / totalPixels;
    const skinToneRatio = skinTonePixels / totalPixels;
    const avgNaturalGradients = naturalGradients / totalPixels;

    // Detectar patrones de ilustración/comic/muñeco (sensibilidad extremadamente reducida)
    if (avgColorVariation < 3) {
      return {isPerson: false, reason: 'La imagen parece ser una ilustración, comic o muñeco, no una persona real'};
    }

    // Detectar falta de tonos de piel (personas reales tienen tonos de piel) - sensibilidad extremadamente reducida
    if (skinToneRatio < 0.005) {
      return {isPerson: false, reason: 'No se detectan tonos de piel típicos de una persona real'};
    }

    // Detectar patrones muy uniformes (típicos de ilustraciones) - sensibilidad extremadamente reducida
    if (avgNaturalGradients < 1) {
      return {isPerson: false, reason: 'La imagen parece ser una ilustración o dibujo, no una foto real'};
    }

    // Detectar logos/emblemas (imágenes muy cuadradas con patrones repetitivos) - sensibilidad extremadamente reducida
    const aspectRatio = width / height;
    if (aspectRatio > 0.4 && aspectRatio < 1.6 && avgColorVariation < 5) {
      return {isPerson: false, reason: 'La imagen parece ser un logo o emblema, no una foto de persona'};
    }

    // Detectar imágenes generadas por IA o artificiales (patrones muy perfectos) - sensibilidad extremadamente reducida
    if (avgColorVariation > 400 && avgNaturalGradients < 2) {
      return {isPerson: false, reason: 'La imagen parece ser generada artificialmente, no una foto real de persona'};
    }

    // Verificar que tenga suficiente complejidad visual (fotos reales son complejas) - sensibilidad extremadamente reducida
    if (avgColorVariation < 5 && avgNaturalGradients < 2) {
      return {isPerson: false, reason: 'La imagen carece de la complejidad visual de una foto real de persona'};
    }

    return {isPerson: true, reason: 'Imagen válida de persona real'};
  }



  showProcessingIndicator(): void {
    // Crear indicador de procesamiento
    const indicator = document.createElement('div');
    indicator.id = 'processing-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: white;
        font-size: 18px;
      ">
        <div style="text-align: center;">
          <div style="
            width: 50px;
            height: 50px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #28a745;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          "></div>
          Procesando imagen para biometría facial...
        </div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(indicator);
  }

  hideProcessingIndicator(): void {
    const indicator = document.getElementById('processing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  showQualityInfo(quality: any): void {
    const qualityMessages: { [key: string]: string } = {
      'excellent': '✅ Calidad excelente - Perfecta para biometría facial',
      'good': '✅ Calidad buena - Adecuada para biometría facial',
      'fair': '⚠️ Calidad regular - Funcional pero podría mejorarse',
      'poor': '❌ Calidad pobre - No recomendada para biometría facial'
    };

    const imageQuality = quality.imageQuality as string;
    let message = qualityMessages[imageQuality] || 'Calidad desconocida';
    
    if (quality.recommendations && quality.recommendations.length > 0) {
      message += '\n\nRecomendaciones:\n• ' + quality.recommendations.join('\n• ');
    }

    
    // No mostrar alert para calidad buena/excelente, solo log
    if (quality.imageQuality === 'poor' || quality.imageQuality === 'fair') {
      
    }
  }

  showErrorDetails(error: string, quality?: any): void {
    let message = `❌ ${error}`;
    
    if (quality && quality.recommendations && quality.recommendations.length > 0) {
      message += '\n\nRecomendaciones:\n• ' + quality.recommendations.join('\n• ');
    }

    
  }

  // Métodos para el recorte manual
  initializeCropInModal(): void {
    this.processingMessage = '';
    
    // Inicializar datos de recorte con cuadro fijo en el centro (más grande)
    this.cropData = {
      x: 25,  // Fijo en el centro horizontalmente (300/2 - 125)
      y: 25,  // Fijo en el centro verticalmente (300/2 - 125)
      width: 250,
      height: 250,
      scale: 1,
      imageWidth: 0,
      imageHeight: 0,
      imageOffsetX: 0,
      imageOffsetY: 0
    };

    // Inicializar zoom al centro (100 = sin zoom)
    this.zoomPercentage = 100;

    // Esperar a que se renderice el canvas
    setTimeout(() => {
      this.setupCropCanvas();
    }, 100);
  }

  setupCropCanvas(): void {
    const canvas = document.getElementById('cropCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.cropCanvas = canvas;
    this.cropCtx = canvas.getContext('2d');
    
    if (!this.cropCtx) return;

    // Cargar imagen
    const img = new Image();
    img.onload = () => {
      this.cropData.imageWidth = img.width;
      this.cropData.imageHeight = img.height;
      
      // Calcular escala para que la imagen quepa en el canvas
      const canvasWidth = 300;
      const canvasHeight = 300;
      const scaleX = canvasWidth / img.width;
      const scaleY = canvasHeight / img.height;
      this.cropData.scale = Math.min(scaleX, scaleY);
      
      // Centrar el recorte inicial
      this.cropData.x = (canvasWidth - this.cropData.width) / 2;
      this.cropData.y = (canvasHeight - this.cropData.height) / 2;
      
      // Guardar datos iniciales para reset
      this.initialCropData = {
        x: this.cropData.x,
        y: this.cropData.y,
        width: this.cropData.width,
        height: this.cropData.height,
        scale: this.cropData.scale
      };
      
      this.drawCropCanvas();
    };
    img.src = this.originalImage;
  }

  drawCropCanvas(): void {
    if (!this.cropCanvas || !this.cropCtx || !this.originalImage) return;

    const canvas = this.cropCanvas;
    const ctx = this.cropCtx;
    const img = new Image();
    
    img.onload = () => {
      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar imagen escalada con offset
      const scaledWidth = img.width * this.cropData.scale;
      const scaledHeight = img.height * this.cropData.scale;
      const offsetX = (canvas.width - scaledWidth) / 2 + (this.cropData.imageOffsetX || 0);
      const offsetY = (canvas.height - scaledHeight) / 2 + (this.cropData.imageOffsetY || 0);
      
      ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
      
      // Dibujar recuadro de recorte
      ctx.strokeStyle = '#28a745';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.cropData.x, this.cropData.y, this.cropData.width, this.cropData.height);
      
      // Dibujar esquinas del recuadro
      const cornerSize = 10;
      ctx.fillStyle = '#28a745';
      
      // Esquina superior izquierda
      ctx.fillRect(this.cropData.x - cornerSize/2, this.cropData.y - cornerSize/2, cornerSize, cornerSize);
      // Esquina superior derecha
      ctx.fillRect(this.cropData.x + this.cropData.width - cornerSize/2, this.cropData.y - cornerSize/2, cornerSize, cornerSize);
      // Esquina inferior izquierda
      ctx.fillRect(this.cropData.x - cornerSize/2, this.cropData.y + this.cropData.height - cornerSize/2, cornerSize, cornerSize);
      // Esquina inferior derecha
      ctx.fillRect(this.cropData.x + this.cropData.width - cornerSize/2, this.cropData.y + this.cropData.height - cornerSize/2, cornerSize, cornerSize);
    };
    img.src = this.originalImage;
  }

  drawCropBox(): void {
    if (!this.cropCanvas || !this.cropCtx) return;
    
    const ctx = this.cropCtx;
    
    // Dibujar recuadro de recorte
    ctx.strokeStyle = '#28a745';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.cropData.x, this.cropData.y, this.cropData.width, this.cropData.height);
    
    // Dibujar esquinas del recuadro
    const cornerSize = 10;
    ctx.fillStyle = '#28a745';
    
    // Esquina superior izquierda
    ctx.fillRect(this.cropData.x - cornerSize/2, this.cropData.y - cornerSize/2, cornerSize, cornerSize);
    // Esquina superior derecha
    ctx.fillRect(this.cropData.x + this.cropData.width - cornerSize/2, this.cropData.y - cornerSize/2, cornerSize, cornerSize);
    // Esquina inferior izquierda
    ctx.fillRect(this.cropData.x - cornerSize/2, this.cropData.y + this.cropData.height - cornerSize/2, cornerSize, cornerSize);
    // Esquina inferior derecha
    ctx.fillRect(this.cropData.x + this.cropData.width - cornerSize/2, this.cropData.y + this.cropData.height - cornerSize/2, cornerSize, cornerSize);
  }

  // Controles de zoom
  zoomIn(): void {
    this.cropData.scale = Math.min(this.cropData.scale * 1.2, 10);
    this.drawCropCanvas();
  }

  zoomOut(): void {
    this.cropData.scale = Math.max(this.cropData.scale / 1.2, 0.01);
    this.drawCropCanvas();
  }

  onZoomChange(event: any): void {
    const value = parseInt(event.target.value);
    this.zoomPercentage = value;
    
    // Lógica: 100 = centro (sin zoom), >100 = zoom +, <100 = zoom -
    if (value === 100) {
      this.cropData.scale = 1; // Sin zoom
    } else if (value > 100) {
      // Zoom +: 100-200 se convierte en escala 1-10
      this.cropData.scale = 1 + ((value - 100) / 100) * 9; // 1-10
    } else {
      // Zoom -: 0-100 se convierte en escala 0.1-1
      this.cropData.scale = 0.1 + (value / 100) * 0.9; // 0.1-1
    }
    
    this.drawCropCanvas();
  }

  getSliderPosition(): number {
    // Convertir zoomPercentage a posición del slider
    // Centro (100) = 50% de posición
    // Arriba (200) = 0% de posición (zoom máximo)
    // Abajo (0) = 100% de posición (zoom mínimo)
    return (200 - this.zoomPercentage) / 200 * 100;
  }

  startSliderDrag(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation(); // Evitar que se active el arrastre de imagen
    this.isSliderDragging = true;
    this.dragStart = { x: event.clientX, y: event.clientY };
    
    document.addEventListener('mousemove', this.onSliderDrag.bind(this));
    document.addEventListener('mouseup', this.endSliderDrag.bind(this));
  }

  onSliderDrag(event: MouseEvent): void {
    if (!this.isSliderDragging) return;
    
    const sliderContainer = document.querySelector('.custom-slider');
    if (!sliderContainer) return;
    
    const rect = sliderContainer.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const percentage = Math.max(0, Math.min(100, (y / rect.height) * 100));
    
    // Lógica CORRECTA:
    // Centro (50%) = sin zoom (scale = 1)
    // Arriba (0%) = zoom máximo (scale = 10) - ACERCAR
    // Abajo (100%) = zoom mínimo (scale = 0.1) - ALEJAR
    
    if (percentage < 50) {
      // Arriba del centro = ACERCAR
      const factor = (50 - percentage) / 50; // 0 a 1
      this.cropData.scale = 1 + (factor * 9); // 1 a 10
      this.zoomPercentage = 100 + (factor * 100); // 100 a 200
    } else if (percentage > 50) {
      // Abajo del centro = ALEJAR
      const factor = (percentage - 50) / 50; // 0 a 1
      this.cropData.scale = 1 - (factor * 0.9); // 1 a 0.1
      this.zoomPercentage = 100 - (factor * 100); // 100 a 0
    } else {
      // Exactamente en el centro = sin zoom
      this.cropData.scale = 1;
      this.zoomPercentage = 100;
    }
    
    this.drawCropCanvas();
  }

  endSliderDrag(): void {
    this.isSliderDragging = false;
    document.removeEventListener('mousemove', this.onSliderDrag.bind(this));
    document.removeEventListener('mouseup', this.endSliderDrag.bind(this));
  }

  // Método de reset
  resetCrop(): void {
    this.cropData.x = 25;  // Siempre fijo en el centro (más grande)
    this.cropData.y = 25;  // Siempre fijo en el centro (más grande)
    this.cropData.width = 250;
    this.cropData.height = 250;
    this.cropData.scale = this.initialCropData.scale;
    this.cropData.imageOffsetX = 0;
    this.cropData.imageOffsetY = 0;
    this.drawCropCanvas();
  }

  // Eventos del mouse para arrastrar
  onMouseDown(event: MouseEvent): void {
    const rect = this.cropCanvas?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Permitir arrastrar desde cualquier parte del canvas
    this.isDragging = true;
    this.dragStart = { x: x, y: y };
    this.startImageOffsetX = this.cropData.imageOffsetX || 0;
    this.startImageOffsetY = this.cropData.imageOffsetY || 0;
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging || this.isSliderDragging || !this.cropCanvas) return;

    const rect = this.cropCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Calcular diferencia de movimiento
    const deltaX = x - this.dragStart.x;
    const deltaY = y - this.dragStart.y;
    
    // Mover la imagen (no el cuadro)
    this.cropData.imageOffsetX = this.startImageOffsetX + deltaX;
    this.cropData.imageOffsetY = this.startImageOffsetY + deltaY;
    
    this.drawCropCanvas();
  }

  onMouseUp(): void {
    this.isDragging = false;
  }

  // Función para mover el recuadro con pan de imagen
  moveCropBoxWithPan(newX: number, newY: number): void {
    const canvasWidth = 300;
    const canvasHeight = 300;
    const margin = 20; // Margen mínimo desde el borde
    
    // Calcular límites del recuadro
    const minX = margin;
    const maxX = canvasWidth - this.cropData.width - margin;
    const minY = margin;
    const maxY = canvasHeight - this.cropData.height - margin;
    
    // Calcular offset de la imagen
    let imageOffsetX = this.cropData.imageOffsetX || 0;
    let imageOffsetY = this.cropData.imageOffsetY || 0;
    
    // Si el recuadro está en los límites, mover la imagen (velocidad extremadamente reducida)
    if (newX < minX) {
      imageOffsetX += (minX - newX) * 0.01;
      newX = minX;
    } else if (newX > maxX) {
      imageOffsetX -= (newX - maxX) * 0.01;
      newX = maxX;
    }
    
    if (newY < minY) {
      imageOffsetY += (minY - newY) * 0.01;
      newY = minY;
    } else if (newY > maxY) {
      imageOffsetY -= (newY - maxY) * 0.01;
      newY = maxY;
    }
    
    // Actualizar posiciones
    this.cropData.x = newX;
    this.cropData.y = newY;
    this.cropData.imageOffsetX = imageOffsetX;
    this.cropData.imageOffsetY = imageOffsetY;
    
    this.drawCropCanvas();
  }

  // Procesar imagen recortada
  async processCroppedImage(): Promise<void> {
    if (!this.cropCanvas || !this.cropCtx) return;

    try {
      this.processingMessage = 'Procesando imagen...';
      
      // Crear canvas para el recorte final
      const finalCanvas = document.createElement('canvas');
      const finalCtx = finalCanvas.getContext('2d');
      
      if (!finalCtx) return;

      finalCanvas.width = 300;
      finalCanvas.height = 300;

      // Calcular la posición del recorte en la imagen original
      const img = new Image();
      img.onload = async () => {
        const canvasWidth = 300; // Tamaño del canvas de recorte
        const canvasHeight = 300;
        
        // SOLUCIÓN CORRECTA: Considerar TODOS los offsets de la imagen
        // La imagen se dibuja con offsetX, offsetY + imageOffsetX, imageOffsetY
        
        // Calcular el offset de la imagen en el canvas (igual que en drawCropCanvas)
        const scaledWidth = img.width * this.cropData.scale;
        const scaledHeight = img.height * this.cropData.scale;
        const offsetX = (canvasWidth - scaledWidth) / 2 + (this.cropData.imageOffsetX || 0);
        const offsetY = (canvasHeight - scaledHeight) / 2 + (this.cropData.imageOffsetY || 0);
        
        // MAPEO CORRECTO: Las coordenadas del cuadro verde se mapean a la imagen considerando TODOS los offsets
        const finalX = (this.cropData.x - offsetX) / this.cropData.scale;
        const finalY = (this.cropData.y - offsetY) / this.cropData.scale;
        
        // Asegurar que estén dentro de la imagen
        const finalX_clamped = Math.max(0, Math.min(finalX, img.width));
        const finalY_clamped = Math.max(0, Math.min(finalY, img.height));
        
        const finalWidth = Math.min(img.width - finalX_clamped, this.cropData.width / this.cropData.scale);
        const finalHeight = Math.min(img.height - finalY_clamped, this.cropData.height / this.cropData.scale);
        
        
        
        // Verificar que las coordenadas no sean negativas o inválidas
        if (finalX_clamped < 0 || finalY_clamped < 0 || finalWidth <= 0 || finalHeight <= 0) {
          
          return;
        }
        
        if (finalX_clamped + finalWidth > img.width || finalY_clamped + finalHeight > img.height) {
          
          return;
        }
        
        // Dibujar el recorte final usando las coordenadas finales corregidas
        finalCtx.drawImage(
          img,
          finalX_clamped, finalY_clamped, finalWidth, finalHeight,
          0, 0, 300, 300
        );
        
        // Convertir a base64 para validación biométrica
        const base64 = finalCanvas.toDataURL('image/jpeg', 0.9);
        
        // Comprimir a máximo 200KB
        this.processingMessage = 'Comprimiendo imagen...';
        const response = await fetch(base64);
        const blob = await response.blob();
        const compressedBase64 = await this.compressImage(blob, 200);
        
        // Guardar la imagen procesada
        this.nuevoEmpleado.foto = compressedBase64;
        
        
        // Limpiar variables de procesamiento
        this.processingMessage = '';
        this.initialValidation = null;
        this.isInitialValidating = false;
        
        // Marcar que ya no se está editando la foto
        this.editandoFoto = false;
        
        // Limpiar originalImage después de guardar
        setTimeout(() => {
          this.originalImage = '';
        }, 100);
      };
      img.src = this.originalImage;
      
    } catch (error) {
      
      this.processingMessage = 'Error procesando la imagen';
    }
  }


  async compressImage(blob: Blob, maxSizeKB: number): Promise<string> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        let quality = 0.9;
        const compress = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const sizeKB = (dataUrl.length * 0.75) / 1024; // Aproximación del tamaño en KB
          
          if (sizeKB <= maxSizeKB || quality <= 0.1) {
            resolve(dataUrl.split(',')[1]); // Solo la parte base64
          } else {
            quality -= 0.1;
            compress();
          }
        };
        
        compress();
      };
      
      img.src = URL.createObjectURL(blob);
    });
  }


  cancelImageEdit(): void {
    this.originalImage = '';
    this.processingMessage = '';
    
    // Si se está editando un empleado, restaurar la foto original
    if (this.selectedEmpleado) {
      this.nuevoEmpleado.foto = this.selectedEmpleado.foto || '';
    } else {
      // Si se está creando un empleado, limpiar la foto (validación quedará en false)
      this.nuevoEmpleado.foto = '';
    }
    
    // Marcar que ya no se está editando la foto
    this.editandoFoto = false;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  detectChanges(): boolean {
    if (!this.selectedEmpleado) {
      this.hasChanges = true; // Si es nuevo empleado, siempre hay cambios
      return true;
    }
    
    const original = this.selectedEmpleado;
    const current = this.nuevoEmpleado;
    
    // Comparar campos básicos con normalización de tipos
    const normalizeValue = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      if (typeof value === 'string' && value.trim() === '') return null;
      return value;
    };
    
    // Normalizar cargo_id para comparación (convertir a string para comparar)
    const normalizeCargoId = (value: any) => {
      if (value === null || value === undefined || value === '') return null;
      return String(value);
    };
    
    const originalCargo = normalizeCargoId(original.cargo_id);
    const currentCargo = normalizeCargoId(current.cargo_id);
    const cargoChanged = originalCargo !== currentCargo && currentCargo !== null;
    
    // Para cédula, comparar la cédula completa
    // original.cedula viene de la BD tal cual está (puede tener V/E o no)
    const originalCedulaCompleta = original.cedula || '';
    
    // current.cedula en el form: 
    // - Si es nuevo (original.id === null), puede no tener V/E, así que hay que agregarla para comparar
    // - Si es edición (original.id !== null), ya viene completa tal cual de la BD (sin dividir)
    let currentCedulaCompleta = current.cedula || '';
    if (original.id === null && currentCedulaCompleta && !currentCedulaCompleta.match(/^[VE]/i)) {
      // Es nuevo, agregar V/E si no la tiene
      currentCedulaCompleta = (current.cedula_tipo || 'V') + currentCedulaCompleta;
    }
    // Si es edición, current.cedula ya viene completa de la BD (con o sin V/E), comparar directamente
    
    const basicFieldsChanged = 
      original.nombre !== current.nombre ||
      originalCedulaCompleta !== currentCedulaCompleta ||
      original.fecha_ingreso !== current.fecha_ingreso ||
      original.fecha_cumpleanos !== current.fecha_cumpleanos ||
      original.sexo !== current.sexo ||
      cargoChanged;
    
    // Comparar foto (solo si se cambió)
    const fotoChanged = current.foto && current.foto !== original.foto;
    
    // Guardar si cambiaron datos clave que requieren sincronizar al dispositivo
    this.keyFieldsChanged = (original.nombre !== current.nombre) || (originalCedulaCompleta !== currentCedulaCompleta) || !!fotoChanged;

    // Comparar dispositivos
    const dispositivosOriginales = original.dispositivos?.map((d: any) => d.id).sort() || [];
    const dispositivosNuevos = (current.dispositivos || []).sort();
    const dispositivosChanged = JSON.stringify(dispositivosOriginales) !== JSON.stringify(dispositivosNuevos);
    
    this.hasChanges = basicFieldsChanged || fotoChanged || dispositivosChanged;
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    // Log detallado de cada campo
    
    
    
    
    
    
    
    
    
    
    return this.hasChanges;
  }

  createEmpleado(): void {
    if (this.selectedEmpleado) {
      // Detectar cambios solo al enviar (no afecta habilitación del botón)
      this.detectChanges();
      // Actualizar empleado existente
      
      
      
      // Obtener dispositivos anteriores y nuevos
      // Si selectedEmpleado.dispositivos es un array de objetos, mapear a IDs
      // Si es un array de números, usarlo directamente
      let dispositivosAnteriores = [];
      if (this.selectedEmpleado.dispositivos) {
        if (Array.isArray(this.selectedEmpleado.dispositivos)) {
          dispositivosAnteriores = this.selectedEmpleado.dispositivos.map((d: any) => {
            return typeof d === 'object' && d.id ? d.id : d;
          });
        } else {
          dispositivosAnteriores = [];
        }
      }
      
      // Normalizar IDs a número para comparar correctamente
      const dispositivosAnterioresIds = (dispositivosAnteriores as any[]).map((id: any) => Number(id));
      const dispositivosNuevos = (this.nuevoEmpleado.dispositivos || []).map((id: any) => Number(id));
      
      
      
      
      
      
      // Verificar datos que se envían al backend
      const empleadoData = this.toEmpleadoData(this.nuevoEmpleado);
      
      
      
      this.empleadosService.updateEmpleado(this.selectedEmpleado.id, this.toEmpleadoData(this.nuevoEmpleado)).subscribe({
        next: (empleado) => {
          // El empleado actualizado viene con las relaciones del backend
          
          
          // Actualizar la lista inmediatamente
          const index = this.empleados.findIndex(e => e.id === empleado.id);
          if (index !== -1) {
            // Actualizar el empleado en la lista con los datos completos
            this.empleados[index] = empleado;
          } else {
            // Si no está en la lista, agregarlo
            this.empleados.unshift(empleado);
          }
          
          // Cerrar el modal INMEDIATAMENTE - no esperar por nada
          this.closeCargoSelector();
          
          // Recargar la lista completa en segundo plano para asegurar datos actualizados
          // Sin delay - se ejecuta inmediatamente en background
          this.loadEmpleados();
          
          // Crear tareas automáticas para la edición (en background, NO BLOQUEA - se ejecuta en segundo plano)
          // Usar el empleado que viene del update que ya tiene las relaciones
          // Sin await, sin bloqueo - se ejecuta completamente en background
          this.crearTareasEditarEmpleado(empleado, dispositivosAnterioresIds, dispositivosNuevos, this.keyFieldsChanged).catch(error => {
            // Los errores en la creación de tareas no deben afectar al usuario
            
          });
        },
        error: (error) => {
          
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo actualizar el empleado. Por favor, intente nuevamente.'
          });
        }
      });
    } else {
      // Crear nuevo empleado
      // IMPORTANTE: Guardar los dispositivos ANTES de crear porque el formulario se puede resetear
      const dispositivosParaTareas = [...(this.nuevoEmpleado.dispositivos || [])];
      
      
      this.empleadosService.createEmpleado(this.toEmpleadoData(this.nuevoEmpleado)).subscribe({
        next: (empleado) => {
          // El empleado se creó exitosamente - verificar que realmente tenga datos
          if (!empleado || !empleado.id) {
            
            this.errorModalService.showErrorModal({
              title: 'Error',
              message: 'El empleado se creó pero hubo un problema al obtener los datos. Por favor, recarga la página.'
            });
            return;
          }
          
          
          
          
          // Agregar el nuevo empleado a la lista inmediatamente para actualización instantánea
          this.empleados.unshift(empleado);
          
          // Cerrar el modal INMEDIATAMENTE
          this.closeCargoSelector();
          
          // Recargar la lista completa en segundo plano para asegurar datos actualizados
          // Sin delay - se ejecuta inmediatamente en background
          this.loadEmpleados();
          
          // Crear tareas automáticas para el nuevo empleado (en background, no bloquea la UI)
          // Usar los dispositivos guardados ANTES de crear
          if (dispositivosParaTareas.length > 0) {
            this.crearTareasNuevoEmpleado(empleado, dispositivosParaTareas).catch(error => {
              // Los errores en la creación de tareas no deben afectar al usuario
              
            });
          } else {
            
          }
        },
        error: (error: any) => {
          
          
          // Verificar que el error realmente indica que falló la creación
          // Si el status es 201 o cualquier 2xx, el empleado se creó exitosamente
          if (error?.status >= 200 && error?.status < 300) {
            // Si es un status de éxito, el empleado se creó correctamente
            
            this.loadEmpleados();
            this.closeCargoSelector();
            return;
          }
          
          // Solo mostrar error si realmente falló la creación (status 4xx o 5xx)
          const errorMessage = error?.error?.message || error?.message || 'No se pudo crear el empleado. Por favor, intente nuevamente.';
          
          // Limpiar cualquier modal de error previo antes de mostrar uno nuevo
          this.errorModalService.hideErrorModal();
          
          // Pequeño delay para asegurar que se limpie el modal anterior
          setTimeout(() => {
            this.errorModalService.showErrorModal({
              title: 'Error al crear empleado',
              message: errorMessage
            });
          }, 100);
        }
      });
    }
  }

  editEmpleado(empleado: any): void {
    
    
    
    
    
    
    
    // Log detallado de dispositivos asociados al empleado
    if (empleado.dispositivos && empleado.dispositivos.length > 0) {
      
      empleado.dispositivos.forEach((dispositivo: any, index: number) => {
        
      });
    } else {
      
    }
    
    this.selectedEmpleado = empleado;
    // La cédula del backend viene EXACTAMENTE como está en la BD (puede tener V/E o no)
    // En el formulario de edición, el campo está deshabilitado, así que mostramos la cédula completa
    // tal cual está en la BD (sin dividirla)
    let cedulaCompleta = empleado.cedula || '';
    
    // Quitar puntos de la cédula al cargar para edición
    if (cedulaCompleta) {
      cedulaCompleta = cedulaCompleta.replace(/\./g, '');
    }
    
    // Para edición, mostrar la cédula completa tal cual en el campo
    // (el selector V/E no se muestra en edición según el HTML)
    // Pero mantener cedula_tipo por si acaso se necesita para validaciones internas
    let cedulaTipo = 'V'; // Por defecto (no se usa en edición)
    let cedulaNumero = cedulaCompleta; // Mostrar completa en edición
    
    if (cedulaCompleta && cedulaCompleta.match(/^[VE]/i)) {
      // Si tiene V/E, extraer para referencia interna
      cedulaTipo = cedulaCompleta.charAt(0).toUpperCase();
      cedulaNumero = cedulaCompleta.substring(1);
    }
    // Si NO tiene V/E en la BD, mostrar la cédula completa tal cual
    // IMPORTANTE: En edición, mostrar la cédula completa (con o sin V/E) como está en la BD

    this.nuevoEmpleado = {
      id: empleado.id,
      foto: empleado.foto || '',
      nombre: empleado.nombre,
      cedula: cedulaCompleta, // MOSTRAR LA CÉDULA COMPLETA TAL CUAL EN LA BD (con o sin V/E, sin puntos)
      cedula_tipo: cedulaTipo,
      fecha_ingreso: empleado.fecha_ingreso,
      fecha_cumpleanos: empleado.fecha_cumpleanos,
      sexo: empleado.sexo,
      cargo_id: empleado.cargo_id,
      dispositivos: empleado.dispositivos ? empleado.dispositivos.map((d: any) => d.id) : []
    };
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    // Cargar cargos primero, luego los demás datos
    this.loadUserCargos();
    
    // Mostrar el modal inmediatamente
    this.showCargoModal = true;
    
    // Esperar a que se carguen los cargos antes de cargar dispositivos
    setTimeout(() => {
      // Verificar si el cargo del empleado está en la lista de cargos disponibles
      const cargoEmpleado = this.userCargos.find(cargo => cargo.id === empleado.cargo_id);
      if (!cargoEmpleado && empleado.Cargo) {
        // Si el cargo del empleado no está en la lista, agregarlo
        this.userCargos.push(empleado.Cargo);
      }
      
      this.loadUserDispositivos();
      // Detectar cambios iniciales
      this.detectChanges();
    }, 500); // Aumentar el timeout para asegurar que los cargos se cargan
  }

  deleteEmpleado(id: number): void {
    // Obtener el empleado antes de eliminarlo para crear las tareas
    const empleado = this.empleados.find(e => e.id === id);
    
    

    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este empleado?',
      entity: {
        id: id,
        nombre: empleado?.nombre || 'Empleado',
        tipo: 'Empleado'
      },
      warningText: 'Esta acción eliminará permanentemente el empleado y todos sus datos asociados.',
      onConfirm: () => {
        // Ejecutar la eliminación real
        this.ejecutarEliminacionEmpleado(id, empleado);
      }
    });
  }

  // Método para borrar empleado (soft delete - activo = 0)
  borrarEmpleado(id: number): void {
    // Obtener el empleado antes de borrarlo
    const empleado = this.empleados.find(e => e.id === id);
    
    // MOSTRAR MODAL DE CONFIRMACIÓN PRIMERO
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Borrado',
      message: '¿Está seguro de que desea borrar este empleado?',
      entity: {
        id: id,
        nombre: empleado?.nombre || 'Empleado',
        tipo: 'Empleado'
      },
      warningText: 'Esta acción marcará el empleado como borrado pero conservará sus datos.',
      onConfirm: () => {
        // Ejecutar el borrado (soft delete)
        this.ejecutarBorradoEmpleado(id, empleado);
      }
    });
  }

  // Método auxiliar para ejecutar el borrado (soft delete)
  private ejecutarBorradoEmpleado(id: number, empleado: any) {
    this.empleadosService.borrarEmpleado(id).subscribe({
      next: () => {
        // Remover el empleado de la lista local inmediatamente (ya que el backend hace soft delete)
        this.empleados = this.empleados.filter(empleado => empleado.id !== id);
        
        // Recargar la lista en segundo plano para asegurar datos actualizados
        // Sin delay - se ejecuta inmediatamente en background
        this.loadEmpleados();
      },
      error: (error) => {
        
        if (error.status === 400 && error.error && error.error.relations) {
          this.errorModalService.showErrorModal({
            title: 'Error de Borrado',
            message: 'No se puede borrar este empleado porque tiene las siguientes relaciones:',
            relations: error.error.relations
          });
        } else {
          this.errorModalService.showErrorModal({
            title: 'Error',
            message: 'No se pudo borrar el empleado'
          });
        }
      }
    });
  }

  // Método auxiliar para ejecutar la eliminación real
  private ejecutarEliminacionEmpleado(id: number, empleado: any) {
    const dispositivosIds = empleado?.dispositivos?.map((d: any) => d.id) || [];
    
    this.empleadosService.deleteEmpleado(id).subscribe({
      next: () => {
        // Remover el empleado de la lista inmediatamente
        this.empleados = this.empleados.filter(empleado => empleado.id !== id);
        
        // Recargar la lista en segundo plano para asegurar datos actualizados
        // Sin delay - se ejecuta inmediatamente en background
        this.loadEmpleados();
        
        // Crear tareas automáticas para la eliminación (en background, no bloquea la UI)
        if (empleado && dispositivosIds.length > 0) {
          this.crearTareasEliminarEmpleado(empleado, dispositivosIds).catch(error => {
            // Los errores en la creación de tareas no deben afectar al usuario
            
          });
        }
      },
      error: (error) => {
        
        
        // Si es error 400 con relaciones, mostrar modal global
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el empleado',
            message: error.error.message,
            entity: {
              id: error.error.empleado?.id || id,
              nombre: error.error.empleado?.nombre || empleado?.nombre || 'Empleado',
              tipo: 'Empleado'
            },
            relations: error.error.relations,
            helpText: 'Para eliminar este empleado, primero debe eliminar todos los elementos asociados listados arriba.'
          });
        } else {
          
        }
      }
    });
  }

  loadTareasCount(): void {
    // Obtener el usuario del AuthService
    const user = this.authService.getCurrentUser();
    if (user) {
      this.empleadosService.getTareasByUser(user.id).subscribe({
        next: (tareas: any) => {
          if (!Array.isArray(tareas)) {
            this.tareasCount = 0;
            return;
          }
          // Agrupar Usuario+Foto por empleado/dispositivo/acción para reflejar nuevo conteo visual
          const grouped = this.agruparTareasParaConteo(tareas);
          this.tareasCount = grouped.length;
          
        },
        error: (error) => {
          
          this.tareasCount = 0;
        }
      });
    } else {
      
      this.tareasCount = 0;
    }
  }

  private agruparTareasParaConteo(tareas: any[]): any[] {
    const grupos: { [key: string]: any[] } = {};
    const getBase = (accion: string) => {
      if (!accion) return 'Tarea';
      if (accion.includes('Borrar') || accion.includes('Eliminar')) return 'Eliminar';
      if (accion.includes('Agregar') || accion.includes('Crear')) return 'Agregar';
      if (accion.includes('Editar') || accion.includes('Actualizar')) return 'Editar';
      return 'Tarea';
    };

    for (const t of tareas) {
      const base = getBase(t.accion_realizar);
      const key = [
        t.numero_cedula_empleado,
        t.nombre_dispositivo || t.ip_local_dispositivo || t.ip_publica_dispositivo || t.nombre_sala,
        base
      ].join('|');
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push(t);
    }
    return Object.keys(grupos).map(k => ({ key: k, items: grupos[k] }));
  }

  goToTareas(): void {
    // Obtener el usuario del AuthService
    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate(['/empleados/user', user.id, 'tareas']);
    } else {
      
      
    }
  }

  // ==================== MÉTODOS PARA TAREAS AUTOMÁTICAS ====================

  // Función auxiliar para obtener el usuario logueado
  private getCurrentUser(): any {
    // Obtener del auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      return { id: currentUser.id };
    }
    
    // Si no hay usuario en el auth service, obtener del backend
    return null;
  }

  // Crear tareas para nuevo empleado
  async crearTareasNuevoEmpleado(empleado: any, dispositivosIds: number[]): Promise<void> {
    try {
      

      if (!dispositivosIds || dispositivosIds.length === 0) {
        
        return;
      }

      // Obtener información de los dispositivos
      const dispositivos = await firstValueFrom(this.tareasAutomaticasService.getDispositivosByIds(dispositivosIds));
      

      if (!dispositivos || dispositivos.length === 0) {
        
        return;
      }

      // Obtener ID del usuario logueado
      let user = this.getCurrentUser();
      
      // Si no se pudo obtener del token, obtener del backend
      if (!user) {
        try {
          const userData = await firstValueFrom(this.empleadosService.getCurrentUser());
          user = { id: userData.id };
          
        } catch (error) {
          
          return;
        }
      } else {
        
      }

      // Usar el empleado que ya viene con las relaciones del createEmpleado
      // El backend ya devuelve el empleado con todas las relaciones incluidas (Cargo -> Area -> Departamento -> Sala)
      let empleadoCompleto = empleado;
      
      // Verificar si el empleado tiene las relaciones necesarias
      const tieneRelaciones = empleadoCompleto.Cargo?.Area || empleadoCompleto.Cargo?.Departamento?.Area;
      
      // Solo intentar obtener el empleado completo si no tiene las relaciones necesarias
      if (!tieneRelaciones) {
        try {
          
          empleadoCompleto = await firstValueFrom(this.tareasAutomaticasService.getEmpleadoById(empleado.id));
          
        } catch (error) {
          
          // Continuar con el empleado que tenemos
        }
      }

      // Crear tareas: 3 por cada dispositivo (Agregar Usuario + Agregar Foto + Agregar Tarjeta)
      // Si hay panel (ip_local no vacío y diferente de ip_remota), duplicar tareas para panel (sin foto)
      const tareas = [];
      if (dispositivos && dispositivos.length > 0) {
        for (const dispositivo of dispositivos) {
          
          
          // Obtener área y departamento (la estructura puede variar según el backend)
          // Estructura correcta: Cargo -> Area -> Departamento -> Sala
          const nombreArea = empleadoCompleto.Cargo?.Area?.nombre || 
                          empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '';
          const nombreDepartamento = empleadoCompleto.Cargo?.Area?.Departamento?.nombre || 
                                   empleadoCompleto.Cargo?.Departamento?.nombre || '';
          
          // Detectar si hay panel (ip_local no vacío y diferente de ip_remota)
          const tienePanel = dispositivo.ip_local && 
                           dispositivo.ip_local.trim() !== '' && 
                           dispositivo.ip_local !== dispositivo.ip_remota;
          
          // TAREAS PARA BIOMÉTRICO (ip_remota)
          // Tarea 1: Agregar Usuario (Biométrico)
          const tareaUsuario = {
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula || empleado.cedula,
            nombre_empleado: empleadoCompleto.nombre || empleado.nombre,
            nombre_genero: (empleadoCompleto.sexo || empleado.sexo) === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: nombreArea,
            nombre_departamento: nombreDepartamento,
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Usuario',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          };
          
          tareas.push(tareaUsuario);

          // Tarea 2: Agregar Foto (Solo Biométrico)
          const tareaFoto = {
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula || empleado.cedula,
            nombre_empleado: empleadoCompleto.nombre || empleado.nombre,
            nombre_genero: (empleadoCompleto.sexo || empleado.sexo) === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: nombreArea,
            nombre_departamento: nombreDepartamento,
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Foto',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          };
          
          tareas.push(tareaFoto);

          // Tarea 3: Agregar Tarjeta (Biométrico)
          const tareaTarjeta = {
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula || empleado.cedula,
            nombre_empleado: empleadoCompleto.nombre || empleado.nombre,
            nombre_genero: (empleadoCompleto.sexo || empleado.sexo) === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: nombreArea,
            nombre_departamento: nombreDepartamento,
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Tarjeta',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          };
          
          tareas.push(tareaTarjeta);
          
          // TAREAS PARA PANEL (ip_local) - Solo si hay panel
          if (tienePanel) {
            // Tarea 4: Agregar Usuario (Panel)
            const tareaUsuarioPanel = {
              user_id: user.id,
              numero_cedula_empleado: empleadoCompleto.cedula || empleado.cedula,
              nombre_empleado: empleadoCompleto.nombre || empleado.nombre,
              nombre_genero: (empleadoCompleto.sexo || empleado.sexo) === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: nombreArea,
              nombre_departamento: nombreDepartamento,
              foto_empleado: empleadoCompleto.foto || '',
              ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Agregar Usuario Panel',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            };
            
            tareas.push(tareaUsuarioPanel);

            // Tarea 5: Agregar Tarjeta (Panel) - Panel NO tiene foto
            const tareaTarjetaPanel = {
              user_id: user.id,
              numero_cedula_empleado: empleadoCompleto.cedula || empleado.cedula,
              nombre_empleado: empleadoCompleto.nombre || empleado.nombre,
              nombre_genero: (empleadoCompleto.sexo || empleado.sexo) === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: nombreArea,
              nombre_departamento: nombreDepartamento,
              foto_empleado: empleadoCompleto.foto || '',
              ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Agregar Tarjeta Panel',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            };
            
            tareas.push(tareaTarjetaPanel);
          }
        }
      }

      if (tareas.length === 0) {
        
        return;
      }

      // Crear todas las tareas
      const resultados = await firstValueFrom(this.tareasAutomaticasService.createMultipleTareas(tareas));
      
      
      
      // Actualizar contador de tareas después de crear las tareas
      this.loadTareasCount();
      
    } catch (error: any) {
      // Los errores en la creación de tareas no deben impedir la creación/eliminación del empleado
      // Solo logueamos el error sin mostrar al usuario
      
      
      // Asegurarnos de que no se muestre ningún modal de error por errores en tareas
      // Estos errores son no críticos y no deben afectar la UX
    }
  }

  // Crear tareas para eliminar empleado
  async crearTareasEliminarEmpleado(empleado: any, dispositivosIds: number[]): Promise<void> {
    try {
      
      

      if (dispositivosIds.length === 0) {
        
        return;
      }

      // Usar el empleado que ya tenemos, no intentar obtenerlo después de eliminarlo
      const empleadoCompleto = empleado;
      
      
      
      
      
      

      // Obtener información de los dispositivos
      const dispositivos = await firstValueFrom(this.tareasAutomaticasService.getDispositivosByIds(dispositivosIds));
      

      // Obtener ID del usuario logueado
      const user = this.authService.getCurrentUser();
      if (!user) {
        
        return;
      }

      // Crear tareas: 3 por cada dispositivo (Borrar Tarjeta + Borrar Foto + Borrar Usuario)
      // Si hay panel (ip_local no vacío y diferente de ip_remota), duplicar tareas para panel (sin foto)
      const tareas = [];
      if (dispositivos && dispositivos.length > 0) {
        for (const dispositivo of dispositivos) {
          // Detectar si hay panel (ip_local no vacío y diferente de ip_remota)
          const tienePanel = dispositivo.ip_local && 
                           dispositivo.ip_local.trim() !== '' && 
                           dispositivo.ip_local !== dispositivo.ip_remota;
          
          // TAREAS PARA BIOMÉTRICO (ip_remota)
          // Tarea 1: Borrar Tarjeta (Biométrico)
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula,
            nombre_empleado: empleadoCompleto.nombre,
            nombre_genero: empleadoCompleto.sexo === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
            nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Borrar Tarjeta',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });

          // Tarea 2: Borrar Foto (Solo Biométrico)
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula,
            nombre_empleado: empleadoCompleto.nombre,
            nombre_genero: empleadoCompleto.sexo === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
            nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Borrar Foto',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });

          // Tarea 3: Borrar Usuario (Biométrico)
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula,
            nombre_empleado: empleadoCompleto.nombre,
            nombre_genero: empleadoCompleto.sexo === 'Masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_dispositivo: dispositivo.nombre || '',
            nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
            nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Borrar Usuario',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });
          
          // TAREAS PARA PANEL (ip_local) - Solo si hay panel
          if (tienePanel) {
            // Tarea 4: Borrar Tarjeta (Panel)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleadoCompleto.cedula,
              nombre_empleado: empleadoCompleto.nombre,
              nombre_genero: empleadoCompleto.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
              nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
              foto_empleado: empleadoCompleto.foto || '',
              ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Borrar Tarjeta Panel',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 5: Borrar Usuario (Panel) - Panel NO tiene foto
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleadoCompleto.cedula,
              nombre_empleado: empleadoCompleto.nombre,
              nombre_genero: empleadoCompleto.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
              nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
              foto_empleado: empleadoCompleto.foto || '',
              ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Borrar Usuario Panel',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });
          }
        }
      }

      // Crear todas las tareas
      const resultados = await firstValueFrom(this.tareasAutomaticasService.createMultipleTareas(tareas));
      
      // Actualizar contador de tareas
      this.loadTareasCount();
      
    } catch (error: any) {
      // Los errores en la creación de tareas no deben impedir la creación/eliminación del empleado
      // Solo logueamos el error sin mostrar al usuario
      
      // Asegurarnos de que no se muestre ningún modal de error por errores en tareas
      // Estos errores son no críticos y no deben afectar la UX
    }
  }

  // Crear tareas para editar empleado
  async crearTareasEditarEmpleado(empleado: any, dispositivosAnteriores: number[], dispositivosNuevos: number[], datosClaveCambiaron: boolean): Promise<void> {
    try {
      
      
      

      // Obtener ID del usuario logueado
      const user = this.authService.getCurrentUser();
      if (!user) {
        
        return;
      }
      

      // Calcular dispositivos que se quitan, agregan y permanecen
      const dispositivosQueSeQuitan = dispositivosAnteriores.filter(id => !dispositivosNuevos.includes(id));
      const dispositivosQueSeAgregan = dispositivosNuevos.filter(id => !dispositivosAnteriores.includes(id));
      const dispositivosQuePermanecen = dispositivosAnteriores.filter(id => dispositivosNuevos.includes(id));
      
      
      
      

      
      
      

      const tareas = [];

      // 1. Crear tareas de ELIMINACIÓN para dispositivos que se quitan
      if (dispositivosQueSeQuitan.length > 0) {
        const dispositivosData = await firstValueFrom(this.tareasAutomaticasService.getDispositivosByIds(dispositivosQueSeQuitan));
        
        if (dispositivosData && dispositivosData.length > 0) {
          for (const dispositivo of dispositivosData) {
            // Detectar si hay panel
            const tienePanel = dispositivo.ip_local && 
                             dispositivo.ip_local.trim() !== '' && 
                             dispositivo.ip_local !== dispositivo.ip_remota;
            
            // TAREAS PARA BIOMÉTRICO
            // Tarea 1: Borrar Tarjeta (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Borrar Tarjeta',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 2: Borrar Foto (Solo Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Borrar Foto',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 3: Borrar Usuario (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Borrar Usuario',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });
            
            // TAREAS PARA PANEL - Solo si hay panel
            if (tienePanel) {
              // Tarea 4: Borrar Tarjeta (Panel)
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula,
                nombre_empleado: empleado.nombre,
                nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: empleado.Cargo?.Area?.nombre || '',
                nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Borrar Tarjeta Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });

              // Tarea 5: Borrar Usuario (Panel) - Panel NO tiene foto
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula,
                nombre_empleado: empleado.nombre,
                nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: empleado.Cargo?.Area?.nombre || '',
                nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Borrar Usuario Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });
            }
          }
        }
      }

      // 2. Crear tareas de AGREGAR para dispositivos nuevos
      if (dispositivosQueSeAgregan.length > 0) {
        
        const dispositivosData = await firstValueFrom(this.tareasAutomaticasService.getDispositivosByIds(dispositivosQueSeAgregan));
        
        
        if (dispositivosData && dispositivosData.length > 0) {
          // Obtener área y departamento (la estructura puede variar según el backend)
          const nombreArea = empleado.Cargo?.Area?.nombre || '';
          const nombreDepartamento = empleado.Cargo?.Area?.Departamento?.nombre || '';
          
          for (const dispositivo of dispositivosData) {
            // Detectar si hay panel
            const tienePanel = dispositivo.ip_local && 
                             dispositivo.ip_local.trim() !== '' && 
                             dispositivo.ip_local !== dispositivo.ip_remota;
            
            // TAREAS PARA BIOMÉTRICO
            // Tarea 1: Agregar Usuario (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula || '',
              nombre_empleado: empleado.nombre || '',
              nombre_genero: (empleado.sexo || 'Masculino') === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: nombreArea,
              nombre_departamento: nombreDepartamento,
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Agregar Usuario',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 2: Agregar Foto (Solo Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula || '',
              nombre_empleado: empleado.nombre || '',
              nombre_genero: (empleado.sexo || 'Masculino') === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: nombreArea,
              nombre_departamento: nombreDepartamento,
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Agregar Foto',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 3: Agregar Tarjeta (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula || '',
              nombre_empleado: empleado.nombre || '',
              nombre_genero: (empleado.sexo || 'Masculino') === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: nombreArea,
              nombre_departamento: nombreDepartamento,
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Agregar Tarjeta',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });
            
            // TAREAS PARA PANEL - Solo si hay panel
            if (tienePanel) {
              // Tarea 4: Agregar Usuario (Panel)
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula || '',
                nombre_empleado: empleado.nombre || '',
                nombre_genero: (empleado.sexo || 'Masculino') === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: nombreArea,
                nombre_departamento: nombreDepartamento,
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Agregar Usuario Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });

              // Tarea 5: Agregar Tarjeta (Panel) - Panel NO tiene foto
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula || '',
                nombre_empleado: empleado.nombre || '',
                nombre_genero: (empleado.sexo || 'Masculino') === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: nombreArea,
                nombre_departamento: nombreDepartamento,
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Agregar Tarjeta Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });
            }
          }
        }
      }

      // 3. Crear tareas de EDITAR para dispositivos que permanecen
      //    Solo si cambiaron datos clave (nombre, cédula o foto)
      if (datosClaveCambiaron && dispositivosQuePermanecen.length > 0) {
        const dispositivosData = await firstValueFrom(this.tareasAutomaticasService.getDispositivosByIds(dispositivosQuePermanecen));
        
        
        if (dispositivosData && dispositivosData.length > 0) {
          for (const dispositivo of dispositivosData) {
            // Detectar si hay panel
            const tienePanel = dispositivo.ip_local && 
                             dispositivo.ip_local.trim() !== '' && 
                             dispositivo.ip_local !== dispositivo.ip_remota;
            
            // TAREAS PARA BIOMÉTRICO
            // Tarea 1: Editar Usuario (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Editar Usuario',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 2: Editar Foto (Solo Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Editar Foto',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });

            // Tarea 3: Editar Tarjeta (Biométrico)
            tareas.push({
              user_id: user.id,
              numero_cedula_empleado: empleado.cedula,
              nombre_empleado: empleado.nombre,
              nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
              nombre_cargo: empleado.Cargo?.nombre || '',
              nombre_sala: dispositivo.Sala?.nombre || '',
              nombre_dispositivo: dispositivo.nombre || '',
              nombre_area: empleado.Cargo?.Area?.nombre || '',
              nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
              foto_empleado: empleado.foto || '',
              ip_publica_dispositivo: dispositivo.ip_remota || '',
              ip_local_dispositivo: dispositivo.ip_local || '',
              usuario_login_dispositivo: dispositivo.usuario || '',
              clave_login_dispositivo: dispositivo.clave || '',
              accion_realizar: 'Editar Tarjeta',
              marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
              marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
            });
            
            // TAREAS PARA PANEL - Solo si hay panel
            if (tienePanel) {
              // Tarea 4: Editar Usuario (Panel)
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula,
                nombre_empleado: empleado.nombre,
                nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: empleado.Cargo?.Area?.nombre || '',
                nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Editar Usuario Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });

              // Tarea 5: Editar Tarjeta (Panel) - Panel NO tiene foto
              tareas.push({
                user_id: user.id,
                numero_cedula_empleado: empleado.cedula,
                nombre_empleado: empleado.nombre,
                nombre_genero: empleado.sexo === 'Masculino' ? 'male' : 'female',
                nombre_cargo: empleado.Cargo?.nombre || '',
                nombre_sala: dispositivo.Sala?.nombre || '',
                nombre_dispositivo: dispositivo.nombre || '',
                nombre_area: empleado.Cargo?.Area?.nombre || '',
                nombre_departamento: empleado.Cargo?.Area?.Departamento?.nombre || '',
                foto_empleado: empleado.foto || '',
                ip_publica_dispositivo: dispositivo.ip_local || '', // Usar ip_local para panel
                ip_local_dispositivo: dispositivo.ip_local || '',
                usuario_login_dispositivo: dispositivo.usuario || '',
                clave_login_dispositivo: dispositivo.clave || '',
                accion_realizar: 'Editar Tarjeta Panel',
                marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
                marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
              });
            }
          }
        }
      }

      
      
      
      
      
      
      if (tareas.length === 0) {
        
        return;
      }

      
      
      // Crear todas las tareas
      const resultados = await firstValueFrom(this.tareasAutomaticasService.createMultipleTareas(tareas));
      
      
      
      // Actualizar contador de tareas después de crear las tareas
      this.loadTareasCount();
      
    } catch (error: any) {
      // Los errores en la creación de tareas no deben impedir la creación/eliminación del empleado
      // Solo logueamos el error sin mostrar al usuario
      
      
      // Asegurarnos de que no se muestre ningún modal de error por errores en tareas
      // Estos errores son no críticos y no deben afectar la UX
    }
  }

  isFotoValid(): boolean {
    // Si se está editando la foto (crear o editar), la validación queda en false hasta que se procese
    if (this.editandoFoto) {
      return false;
    }
    
    // Para crear empleado, la foto es requerida
    if (!this.selectedEmpleado) {
      return !!(this.nuevoEmpleado.foto && this.nuevoEmpleado.foto.trim() !== '');
    }
    
    // Para editar empleado:
    // - Si ya tiene foto existente, está bien
    // - Si no tiene foto existente, debe tener foto nueva
    const tieneFotoExistente = this.selectedEmpleado.foto && this.selectedEmpleado.foto.trim() !== '';
    const tieneFotoNueva = this.nuevoEmpleado.foto && this.nuevoEmpleado.foto.trim() !== '';
    
    return tieneFotoExistente || tieneFotoNueva;
  }

  isFormValid(): boolean {
    // Validaciones básicas del formulario
    const formValid = !!(this.nuevoEmpleado.nombre && 
                        this.nuevoEmpleado.cedula && 
                        this.nuevoEmpleado.fecha_ingreso && 
                        this.nuevoEmpleado.fecha_cumpleanos && 
                        this.nuevoEmpleado.sexo && 
                        this.nuevoEmpleado.cargo_id);
    
    // Validación de foto
    const fotoValid = this.isFotoValid();
    
    // Validación de cédula
    const cedulaValid = !this.cedulaError && !this.validandoCedula;
    
    // Los dispositivos NO son requeridos - pueden ser 0, 1, 2 o N
    
    // Para edición ya no bloqueamos por falta de cambios (backend gestiona tareas)
    return formValid && fotoValid && cedulaValid;
  }

  validarCedula(): void {
    // Limpiar error anterior
    this.cedulaError = '';
    
    // Si está vacía, no validar
    if (!this.nuevoEmpleado.cedula || this.nuevoEmpleado.cedula.trim() === '') {
      return;
    }
    
    // Si es edición, no validar (la cédula está deshabilitada)
    if (this.selectedEmpleado) {
      return;
    }
    
    // Mostrar spinner de validación
    this.validandoCedula = true;
    
    // Debounce: esperar 500ms después del último keystroke
    setTimeout(() => {
      if (this.nuevoEmpleado.cedula.trim() === '') {
        this.validandoCedula = false;
        return;
      }
      
      // Construir cédula completa con prefijo para validación
      const cedulaCompleta = (this.nuevoEmpleado.cedula_tipo || 'V') + this.nuevoEmpleado.cedula.trim();
      
      // Verificar si la cédula ya existe
      this.empleadosService.verificarCedula(cedulaCompleta).subscribe({
        next: (response: any) => {
          this.validandoCedula = false;
          if (response.existe) {
            this.cedulaError = 'Esta cédula se encuentra registrada';
          }
        },
        error: (error) => {
          this.validandoCedula = false;
          
          // En caso de error, permitir continuar
        }
      });
    }, 500);
  }

  onCedulaKeyPress(event: KeyboardEvent): void {
    // Solo permitir números - bloquear puntos y otros caracteres
    const charCode = event.which ? event.which : event.keyCode;
    // Permitir solo números (48-57)
    // Bloquear punto (46), coma (44) y cualquier otro carácter
    if (charCode < 48 || charCode > 57) {
      event.preventDefault();
    }
  }

  limpiarPuntosCedula(): void {
    // Si no es edición, permitir solo dígitos (remueve puntos, letras, guiones, etc.)
    if (!this.selectedEmpleado && this.nuevoEmpleado.cedula) {
      this.nuevoEmpleado.cedula = this.nuevoEmpleado.cedula.replace(/\D+/g, '');
    }
  }

  onCedulaPaste(event: ClipboardEvent): void {
    if (this.selectedEmpleado) { return; }
    event.preventDefault();
    const clipboard = event.clipboardData?.getData('text') || '';
    const digitsOnly = clipboard.replace(/\D+/g, '');
    const target = event.target as HTMLInputElement;
    const start = target.selectionStart || 0;
    const end = target.selectionEnd || 0;
    const current = this.nuevoEmpleado.cedula || '';
    this.nuevoEmpleado.cedula = current.slice(0, start) + digitsOnly + current.slice(end);
    this.detectChanges();
    this.validarCedula();
  }

  calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '-';
    
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    
    return edad + ' años';
  }

  calcularAntiguedad(fechaIngreso: string): string {
    if (!fechaIngreso) return '-';
    
    const hoy = new Date();
    const ingreso = new Date(fechaIngreso);
    let años = hoy.getFullYear() - ingreso.getFullYear();
    let meses = hoy.getMonth() - ingreso.getMonth();
    
    if (meses < 0) {
      años--;
      meses += 12;
    }
    
    if (años > 0 && meses > 0) {
      return `${años} año${años > 1 ? 's' : ''}, ${meses} mes${meses > 1 ? 'es' : ''}`;
    } else if (años > 0) {
      return `${años} año${años > 1 ? 's' : ''}`;
    } else if (meses > 0) {
      return `${meses} mes${meses > 1 ? 'es' : ''}`;
    } else {
      return 'Menos de 1 mes';
    }
  }

}
