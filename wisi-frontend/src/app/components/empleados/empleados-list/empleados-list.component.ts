import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { BiometricImageService } from '../../../services/biometric-image.service';
import { ImageValidationService } from '../../../services/image-validation.service';
import { Router } from '@angular/router';
import { PermissionsService } from '../../../services/permissions.service';
import { TareasAutomaticasService } from '../../../services/tareas-automaticas.service';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';

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
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Cargo</th>
              <th>Primer Día Horario</th>
              <th>Horario</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img 
                  *ngIf="empleado.foto" 
                  [src]="'data:image/jpeg;base64,' + empleado.foto" 
                  alt="Foto del empleado"
                  class="employee-photo"
                />
                <span *ngIf="!empleado.foto" class="no-photo">Sin foto</span>
              </td>
              <td>{{ empleado.nombre }}</td>
              <td>{{ empleado.cedula }}</td>
              <td>{{ empleado.Cargo?.nombre || 'Sin asignar' }}</td>
              <td>{{ formatDate(empleado.primer_dia_horario) || 'Sin asignar' }}</td>
              <td>{{ empleado.Horario?.nombre || 'Sin asignar' }}</td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit()"
                  [disabled]="!canEdit()"
                  (click)="canEdit() ? editEmpleado(empleado) : null">
                  Editar
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

      <div *ngIf="empleados.length === 0" class="no-data">
        <p>No hay empleados registrados</p>
      </div>

      <!-- Modal para crear empleado -->
      <div *ngIf="showCargoModal" class="modal-overlay" (click)="closeCargoSelector()">
        <div class="modal-content" (click)="$event.stopPropagation()">
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
                <input 
                  type="text" 
                  id="cedulaEmpleado" 
                  name="cedulaEmpleado"
                  [(ngModel)]="nuevoEmpleado.cedula"
                  class="form-control"
                  placeholder="Ingrese la cédula"
                  required
                />
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
                  (change)="onCargoChange()"
                  class="form-control"
                  required
                >
                  <option value="">Seleccione un cargo</option>
                  <option *ngFor="let cargo of userCargos" [value]="cargo.id">
                    {{ cargo.nombre }} ({{ cargo.Departamento?.Area?.Sala?.nombre || 'Sin sala' }})
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
                      [checked]="nuevoEmpleado.dispositivos.includes(dispositivo.id)"
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
                  <span *ngIf="nuevoEmpleado.cargo_id && userDispositivos.length > 0">Selecciona uno o varios dispositivos de la sala</span>
                  <span *ngIf="nuevoEmpleado.cargo_id && userDispositivos.length === 0">Esta sala no tiene dispositivos disponibles</span>
                </small>
              </div>
              

              <div class="form-group">
                <label for="horarioSelect">Horario:</label>
                <select 
                  id="horarioSelect" 
                  name="horarioSelect"
                  [(ngModel)]="nuevoEmpleado.horario_id"
                  class="form-control"
                >
                  <option value="">Seleccione un horario</option>
                  <option *ngFor="let horario of userHorarios" [value]="horario.id">
                    {{ horario.nombre }} ({{ horario.Sala?.nombre || 'Sin sala' }})
                  </option>
                </select>
              </div>


              <div class="form-group">
                <label for="primerDiaHorario">Primer Día del Horario:</label>
                <input 
                  type="date" 
                  id="primerDiaHorario" 
                  name="primerDiaHorario"
                  [(ngModel)]="nuevoEmpleado.primer_dia_horario"
                  class="form-control"
                />
              </div>
              
              
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeCargoSelector()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!empleadoForm.form.valid">
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

    .employee-photo {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .no-photo {
      color: #6c757d;
      font-style: italic;
      font-size: 12px;
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
  userCargos: any[] = [];
  userHorarios: any[] = [];
  userDispositivos: any[] = [];
  tareasCount: number = 0;
  dispositivosAnteriores: number[] = [];
  dispositivosNuevos: number[] = [];
  showCargoModal = false;
  selectedEmpleado: any = null;
  nuevoEmpleado = {
    id: null,
    foto: '',
    nombre: '',
    cedula: '',
    fecha_ingreso: '',
    fecha_cumpleanos: '',
    sexo: '',
    cargo_id: null,
    primer_dia_horario: '',
    horario_id: null,
    dispositivos: [] as number[]
  };

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

  private readonly EMPLEADOS_MODULE_ID = 1; // Módulo RRHH
  private permissionsSubscription?: Subscription;

  constructor(
    private empleadosService: EmpleadosService,
    private biometricImageService: BiometricImageService,
    private imageValidationService: ImageValidationService,
    private permissionsService: PermissionsService,
    private router: Router,
    private tareasAutomaticasService: TareasAutomaticasService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEmpleados();
    
    // Esperar a que el usuario esté disponible antes de cargar tareas
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadTareasCount();
      }
    });
    
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(() => {
      // Los permisos se actualizan automáticamente
    });
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  canAdd(): boolean {
    return this.permissionsService.hasPermission(this.EMPLEADOS_MODULE_ID, 'AGREGAR');
  }

  canEdit(): boolean {
    return this.permissionsService.hasPermission(this.EMPLEADOS_MODULE_ID, 'EDITAR');
  }

  canDelete(): boolean {
    return this.permissionsService.hasPermission(this.EMPLEADOS_MODULE_ID, 'BORRAR');
  }

  loadEmpleados(): void {
    this.empleadosService.getEmpleados().subscribe({
      next: (empleados) => {
        this.empleados = empleados;
      },
      error: (error) => {
        console.error('Error cargando empleados:', error);
        alert('Error cargando empleados');
      }
    });
  }

  showCargoSelector(): void {
    this.loadUserCargos();
    this.loadUserHorarios();
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
    console.log('🔍 Cargando cargos...');
    this.empleadosService.getUserCargos().subscribe({
      next: (cargos) => {
        console.log('✅ Cargos cargados:', cargos);
        this.userCargos = cargos;
      },
      error: (error) => {
        console.error('❌ Error cargando cargos:', error);
        alert('Error cargando cargos');
      }
    });
  }

  loadUserHorarios(): void {
    this.empleadosService.getUserHorarios().subscribe({
      next: (horarios: any[]) => {
        this.userHorarios = horarios;
      },
      error: (error: any) => {
        console.error('Error cargando horarios:', error);
        alert('Error cargando horarios');
      }
    });
  }

  loadUserDispositivos(): void {
    // Solo cargar dispositivos si hay un cargo seleccionado
    if (this.nuevoEmpleado.cargo_id) {
      console.log('🔍 Cargando dispositivos para cargo ID:', this.nuevoEmpleado.cargo_id, 'tipo:', typeof this.nuevoEmpleado.cargo_id);
      console.log('🔍 Cargos disponibles:', this.userCargos);
      console.log('🔍 Primeros 3 cargos con sus IDs:', this.userCargos.slice(0, 3).map(c => ({ id: c.id, tipo: typeof c.id, nombre: c.nombre })));
      
      // Buscar el cargo seleccionado (manejar tanto string como number)
      const cargoSeleccionado = this.userCargos.find(cargo => 
        cargo.id == this.nuevoEmpleado.cargo_id || 
        cargo.id === Number(this.nuevoEmpleado.cargo_id) ||
        Number(cargo.id) === this.nuevoEmpleado.cargo_id
      );
      console.log('🔍 Cargo seleccionado:', cargoSeleccionado);
      
      if (cargoSeleccionado) {
        this.empleadosService.getUserDispositivos().subscribe({
          next: (dispositivos: any[]) => {
            console.log('🔍 Todos los dispositivos:', dispositivos);
            
            // Filtrar dispositivos por la sala del cargo seleccionado
            if (cargoSeleccionado.Departamento?.Area?.Sala?.id) {
              const salaId = cargoSeleccionado.Departamento.Area.Sala.id;
              console.log('🔍 Filtrando por sala ID:', salaId);
              
              this.userDispositivos = dispositivos.filter(dispositivo => {
                console.log('🔍 Dispositivo:', dispositivo.nombre, 'Sala ID:', dispositivo.Sala?.id, 'Coincide:', dispositivo.Sala?.id === salaId);
                return dispositivo.Sala?.id === salaId;
              });
              
              console.log('🔍 Dispositivos filtrados:', this.userDispositivos);
              console.log('🔍 Dispositivos ya seleccionados del empleado:', this.nuevoEmpleado.dispositivos);
            } else {
              console.log('❌ No se encontró sala en el cargo');
              this.userDispositivos = [];
            }
          },
          error: (error: any) => {
            console.error('Error cargando dispositivos:', error);
            alert('Error cargando dispositivos');
          }
        });
      } else {
        console.log('❌ No se encontró el cargo seleccionado');
        this.userDispositivos = [];
      }
    } else {
      this.userDispositivos = [];
    }
  }

  onCargoChange(): void {
    // Limpiar dispositivos seleccionados cuando cambie el cargo
    this.nuevoEmpleado.dispositivos = [];
    // Cargar dispositivos de la nueva sala
    this.loadUserDispositivos();
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
  }

  resetForm(): void {
    // Solo resetear si no hay imagen cargada
    if (!this.originalImage && !this.nuevoEmpleado.foto) {
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      this.nuevoEmpleado = {
        id: null,
        foto: '',
        nombre: '',
        cedula: '',
        fecha_ingreso: todayString,
        fecha_cumpleanos: todayString,
        sexo: '',
        cargo_id: null,
        primer_dia_horario: todayString,
        horario_id: null,
        dispositivos: []
      };
      
      // Limpiar variables de procesamiento de imagen solo si no hay imagen
      this.originalImage = '';
      this.processingMessage = '';
      this.initialValidation = null;
      this.isInitialValidating = false;
    } else {
      // Si hay imagen, solo resetear campos básicos pero mantener la imagen
      const today = new Date();
      const todayString = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      this.nuevoEmpleado.id = null;
      this.nuevoEmpleado.nombre = '';
      this.nuevoEmpleado.cedula = '';
      this.nuevoEmpleado.fecha_ingreso = todayString;
      this.nuevoEmpleado.fecha_cumpleanos = todayString;
      this.nuevoEmpleado.sexo = '';
      this.nuevoEmpleado.cargo_id = null;
      this.nuevoEmpleado.primer_dia_horario = todayString;
      this.nuevoEmpleado.horario_id = null;
      this.nuevoEmpleado.dispositivos = [];
    }
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
        // Verificar que sea una imagen válida
        if (!file.type.startsWith('image/')) {
          alert('Por favor selecciona un archivo de imagen válido');
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
            alert('Esta imagen no es válida para un empleado. Por favor selecciona una foto de una persona.');
          }
          
          this.isInitialValidating = false;
        };
        reader.readAsDataURL(file);
        
      } catch (error) {
        console.error('Error cargando imagen:', error);
        alert('Error cargando la imagen. Intente con otra foto');
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

    console.log('Información de calidad de imagen:', quality);
    // No mostrar alert para calidad buena/excelente, solo log
    if (quality.imageQuality === 'poor' || quality.imageQuality === 'fair') {
      alert(message);
    }
  }

  showErrorDetails(error: string, quality?: any): void {
    let message = `❌ ${error}`;
    
    if (quality && quality.recommendations && quality.recommendations.length > 0) {
      message += '\n\nRecomendaciones:\n• ' + quality.recommendations.join('\n• ');
    }

    alert(message);
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
        
        console.log('Datos de recorte FINALES:', {
          cropData: this.cropData,
          canvasWidth, canvasHeight,
          scaledWidth, scaledHeight, offsetX, offsetY,
          imageOffsetX: this.cropData.imageOffsetX,
          imageOffsetY: this.cropData.imageOffsetY,
          finalX, finalY, finalWidth, finalHeight,
          finalX_clamped, finalY_clamped,
          imgWidth: img.width, imgHeight: img.height
        });
        
        // Verificar que las coordenadas no sean negativas o inválidas
        if (finalX_clamped < 0 || finalY_clamped < 0 || finalWidth <= 0 || finalHeight <= 0) {
          console.error('Coordenadas de recorte inválidas!');
          return;
        }
        
        if (finalX_clamped + finalWidth > img.width || finalY_clamped + finalHeight > img.height) {
          console.error('Recorte se sale de la imagen!');
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
        console.log('Imagen procesada guardada:', compressedBase64.substring(0, 50) + '...');
        
        // Limpiar variables de procesamiento
        this.processingMessage = '';
        this.initialValidation = null;
        this.isInitialValidating = false;
        
        // Limpiar originalImage después de guardar
        setTimeout(() => {
          this.originalImage = '';
        }, 100);
      };
      img.src = this.originalImage;
      
    } catch (error) {
      console.error('Error procesando imagen recortada:', error);
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
    this.nuevoEmpleado.foto = '';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES');
  }

  createEmpleado(): void {
    if (this.selectedEmpleado) {
      // Actualizar empleado existente
      console.log('🔄 Actualizando empleado:', this.nuevoEmpleado);
      
      // Obtener dispositivos anteriores y nuevos
      const dispositivosAnteriores = this.selectedEmpleado.dispositivos?.map((d: any) => d.id) || [];
      const dispositivosNuevos = this.nuevoEmpleado.dispositivos || [];
      
      console.log('🔄 Dispositivos anteriores:', dispositivosAnteriores);
      console.log('🔄 Dispositivos nuevos:', dispositivosNuevos);
      
      this.empleadosService.updateEmpleado(this.selectedEmpleado.id, this.nuevoEmpleado).subscribe({
        next: async (empleado) => {
          console.log('✅ Empleado actualizado:', empleado);
          const index = this.empleados.findIndex(e => e.id === empleado.id);
          if (index !== -1) {
            // Actualizar el empleado en la lista con los datos completos
            this.empleados[index] = empleado;
            console.log('🔄 Lista de empleados actualizada');
          }
          
          // Crear tareas automáticas para la edición
          await this.crearTareasEditarEmpleado(empleado, dispositivosAnteriores, dispositivosNuevos);
          
          this.closeCargoSelector();
          // Pequeño delay para asegurar que el backend haya procesado los cambios
          setTimeout(() => {
            this.loadEmpleados();
          }, 500);
          alert('Empleado actualizado exitosamente');
        },
        error: (error) => {
          console.error('Error actualizando empleado:', error);
          alert('Error actualizando empleado');
        }
      });
    } else {
      // Crear nuevo empleado
      console.log('🔄 Creando empleado:', this.nuevoEmpleado);
      this.empleadosService.createEmpleado(this.nuevoEmpleado).subscribe({
        next: async (empleado) => {
          console.log('✅ Empleado creado:', empleado);
          this.empleados.unshift(empleado);
          
          // Crear tareas automáticas para el nuevo empleado
          console.log('🔄 Llamando a crearTareasNuevoEmpleado...');
          console.log('🔄 Dispositivos del nuevo empleado:', this.nuevoEmpleado.dispositivos);
          await this.crearTareasNuevoEmpleado(empleado, this.nuevoEmpleado.dispositivos || []);
          
          this.closeCargoSelector();
          alert('Empleado creado exitosamente');
        },
        error: (error) => {
          console.error('Error creando empleado:', error);
          alert('Error creando empleado');
        }
      });
    }
  }

  editEmpleado(empleado: any): void {
    console.log('🔍 Editando empleado:', empleado);
    console.log('🔍 Dispositivos del empleado:', empleado.dispositivos);
    
    // Log detallado de dispositivos asociados al empleado
    if (empleado.dispositivos && empleado.dispositivos.length > 0) {
      console.log('📱 DISPOSITIVOS ASOCIADOS AL EMPLEADO:');
      empleado.dispositivos.forEach((dispositivo: any, index: number) => {
        console.log(`📱 Dispositivo ${index + 1}:`, {
          id: dispositivo.id,
          nombre: dispositivo.nombre,
          sala: dispositivo.sala_nombre || 'Sin sala',
          ip_local: dispositivo.ip_local,
          ip_remota: dispositivo.ip_remota
        });
      });
    } else {
      console.log('📱 El empleado NO tiene dispositivos asociados');
    }
    
    this.selectedEmpleado = empleado;
    this.nuevoEmpleado = {
      id: empleado.id,
      foto: empleado.foto || '',
      nombre: empleado.nombre,
      cedula: empleado.cedula,
      fecha_ingreso: empleado.fecha_ingreso,
      fecha_cumpleanos: empleado.fecha_cumpleanos,
      sexo: empleado.sexo,
      cargo_id: empleado.cargo_id,
      primer_dia_horario: empleado.primer_dia_horario || '',
      horario_id: empleado.horario_id || null,
      dispositivos: empleado.dispositivos ? empleado.dispositivos.map((d: any) => d.id) : []
    };
    
    console.log('🔍 Dispositivos mapeados (IDs):', this.nuevoEmpleado.dispositivos);
    
    // Cargar cargos primero, luego los demás datos
    this.loadUserCargos();
    this.loadUserHorarios();
    
    // Esperar a que se carguen los cargos antes de cargar dispositivos
    setTimeout(() => {
      this.loadUserDispositivos();
    }, 100);
    
    this.showCargoModal = true;
  }

  deleteEmpleado(id: number): void {
    if (confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      // Obtener el empleado antes de eliminarlo para crear las tareas
      const empleado = this.empleados.find(e => e.id === id);
      const dispositivosIds = empleado?.dispositivos?.map((d: any) => d.id) || [];
      
      console.log('🗑️ Eliminando empleado:', empleado?.nombre);
      console.log('🗑️ Dispositivos asociados:', dispositivosIds);
      
      this.empleadosService.deleteEmpleado(id).subscribe({
        next: async () => {
          // Crear tareas automáticas para la eliminación ANTES de eliminar del frontend
          if (empleado && dispositivosIds.length > 0) {
            await this.crearTareasEliminarEmpleado(empleado, dispositivosIds);
          }
          
          this.empleados = this.empleados.filter(empleado => empleado.id !== id);
          alert('Empleado eliminado exitosamente');
        },
        error: (error) => {
          console.error('Error eliminando empleado:', error);
          alert('Error eliminando empleado');
        }
      });
    }
  }

  loadTareasCount(): void {
    // Obtener el usuario del AuthService
    const user = this.authService.getCurrentUser();
    if (user) {
      this.empleadosService.getTareasByUser(user.id).subscribe({
        next: (tareas: any) => {
          this.tareasCount = Array.isArray(tareas) ? tareas.length : 0;
          console.log('Tareas cargadas:', this.tareasCount);
        },
        error: (error) => {
          console.error('Error cargando tareas:', error);
          this.tareasCount = 0;
        }
      });
    } else {
      console.log('Usuario no disponible aún, tareas en 0');
      this.tareasCount = 0;
    }
  }

  goToTareas(): void {
    // Obtener el usuario del AuthService
    const user = this.authService.getCurrentUser();
    if (user) {
      this.router.navigate(['/super-config/tareas', user.id]);
    } else {
      console.error('No se encontró información del usuario logueado');
      alert('Error: No se encontró información del usuario');
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
      console.log('🔄 Creando tareas para nuevo empleado:', empleado.nombre);
      console.log('🔄 Dispositivos seleccionados:', dispositivosIds);
      console.log('🔄 Empleado completo:', empleado);

      if (dispositivosIds.length === 0) {
        console.log('⚠️ No hay dispositivos seleccionados, no se crearán tareas');
        return;
      }

      // Obtener información de los dispositivos
      const dispositivos = await this.tareasAutomaticasService.getDispositivosByIds(dispositivosIds).toPromise();
      console.log('🔄 Dispositivos obtenidos:', dispositivos);

      // Obtener ID del usuario logueado
      let user = this.getCurrentUser();
      
      // Si no se pudo obtener del token, obtener del backend
      if (!user) {
        try {
          const userData = await this.empleadosService.getCurrentUser().toPromise();
          user = { id: userData.id };
          console.log('🔍 Usuario obtenido del backend:', user);
        } catch (error) {
          console.error('❌ Error obteniendo usuario del backend:', error);
          return;
        }
      } else {
        console.log('🔍 Usuario obtenido del token:', user);
      }

        // Obtener información completa del empleado con relaciones
        const empleadoCompleto = await this.tareasAutomaticasService.getEmpleadoById(empleado.id).toPromise();
        console.log('🔍 Empleado completo obtenido:', empleadoCompleto);
        console.log('🔍 Cargo del empleado:', empleadoCompleto.Cargo);
        console.log('🔍 Departamento del cargo:', empleadoCompleto.Cargo?.Departamento);
        console.log('🔍 Area del departamento:', empleadoCompleto.Cargo?.Departamento?.Area);

        // Crear tareas: 2 por cada dispositivo (Agregar Usuario + Agregar Foto)
        const tareas = [];
        if (dispositivos && dispositivos.length > 0) {
          for (const dispositivo of dispositivos) {
          console.log('🔧 Procesando dispositivo:', dispositivo.nombre);
          
          // Tarea 1: Agregar Usuario
          const tareaUsuario = {
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula,
            nombre_empleado: empleadoCompleto.nombre,
            nombre_genero: empleadoCompleto.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
            nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Usuario',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          };
          console.log('🔧 Tarea Usuario creada:', tareaUsuario);
          tareas.push(tareaUsuario);

          // Tarea 2: Agregar Foto
          const tareaFoto = {
            user_id: user.id,
            numero_cedula_empleado: empleadoCompleto.cedula,
            nombre_empleado: empleadoCompleto.nombre,
            nombre_genero: empleadoCompleto.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleadoCompleto.Cargo?.Departamento?.Area?.nombre || '',
            nombre_departamento: empleadoCompleto.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleadoCompleto.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Foto',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          };
          console.log('🔧 Tarea Foto creada:', tareaFoto);
          tareas.push(tareaFoto);
          }
        }

      console.log(`🔄 Creando ${tareas.length} tareas para ${dispositivosIds.length} dispositivos`);
      console.log('🔄 Tareas a crear:', tareas);
      
      // Crear todas las tareas
      const resultados = await this.tareasAutomaticasService.createMultipleTareas(tareas).toPromise();
      console.log('✅ Resultados de creación de tareas:', resultados);
      
      console.log('✅ Tareas creadas exitosamente');
      
      // Actualizar contador de tareas
      this.loadTareasCount();
      
    } catch (error) {
      console.error('❌ Error creando tareas para nuevo empleado:', error);
    }
  }

  // Crear tareas para eliminar empleado
  async crearTareasEliminarEmpleado(empleado: any, dispositivosIds: number[]): Promise<void> {
    try {
      console.log('🗑️ Creando tareas para eliminar empleado:', empleado.nombre);
      console.log('🗑️ Dispositivos asociados:', dispositivosIds);

      if (dispositivosIds.length === 0) {
        console.log('⚠️ No hay dispositivos asociados, no se crearán tareas');
        return;
      }

      // Obtener información completa del empleado con relaciones ANTES de eliminarlo
      const empleadoCompleto = await this.tareasAutomaticasService.getEmpleadoById(empleado.id).toPromise();
      console.log('🔍 Empleado completo para eliminación:', empleadoCompleto);
      console.log('🔍 Cargo del empleado:', empleadoCompleto.Cargo);
      console.log('🔍 Departamento del cargo:', empleadoCompleto.Cargo?.Departamento);
      console.log('🔍 Area del departamento:', empleadoCompleto.Cargo?.Departamento?.Area);
      console.log('🔍 Nombre del área:', empleadoCompleto.Cargo?.Departamento?.Area?.nombre);
      console.log('🔍 Estructura completa del cargo:', JSON.stringify(empleadoCompleto.Cargo, null, 2));

      // Obtener información de los dispositivos
      const dispositivos = await this.tareasAutomaticasService.getDispositivosByIds(dispositivosIds).toPromise();
      console.log('🗑️ Dispositivos obtenidos:', dispositivos);

      // Obtener ID del usuario logueado
      const user = this.authService.getCurrentUser();
      if (!user) {
        console.log('⚠️ Usuario no disponible aún');
        return;
      }

      // Crear tareas: 2 por cada dispositivo (Borrar Usuario + Borrar Foto)
      const tareas = [];
      if (dispositivos && dispositivos.length > 0) {
        for (const dispositivo of dispositivos) {
        // Tarea 1: Borrar Usuario
        tareas.push({
          user_id: user.id,
          numero_cedula_empleado: empleadoCompleto.cedula,
          nombre_empleado: empleadoCompleto.nombre,
          nombre_genero: empleadoCompleto.sexo === 'masculino' ? 'male' : 'female',
          nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
          nombre_sala: dispositivo.Sala?.nombre || '',
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

        // Tarea 2: Borrar Foto
        tareas.push({
          user_id: user.id,
          numero_cedula_empleado: empleadoCompleto.cedula,
          nombre_empleado: empleadoCompleto.nombre,
          nombre_genero: empleadoCompleto.sexo === 'masculino' ? 'male' : 'female',
          nombre_cargo: empleadoCompleto.Cargo?.nombre || '',
          nombre_sala: dispositivo.Sala?.nombre || '',
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
        }
      }

      console.log(`🗑️ Creando ${tareas.length} tareas para ${dispositivosIds.length} dispositivos`);
      console.log('🗑️ Tareas de eliminación a crear:', tareas);
      
      // Crear todas las tareas
      const resultados = await this.tareasAutomaticasService.createMultipleTareas(tareas).toPromise();
      console.log('✅ Resultados de eliminación de tareas:', resultados);
      
      console.log('✅ Tareas de eliminación creadas exitosamente');
      
      // Actualizar contador de tareas
      this.loadTareasCount();
      
    } catch (error) {
      console.error('❌ Error creando tareas para eliminar empleado:', error);
    }
  }

  // Crear tareas para editar empleado
  async crearTareasEditarEmpleado(empleado: any, dispositivosAnteriores: number[], dispositivosNuevos: number[]): Promise<void> {
    try {
      console.log('✏️ Creando tareas para editar empleado:', empleado.nombre);
      console.log('✏️ Dispositivos anteriores:', dispositivosAnteriores);
      console.log('✏️ Dispositivos nuevos:', dispositivosNuevos);

      // Obtener ID del usuario logueado
      const user = this.authService.getCurrentUser();
      if (!user) {
        console.log('⚠️ Usuario no disponible aún');
        return;
      }

      const tareas = [];

      // 1. Crear tareas de eliminación para dispositivos anteriores
      if (dispositivosAnteriores.length > 0) {
        const dispositivosAnterioresData = await this.tareasAutomaticasService.getDispositivosByIds(dispositivosAnteriores).toPromise();
        
        if (dispositivosAnterioresData && dispositivosAnterioresData.length > 0) {
          for (const dispositivo of dispositivosAnterioresData) {
          // Tarea: Borrar Usuario
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleado.cedula,
            nombre_empleado: empleado.nombre,
            nombre_genero: empleado.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleado.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleado.Cargo?.Area?.nombre || '',
            nombre_departamento: empleado.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleado.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Borrar Usuario',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });

          // Tarea: Borrar Foto
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleado.cedula,
            nombre_empleado: empleado.nombre,
            nombre_genero: empleado.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleado.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleado.Cargo?.Area?.nombre || '',
            nombre_departamento: empleado.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleado.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Borrar Foto',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });
          }
        }
      }

      // 2. Crear tareas de creación para dispositivos nuevos
      if (dispositivosNuevos.length > 0) {
        const dispositivosNuevosData = await this.tareasAutomaticasService.getDispositivosByIds(dispositivosNuevos).toPromise();
        
        if (dispositivosNuevosData && dispositivosNuevosData.length > 0) {
          for (const dispositivo of dispositivosNuevosData) {
          // Tarea: Agregar Usuario
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleado.cedula,
            nombre_empleado: empleado.nombre,
            nombre_genero: empleado.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleado.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleado.Cargo?.Area?.nombre || '',
            nombre_departamento: empleado.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleado.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Usuario',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });

          // Tarea: Agregar Foto
          tareas.push({
            user_id: user.id,
            numero_cedula_empleado: empleado.cedula,
            nombre_empleado: empleado.nombre,
            nombre_genero: empleado.sexo === 'masculino' ? 'male' : 'female',
            nombre_cargo: empleado.Cargo?.nombre || '',
            nombre_sala: dispositivo.Sala?.nombre || '',
            nombre_area: empleado.Cargo?.Area?.nombre || '',
            nombre_departamento: empleado.Cargo?.Departamento?.nombre || '',
            foto_empleado: empleado.foto || '',
            ip_publica_dispositivo: dispositivo.ip_remota || '',
            ip_local_dispositivo: dispositivo.ip_local || '',
            usuario_login_dispositivo: dispositivo.usuario || '',
            clave_login_dispositivo: dispositivo.clave || '',
            accion_realizar: 'Agregar Foto',
            marcaje_empleado_inicio_dispositivo: dispositivo.marcaje_inicio || '',
            marcaje_empleado_fin_dispositivo: dispositivo.marcaje_fin || ''
          });
          }
        }
      }

      console.log(`✏️ Creando ${tareas.length} tareas totales`);
      console.log(`✏️ - ${dispositivosAnteriores.length * 2} tareas de eliminación`);
      console.log(`✏️ - ${dispositivosNuevos.length * 2} tareas de creación`);
      console.log('✏️ Tareas de edición a crear:', tareas);
      
      if (tareas.length > 0) {
        // Crear todas las tareas
        const resultados = await this.tareasAutomaticasService.createMultipleTareas(tareas).toPromise();
        console.log('✅ Resultados de edición de tareas:', resultados);
        console.log('✅ Tareas de edición creadas exitosamente');
        
        // Actualizar contador de tareas
        this.loadTareasCount();
      } else {
        console.log('⚠️ No hay cambios en dispositivos, no se crearán tareas');
      }
      
    } catch (error) {
      console.error('❌ Error creando tareas para editar empleado:', error);
    }
  }
}
