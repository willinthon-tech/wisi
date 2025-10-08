import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MarcajesService, Marcaje, MarcajesResponse } from '../../../services/marcajes.service';
import { environment } from '../../../../environments/environment';
import { AgGridModule } from 'ag-grid-angular';
import { ColDef, GridReadyEvent, GridApi, ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

// Registrar módulos de AG Grid
ModuleRegistry.registerModules([AllCommunityModule]);


@Component({
  selector: 'app-marcajes-list',
  standalone: true,
  imports: [CommonModule, FormsModule, AgGridModule],
  template: `
    <div class="marcajes-container">
      <div class="header">
        <h2>📊 Marcajes de Asistencia</h2>
        <div class="header-stats">
          <div class="header-stat-card">
            <span class="stat-number">{{ marcajesFiltrados.length }}</span>
            <span class="stat-label">Total Marcajes</span>
          </div>
          <div class="header-stat-card">
            <span class="stat-number">{{ dispositivosUnicos.size }}</span>
            <span class="stat-label">Dispositivos</span>
          </div>
          <div class="header-stat-card">
            <span class="stat-number">{{ empleadosUnicos.size }}</span>
            <span class="stat-label">Empleados</span>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-primary" (click)="recargarTabla()">
            <i class="fas fa-sync-alt"></i> Actualizar
          </button>
        </div>
      </div>

      <div class="main-content">
        <!-- Panel izquierdo - Filtros y estadísticas -->
        <div class="left-panel">
          <div class="filters-section">
            <h3>🔍 Filtros</h3>
            <div class="filter-group">
              <label for="filtroDispositivo">Dispositivo:</label>
              <select id="filtroDispositivo" [(ngModel)]="filtroDispositivo" (change)="aplicarFiltros()">
                <option value="">Todos los dispositivos</option>
                <option *ngFor="let dispositivo of dispositivos" [value]="dispositivo.id">
                  {{ dispositivo.nombre }}
                </option>
              </select>
            </div>
            
            <div class="filter-group">
              <label for="filtroEmpleado">Empleado:</label>
              <input 
                type="text" 
                id="filtroEmpleado" 
                [(ngModel)]="filtroEmpleado" 
                placeholder="Cédula o nombre..."
                (input)="aplicarFiltros()">
            </div>

            <div class="filter-group">
              <label for="filtroFecha">Fecha:</label>
              <input 
                type="date" 
                id="filtroFecha" 
                [(ngModel)]="filtroFecha" 
                (change)="aplicarFiltros()">
            </div>
          </div>

        </div>

        <!-- Panel derecho - Tabla -->
        <div class="right-panel">
          <div class="table-wrapper">
            <ag-grid-angular
              style="width: 100%; height: 100%;"
              class="ag-theme-alpine"
              [rowData]="marcajesFiltrados"
              [columnDefs]="columnDefs"
              [defaultColDef]="{
                resizable: true,
                sortable: true,
                filter: false,
                flex: 1,
                minWidth: 100
              }"
              [pagination]="true"
              [paginationPageSize]="50"
              [paginationAutoPageSize]="false"
              [paginationPageSizeSelector]="[25, 50, 100]"
              [suppressPaginationPanel]="false"
              [suppressColumnVirtualisation]="false"
              [suppressRowHoverHighlight]="true"
              [suppressCellFocus]="true"
              [suppressMenuHide]="true"
              [suppressColumnMoveAnimation]="true"
              [suppressRowTransform]="true"
              [suppressAnimationFrame]="true"
              (gridReady)="onGridReady($event)"
              [loading]="cargando">
            </ag-grid-angular>
          </div>
        </div>
      </div>

      <!-- Modal de detalles -->
      <div class="modal" [class.show]="mostrarModal" *ngIf="mostrarModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Detalles del Marcaje</h3>
            <button type="button" class="btn-close" (click)="cerrarModal()">&times;</button>
          </div>
          <div class="modal-body" *ngIf="marcajeSeleccionado">
            <div class="detail-grid">
              <div class="detail-item">
                <label>ID:</label>
                <span>{{ marcajeSeleccionado.id }}</span>
              </div>
              <div class="detail-item">
                <label>Empleado:</label>
                <span>{{ marcajeSeleccionado.employee_no }}</span>
              </div>
              <div class="detail-item">
                <label>Nombre:</label>
                <span>{{ marcajeSeleccionado.nombre || 'Sin nombre' }}</span>
              </div>
              <div class="detail-item">
                <label>Fecha/Hora:</label>
                <span>{{ formatearFecha(marcajeSeleccionado.event_time) }}</span>
              </div>
              <div class="detail-item">
                <label>Dispositivo:</label>
                <span>{{ marcajeSeleccionado.Dispositivo?.nombre || 'Dispositivo ' + marcajeSeleccionado.dispositivo_id }}</span>
              </div>
              <div class="detail-item">
                <label>IP:</label>
                <span>{{ marcajeSeleccionado.Dispositivo?.ip_remota || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <label>Registrado:</label>
                <span>{{ formatearFecha(marcajeSeleccionado.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="cerrarModal()">
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <!-- Modal de imagen -->
      <div class="modal" [class.show]="showImageModal" *ngIf="showImageModal">
        <div class="modal-content image-modal">
          <div class="modal-header">
            <h3>Imagen del Marcaje</h3>
            <button type="button" class="btn-close" (click)="closeImageModal()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="image-container" *ngIf="imageUrl">
              <img [src]="imageUrl" [alt]="'Imagen del marcaje ' + selectedMarcaje?.id" 
                   class="marcaje-image" (error)="onImageError()">
            </div>
            <div class="no-image" *ngIf="!imageUrl">
              <p>No se pudo cargar la imagen</p>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" (click)="downloadImage()" *ngIf="imageUrl">
              <i class="fas fa-download"></i> Descargar
            </button>
            <button type="button" class="btn btn-secondary" (click)="closeImageModal()">
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .marcajes-container {
      padding: 20px;
      max-width: 100%;
      margin: 0;
      height: calc(100vh - 100px);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #e9ecef;
    }

    .header h2 {
      margin: 0;
      color: #495057;
      font-weight: 600;
    }

    .header-stats {
      display: flex;
      gap: 15px;
      align-items: center;
    }

    .header-stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 10px 15px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 140px;
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
    }

    .header-stat-card .stat-number {
      font-size: 1.4rem;
      font-weight: bold;
      margin: 0;
      margin-right: 20px;
    }

    .header-stat-card .stat-label {
      font-size: 0.8rem;
      opacity: 0.9;
      margin: 0;
      text-align: right;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .main-content {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }

    .left-panel {
      width: 350px;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      height: fit-content;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .right-panel {
      flex: 1;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      height: calc(100vh - 200px);
    }

    .filters-section {
      margin-bottom: 30px;
    }

    .filters-section h3 {
      margin: 0 0 15px 0;
      color: #495057;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      margin-bottom: 15px;
    }

    .filter-group label {
      font-weight: 600;
      margin-bottom: 5px;
      color: #495057;
      font-size: 0.9rem;
    }

    .filter-group input,
    .filter-group select {
      padding: 10px 12px;
      border: 1px solid #ced4da;
      border-radius: 6px;
      font-size: 14px;
      width: 100%;
      box-sizing: border-box;
    }

    .stats-section h3 {
      margin: 0 0 15px 0;
      color: #495057;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .stats {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      width: 100%;
    }

    .stat-number {
      display: block;
      font-size: 2rem;
      font-weight: bold;
      margin-bottom: 5px;
    }

    .stat-label {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .table-wrapper {
      height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Estilos para ag-Grid */
    ag-grid-angular {
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;
    }

    .ag-theme-alpine {
      --ag-header-background-color: #343a40;
      --ag-header-foreground-color: white;
      --ag-border-color: #dee2e6;
      --ag-row-hover-color: #f8f9fa;
    }

    .ag-theme-alpine .ag-header {
      background-color: #343a40;
      color: white;
      font-weight: 600;
    }

    .ag-theme-alpine .ag-cell {
      padding: 12px;
      vertical-align: middle;
    }

    .ag-theme-alpine .ag-row {
      border-bottom: 1px solid #dee2e6;
    }

    .ag-theme-alpine .ag-paging-panel {
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ag-theme-alpine .ag-paging-panel .ag-paging-button {
      margin: 0 5px;
    }

    .ag-theme-alpine .ag-paging-panel .ag-paging-description {
      margin: 0 10px;
      font-weight: 600;
      color: #495057;
    }

    /* Ocultar checkboxes si aún aparecen */
    .ag-theme-alpine .ag-checkbox,
    .ag-theme-alpine .ag-selection-checkbox {
      display: none !important;
    }


    .table {
      margin: 0;
    }

    .table th {
      background: #343a40;
      color: white;
      font-weight: 600;
      padding: 15px 12px;
      border: none;
    }

    .table td {
      padding: 12px;
      vertical-align: middle;
      border-top: 1px solid #dee2e6;
    }

    .employee-badge {
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .datetime {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      color: #495057;
    }

    .ip-address {
      font-family: 'Courier New', monospace;
      font-size: 0.8rem;
      color: #6c757d;
    }

    .btn {
      margin: 0 2px;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
    }

    .page-info {
      font-weight: 600;
      color: #495057;
    }

    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s ease;
    }

    .modal.show {
      opacity: 1;
      visibility: visible;
    }

    .modal-content {
      background: white;
      border-radius: 10px;
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
    }

    .modal-header h3 {
      margin: 0;
      color: #495057;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #6c757d;
    }

    .modal-body {
      padding: 20px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
    }

    .detail-item label {
      font-weight: 600;
      color: #495057;
      margin-bottom: 5px;
    }

    .detail-item span {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .modal-footer {
      padding: 20px;
      border-top: 1px solid #dee2e6;
      text-align: right;
    }

    @media (max-width: 1200px) {
      .main-content {
        flex-direction: column;
        align-items: stretch;
      }
      
      .left-panel {
        width: 100%;
        margin-bottom: 20px;
        height: fit-content;
      }
      
      .right-panel {
        height: 500px;
      }
      
      .header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }
      
      .header-stats {
        order: 2;
        width: 100%;
        justify-content: center;
      }
      
      .header-actions {
        order: 3;
        width: 100%;
        justify-content: center;
      }
    }

    @media (max-width: 768px) {
      .marcajes-container {
        padding: 10px;
      }
      
      .left-panel {
        padding: 15px;
      }
      
      .header-stats {
        flex-direction: column;
        gap: 10px;
        width: 100%;
      }
      
      .header-stat-card {
        width: 100%;
        min-width: auto;
        justify-content: space-between;
      }
      
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Estilos para modal de imagen */
    .image-modal {
      max-width: 800px;
    }

    .image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .marcaje-image {
      max-width: 100%;
      max-height: 600px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .no-image {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    .no-image p {
      font-size: 1.1rem;
      margin: 0;
    }
  `]
})
export class MarcajesListComponent implements OnInit {
  marcajes: Marcaje[] = [];
  marcajesFiltrados: Marcaje[] = [];
  dispositivos: any[] = [];
  dispositivosUnicos = new Set();
  empleadosUnicos = new Set();
  
