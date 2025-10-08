import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tareas-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tareas-container">
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Cédula</th>
              <th>Nombre</th>
              <th>Género</th>
              <th>Sala</th>
              <th>Método</th>
              <th>Revisión</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tarea of tareas; let i = index">
              <td>{{ tarea.id }}</td>
              <td>{{ tarea.numero_cedula_empleado }}</td>
              <td>{{ tarea.nombre_empleado }}</td>
              <td>{{ tarea.nombre_genero }}</td>
              <td>{{ tarea.nombre_sala }}</td>
              <td>
                <span class="method-badge" [ngClass]="getMethodClass(tarea.accion_realizar)">
                  {{ tarea.accion_realizar }}
                </span>
              </td>
              <td>
                <button class="btn btn-secondary btn-sm" (click)="verDetalles(tarea)">
                  Ver
                </button>
              </td>
              <td>
                <button 
                  class="btn btn-success btn-sm me-2" 
                  [disabled]="!isTareaActiva(tarea) || procesandoTarea"
                  (click)="ejecutarTarea(tarea)">
                  <span *ngIf="ejecutandoTarea === tarea.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  <span *ngIf="ejecutandoTarea !== tarea.id">Ejecutar</span>
                  <span *ngIf="ejecutandoTarea === tarea.id">Ejecutando...</span>
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [disabled]="!isTareaActiva(tarea) || procesandoTarea"
                  (click)="rechazarTarea(tarea)">
                  <span *ngIf="rechazandoTarea === tarea.id" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  <span *ngIf="rechazandoTarea !== tarea.id">Rechazar</span>
                  <span *ngIf="rechazandoTarea === tarea.id">Rechazando...</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <div *ngIf="tareas.length === 0" class="no-data">
          <p>No hay tareas registradas</p>
        </div>
      </div>

      <!-- Modal para ver detalles de tarea -->
      <div *ngIf="showDetailsModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Detalles de la Tarea</h3>
            <button class="close-btn" (click)="closeDetailsModal()">&times;</button>
          </div>
          <div class="modal-body" *ngIf="selectedTarea">
            <div class="tarea-details">
              <!-- Foto del empleado -->
              <div class="photo-section">
                <div class="photo-container">
                  <img 
                    *ngIf="selectedTarea.foto_empleado" 
                    [src]="'data:image/jpeg;base64,' + selectedTarea.foto_empleado" 
                    alt="Foto del empleado"
                    class="employee-photo-large"
                  />
                  <span *ngIf="!selectedTarea.foto_empleado" class="no-photo-large">Sin foto</span>
                </div>
              </div>

              <!-- Información del empleado -->
              <div class="info-section">
                <h4>Información del Empleado</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Cédula:</label>
                    <input type="text" [value]="selectedTarea.numero_cedula_empleado" disabled>
                  </div>
                  <div class="form-group">
                    <label>Nombre:</label>
                    <input type="text" [value]="selectedTarea.nombre_empleado" disabled>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Género:</label>
                    <input type="text" [value]="selectedTarea.nombre_genero" disabled>
                  </div>
                  <div class="form-group">
                    <label>Cargo:</label>
                    <input type="text" [value]="selectedTarea.nombre_cargo" disabled>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Sala:</label>
                    <input type="text" [value]="selectedTarea.nombre_sala" disabled>
                  </div>
                  <div class="form-group">
                    <label>Área:</label>
                    <input type="text" [value]="selectedTarea.nombre_area" disabled>
                  </div>
                </div>
                <div class="form-group">
                  <label>Departamento:</label>
                  <input type="text" [value]="selectedTarea.nombre_departamento" disabled>
                </div>
              </div>

              <!-- Información del dispositivo -->
              <div class="info-section">
                <h4>Información del Dispositivo</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>IP Pública:</label>
                    <input type="text" [value]="selectedTarea.ip_publica_dispositivo" disabled>
                  </div>
                  <div class="form-group">
                    <label>IP Local:</label>
                    <input type="text" [value]="selectedTarea.ip_local_dispositivo" disabled>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Usuario Login:</label>
                    <input type="text" [value]="selectedTarea.usuario_login_dispositivo" disabled>
                  </div>
                  <div class="form-group">
                    <label>Clave Login:</label>
                    <input type="text" [value]="getMaskedPassword(selectedTarea.clave_login_dispositivo)" disabled>
                  </div>
                </div>
              </div>

              <!-- Información de la tarea -->
              <div class="info-section">
                <h4>Información de la Tarea</h4>
                <div class="form-row">
                  <div class="form-group">
                    <label>Acción a Realizar:</label>
                    <input type="text" [value]="selectedTarea.accion_realizar" disabled>
                  </div>
                  <div class="form-group">
                    <label>Fecha de Creación:</label>
                    <input type="text" [value]="formatDate(selectedTarea.created_at)" disabled>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Marcaje Inicio:</label>
                    <input type="text" [value]="selectedTarea.marcaje_empleado_inicio_dispositivo" disabled>
                  </div>
                  <div class="form-group">
                    <label>Marcaje Fin:</label>
                    <input type="text" [value]="selectedTarea.marcaje_empleado_fin_dispositivo" disabled>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeDetailsModal()">Cerrar</button>
          </div>
        </div>
      </div>

      <!-- Modal de error de ejecución -->
      <div *ngIf="showErrorModal" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3>❌ Error en la Ejecución</h3>
            <button class="close-btn" (click)="closeErrorModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="error-content">
              <div class="error-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="error-message">
                <h4>{{ errorMessage }}</h4>
                <p *ngIf="errorDetails">{{ errorDetails }}</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeErrorModal()">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tareas-container {
      padding: 20px;
      max-width: 100%;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      gap: 10px;
    }

    .header-right {
      display: flex;
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-warning {
      background-color: #ffc107;
      color: #212529;
      border: 1px solid #ffc107;
    }

    .btn-warning:hover {
      background-color: #e0a800;
      border-color: #d39e00;
      transform: translateY(-1px);
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
      border: 1px solid #6c757d;
    }

    .btn-secondary:hover {
      background-color: #5a6268;
      border-color: #545b62;
      transform: translateY(-1px);
    }

    .btn-info {
      background-color: #17a2b8;
      color: white;
      border: 1px solid #17a2b8;
    }

    .btn-info:hover {
      background-color: #138496;
      border-color: #117a8b;
      transform: translateY(-1px);
    }

    .btn-danger {
      background-color: #dc3545;
      color: white;
      border: 1px solid #dc3545;
    }

    .btn-danger:hover {
      background-color: #c82333;
      border-color: #bd2130;
      transform: translateY(-1px);
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

    .btn-sm:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .btn-sm:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .btn-sm:disabled:hover {
      transform: none;
      box-shadow: none;
    }

    /* Estilos para spinners */
    .spinner-border-sm {
      width: 1rem;
      height: 1rem;
      border-width: 0.1em;
    }

    .spinner-border {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      vertical-align: -0.125em;
      border: 0.125em solid currentColor;
      border-right-color: transparent;
      border-radius: 50%;
      animation: spinner-border 0.75s linear infinite;
    }

    @keyframes spinner-border {
      to {
        transform: rotate(360deg);
      }
    }

    /* Estilos para tarjetas de método */
    .method-badge {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 0px 20px;
      font-size: 10px;
      font-weight: 600;
      text-align: center;
      color: white;
      border: none;
      cursor: default;
      transition: all 0.2s ease;
      width: 140px;
      min-width: 140px;
      max-width: 140px;
    }

    .method-delete {
      background-color: #e74c3c;
      color: white;
      opacity: 1;
    }

    .method-add {
      background-color: #27ae60;
      color: white;
      opacity: 1;
    }

    .method-edit {
      background-color: #3498db;
      color: white;
      opacity: 1;
    }

    .method-default {
      background-color: #6c757d;
      color: white;
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .table-wrapper::-webkit-scrollbar {
      display: none;
    }

    .table {
      width: 100%;
      margin-bottom: 0;
      border-collapse: collapse;
    }

    .table-dark {
      background-color: #343a40;
      color: white;
    }

    .table-dark th {
      border: none;
      padding: 12px 8px;
      font-weight: 600;
      text-align: center;
      vertical-align: middle;
      font-size: 13px;
    }

    .table tbody tr {
      transition: background-color 0.2s ease;
    }

    .table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .table tbody tr:nth-child(even):hover {
      background-color: #e9ecef;
    }

    .table tbody td {
      padding: 10px 8px;
      vertical-align: middle;
      text-align: center;
      border-top: 1px solid #dee2e6;
      font-size: 13px;
    }

    .employee-photo {
      width: 35px;
      height: 35px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #e9ecef;
    }

    .no-photo {
      color: #6c757d;
      font-style: italic;
      font-size: 11px;
    }

    .no-data {
      text-align: center;
      padding: 30px;
      color: #6c757d;
    }

    .no-data p {
      margin: 0;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
      }

      .table-wrapper {
        overflow-x: auto;
      }

    .table {
      min-width: 1000px;
    }
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
    max-width: 800px;
    max-height: 90vh;
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

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding: 20px;
    border-top: 1px solid #e9ecef;
  }

  /* Estilos para los detalles de la tarea */
  .tarea-details {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .photo-section {
    text-align: center;
  }

  .photo-section label {
    display: block;
    margin-bottom: 10px;
    font-weight: 600;
    color: #333;
  }

  .photo-container {
    display: flex;
    justify-content: center;
  }

  .employee-photo-large {
    width: 380px;
    height: 380px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  }

  .no-photo-large {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 380px;
    height: 380px;
    border-radius: 50%;
    background: #f8f9fa;
    color: #6c757d;
    font-style: italic;
    font-size: 24px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
  }

  .info-section {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 20px;
  }

  .info-section h4 {
    margin: 0 0 15px 0;
    color: #333;
    font-size: 16px;
    border-bottom: 2px solid #dee2e6;
    padding-bottom: 8px;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 15px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
  }

  .form-group label {
    font-weight: 600;
    color: #333;
    margin-bottom: 5px;
    font-size: 14px;
  }

  .form-group input {
    padding: 8px 12px;
    border: 1px solid #ced4da;
    border-radius: 4px;
    background-color: #f8f9fa;
    color: #495057;
    font-size: 14px;
  }

  .form-group input:disabled {
    background-color: #e9ecef;
    color: #6c757d;
    cursor: not-allowed;
  }

  .form-group span {
    display: inline-block;
  }

  /* Estilos para el modal de error */
  .error-content {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #dc3545;
  }

  .error-icon {
    font-size: 48px;
    color: #dc3545;
  }

  .error-message h4 {
    margin: 0 0 10px 0;
    color: #dc3545;
    font-size: 18px;
  }

  .error-message p {
    margin: 0;
    color: #6c757d;
    font-size: 14px;
    line-height: 1.5;
  }
  `]
})
export class TareasListComponent implements OnInit {
  tareas: any[] = [];
  userId: number | null = null;
  showDetailsModal: boolean = false;
  selectedTarea: any = null;
  tareaActiva: any = null; // La tarea que puede ser ejecutada
  ejecutandoTarea: number | null = null; // ID de la tarea que se está ejecutando
  rechazandoTarea: number | null = null; // ID de la tarea que se está rechazando
  procesandoTarea: boolean = false; // Estado general de procesamiento
  
  // Modal de error de ejecución
  showErrorModal = false;
  errorMessage = '';
  errorDetails = '';

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = +params['id'];
      if (this.userId) {
        this.loadTareas();
      }
    });
  }

  loadTareas(): void {
    this.http.get(`http://localhost:3000/api/tareas-dispositivo-usuarios/user/${this.userId}`).subscribe({
      next: (response: any) => {
        this.tareas = response.data || response;
        // La primera tarea (por orden de base de datos) es la activa
        this.tareaActiva = this.tareas.length > 0 ? this.tareas[0] : null;
        
        
      },
      error: (error) => {
        
      }
    });
  }






  verDetalles(tarea: any): void {
    
    this.selectedTarea = tarea;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedTarea = null;
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
    this.errorDetails = '';
  }

  showError(message: string, details: string = ''): void {
    this.errorMessage = message;
    this.errorDetails = details;
    this.showErrorModal = true;
  }


  async ejecutarFuncionDispositivo(tarea: any): Promise<void> {
    console.log('🎯 FRONTEND: ejecutarFuncionDispositivo llamado para tarea:', tarea.id);
    console.log('📋 FRONTEND: Acción a realizar:', tarea.accion_realizar);
    
    try {
      // Simular la comunicación con el dispositivo
      const resultado = await this.comunicarConDispositivo(tarea);
      
      if (resultado.success) {
        // ✅ Todo OK - Eliminar la tarea
        this.eliminarTarea(tarea.id);
      } else {
        // ❌ Error - Mostrar modal con la respuesta del dispositivo
        let errorDetails = resultado.message || 'Error desconocido';
        
        // Si hay respuesta del dispositivo, incluirla en los detalles
        if (resultado.deviceResponse) {
          errorDetails += `\n\nRespuesta del dispositivo:\n${JSON.stringify(resultado.deviceResponse, null, 2)}`;
        }
        
        this.showError(
          'Error en la ejecución de la tarea',
          errorDetails
        );
        
        // Resetear estados
        this.ejecutandoTarea = null;
        this.procesandoTarea = false;
      }
    } catch (error) {
      // ❌ Error de comunicación
      this.showError(
        'Error de comunicación con el dispositivo',
        `No se pudo conectar con el dispositivo: ${error}`
      );
      
      // Resetear estados
      this.ejecutandoTarea = null;
      this.procesandoTarea = false;
    }
  }

  async comunicarConDispositivo(tarea: any): Promise<{success: boolean, message?: string, deviceResponse?: any}> {
    try {
      // Determinar el endpoint del backend según la acción
      let backendEndpoint = '';
      
      if (tarea.accion_realizar === 'Borrar Foto') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/borrar-foto`;
      } else if (tarea.accion_realizar === 'Agregar Foto') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/agregar-foto`;
      } else if (tarea.accion_realizar === 'Editar Foto') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/editar-foto`;
      } else if (tarea.accion_realizar === 'Borrar Usuario') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/borrar-usuario`;
      } else if (tarea.accion_realizar === 'Agregar Usuario') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/agregar-usuario`;
      } else if (tarea.accion_realizar === 'Editar Usuario') {
        backendEndpoint = `${environment.apiUrl}/tareas/dispositivo/editar-usuario`;
      } else {
        throw new Error('Acción no reconocida: ' + tarea.accion_realizar);
      }
      
      // Realizar la llamada al backend
      const response = await this.http.post(backendEndpoint, {
        tarea: tarea
      }).toPromise() as any;
      
      return {
        success: response.success || true,
        message: response.message || `Tarea "${tarea.accion_realizar}" ejecutada correctamente en el dispositivo`
      };
      
    } catch (error: any) {
      // Manejar diferentes tipos de errores
      let errorMessage = 'Error desconocido';
      
      if (error.status === 401) {
        errorMessage = 'Error de autenticación: Credenciales inválidas';
      } else if (error.status === 404) {
        errorMessage = 'Usuario no encontrado en el dispositivo';
      } else if (error.status === 0) {
        errorMessage = 'Error de conexión: No se pudo conectar con el dispositivo';
      } else if (error.status >= 500) {
        errorMessage = 'Error interno del dispositivo';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
        deviceResponse: error.deviceResponse || null
      };
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getMaskedPassword(password: string): string {
    if (!password) return '';
    return '*'.repeat(password.length);
  }

  isTareaActiva(tarea: any): boolean {
    return this.tareaActiva && this.tareaActiva.id === tarea.id;
  }

  eliminarTarea(tareaId: number): void {
    this.http.delete(`http://localhost:3000/api/tareas-dispositivo-usuarios/${tareaId}`).subscribe({
      next: (response) => {
        
        
        // Resetear estados cuando el backend responde
        this.ejecutandoTarea = null;
        this.rechazandoTarea = null;
        this.procesandoTarea = false;
        
        // Desactivar botón "Detener Procesos" si no hay más tareas
        if (this.tareas.length === 0) {
        }
        
        // Recargar la lista de tareas para actualizar la tarea activa
        this.loadTareas();
      },
      error: (error) => {
        
        
        // Resetear estados también en caso de error
        this.ejecutandoTarea = null;
        this.rechazandoTarea = null;
        this.procesandoTarea = false;
        
        alert('Error al eliminar la tarea');
      }
    });
  }

  eliminarTareaAsync(tareaId: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.http.delete(`http://localhost:3000/api/tareas-dispositivo-usuarios/${tareaId}`).subscribe({
        next: (response) => {
          
          resolve(response);
        },
        error: (error) => {
          
          reject(error);
        }
      });
    });
  }


  ejecutarTarea(tarea: any): void {
    console.log('🔥 FRONTEND: ejecutarTarea llamado para tarea:', tarea.id);
    console.log('📋 FRONTEND: Datos de la tarea:', tarea);
    
    if (!this.isTareaActiva(tarea)) {
      console.log('⏸️ FRONTEND: Tarea no está activa, cancelando...');
      alert('Esta tarea no está disponible. Debe completar las tareas anteriores primero.');
      return;
    }
    
    console.log('🚀 FRONTEND: Tarea activa, iniciando ejecución...');

    this.procesandoTarea = true;
    this.ejecutandoTarea = tarea.id;
    
    // Ejecutar la función real en el dispositivo
    this.ejecutarFuncionDispositivo(tarea);
  }

  rechazarTarea(tarea: any): void {
    if (!this.isTareaActiva(tarea)) {
      alert('Esta tarea no está disponible. Debe completar las tareas anteriores primero.');
      return;
    }

    this.procesandoTarea = true;
    this.rechazandoTarea = tarea.id;
    
    
    
    
    // Eliminar la tarea (el spinner se quita cuando el backend responde)
    this.eliminarTarea(tarea.id);
  }

  getMethodClass(accion: string): string {
    if (accion.includes('Borrar') || accion.includes('Eliminar')) {
      return 'method-delete';
    } else if (accion.includes('Agregar') || accion.includes('Crear')) {
      return 'method-add';
    } else if (accion.includes('Editar') || accion.includes('Actualizar')) {
      return 'method-edit';
    }
    return 'method-default';
  }
}