  // Filtros
  filtroDispositivo = '';
  filtroEmpleado = '';
  filtroFecha = '';
  
  // Paginación
  paginaActual = 1;
  elementosPorPagina = 50;
  totalPaginas = 1;
  
  // Modal
  mostrarModal = false;
  marcajeSeleccionado: Marcaje | null = null;
  
  // Estados
  cargando = false;
  totalRegistros = 0;
  
  // Configuración de ag-Grid
  columnDefs: ColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80, 
      sortable: true, 
      filter: false,
      pinned: 'left'
    },
    { 
      field: 'employee_no', 
      headerName: 'Empleado', 
      width: 120, 
      sortable: true, 
      filter: false
    },
    { 
      field: 'nombre', 
      headerName: 'Nombre', 
      width: 200, 
      sortable: true, 
      filter: false
    },
    { 
      field: 'event_time', 
      headerName: 'Fecha/Hora', 
      width: 180, 
      sortable: true, 
      filter: false,
      valueFormatter: (params) => this.formatearFecha(params.value)
    },
    { 
      field: 'Dispositivo.nombre', 
      headerName: 'Dispositivo', 
      width: 180, 
      sortable: true, 
      filter: false
    },
    { 
      field: 'Dispositivo.ip_remota', 
      headerName: 'IP', 
      width: 140, 
      sortable: true, 
      filter: false
    },
    { 
      field: 'id', 
      headerName: 'Acciones', 
      width: 180, 
      sortable: false, 
      filter: false,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return `
          <button class="btn btn-info btn-sm" onclick="window.marcajesComponent.verDetalles(${JSON.stringify(params.data).replace(/"/g, '&quot;')})">
            <i class="fas fa-eye"></i> Ver
          </button>
          <button class="btn btn-secondary btn-sm" onclick="window.marcajesComponent.descargarImagen(${JSON.stringify(params.data).replace(/"/g, '&quot;')})">
            <i class="fas fa-download"></i> Imagen
          </button>
        `;
      }
    }
  ];
  
  gridApi!: GridApi;

  constructor(
    private http: HttpClient, 
    private marcajesService: MarcajesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarDispositivos();
    this.cargarMarcajes();
  }

  cargarDispositivos() {
    this.http.get<any[]>(`${environment.apiUrl}/dispositivos`).subscribe({
      next: (dispositivos) => {
        this.dispositivos = dispositivos;
      },
      error: (error) => {
        console.error('Error cargando dispositivos:', error);
      }
    });
  }

  cargarMarcajes() {
    this.cargando = true;
    this.marcajesService.getMarcajes().subscribe({
      next: (response: MarcajesResponse) => {
        // Verificar que response.attlogs existe antes de mapear
        if (response && response.attlogs) {
          // Mapear datos para ag-grid
          this.marcajes = response.attlogs.map(marcaje => ({
            ...marcaje,
            dispositivo_nombre: marcaje.Dispositivo?.nombre || 'Dispositivo ' + marcaje.dispositivo_id,
            dispositivo_ip: marcaje.Dispositivo?.ip_remota || 'N/A'
          }));
        } else {
          this.marcajes = [];
        }
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando marcajes:', error);
        this.cargando = false;
      }
    });
  }

  aplicarFiltros() {
    let filtrados = [...this.marcajes];
    
    // Filtro por dispositivo
    if (this.filtroDispositivo) {
      filtrados = filtrados.filter(m => m.dispositivo_id === parseInt(this.filtroDispositivo));
    }
    
    // Filtro por empleado
    if (this.filtroEmpleado) {
      const filtro = this.filtroEmpleado.toLowerCase();
      filtrados = filtrados.filter(m => 
        m.employee_no.toLowerCase().includes(filtro) || 
        (m.nombre && m.nombre.toLowerCase().includes(filtro))
      );
    }
    
    // Filtro por fecha
    if (this.filtroFecha) {
      filtrados = filtrados.filter(m => {
        const fechaMarcaje = new Date(m.event_time).toISOString().split('T')[0];
        return fechaMarcaje === this.filtroFecha;
      });
    }
    
    this.marcajesFiltrados = filtrados;
    this.calcularEstadisticas();
    this.calcularPaginacion();
  }

  calcularEstadisticas() {
    this.dispositivosUnicos.clear();
    this.empleadosUnicos.clear();
    
    this.marcajesFiltrados.forEach(marcaje => {
      this.dispositivosUnicos.add(marcaje.dispositivo_id);
      this.empleadosUnicos.add(marcaje.employee_no);
    });
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.marcajesFiltrados.length / this.elementosPorPagina);
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
  }

  recargarTabla() {
    this.cargarMarcajes();
  }


  formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  verDetalles(marcaje: Marcaje) {
    this.marcajeSeleccionado = marcaje;
    this.mostrarModal = true;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.marcajeSeleccionado = null;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  tieneImagen(marcaje: Marcaje): boolean {
    // Verificar si existe imagen para este marcaje
    return true; // Por ahora asumimos que todos tienen imagen
  }

  // Variables para modal de imagen
  showImageModal = false;
  selectedMarcaje: any = null;
  imageUrl = '';

  descargarImagen(marcaje: Marcaje) {
    if (marcaje.id) {
      // Configurar datos para la modal
      this.selectedMarcaje = marcaje;
      console.log(`📸 Abriendo modal de imagen para marcaje ${marcaje.id}`);
      
      // Obtener imagen usando el servicio con autenticación
      this.marcajesService.getMarcajeImage(marcaje.id).subscribe({
        next: (blob: Blob) => {
          // Crear URL del blob
          this.imageUrl = URL.createObjectURL(blob);
          console.log(`📸 Imagen cargada correctamente para marcaje ${marcaje.id}`);
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          // Abrir modal
          this.showImageModal = true;
          
          // Forzar detección de cambios nuevamente
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error(`❌ Error cargando imagen para marcaje ${marcaje.id}:`, error);
          this.imageUrl = '';
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          // Abrir modal aunque haya error
          this.showImageModal = true;
          
          // Forzar detección de cambios nuevamente
          this.cdr.detectChanges();
        }
      });
    }
  }

  closeImageModal() {
    // Limpiar URL del blob si existe
    if (this.imageUrl && this.imageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.imageUrl);
    }
    
    this.showImageModal = false;
    this.selectedMarcaje = null;
    this.imageUrl = '';
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  downloadImage() {
    if (this.imageUrl) {
      // Crear enlace de descarga
      const link = document.createElement('a');
      link.href = this.imageUrl;
      link.download = `marcaje_${this.selectedMarcaje?.id}.jpg`;
      link.click();
    }
  }

  onImageError() {
    console.log('Error cargando imagen');
    this.imageUrl = '';
  }

  // Métodos para ag-Grid
  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    
    // Exponer el componente globalmente para los botones
    (window as any).marcajesComponent = this;
    
    // Evitar conflictos de renderizado
    setTimeout(() => {
      if (this.gridApi) {
        this.gridApi.sizeColumnsToFit();
      }
    }, 100);
  }
}
