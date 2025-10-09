import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
        <div class="header-stat-card" [class.updating]="actualizandoDatos">
          <span class="stat-number">
            {{ actualizandoDatos ? '...' : marcajesFiltrados.length }}
            <i class="fas fa-sync-alt fa-spin" *ngIf="actualizandoDatos"></i>
          </span>
          <span class="stat-label">Total Marcajes</span>
        </div>
        <div class="header-stat-card" [class.updating]="actualizandoDatos">
          <span class="stat-number">
            {{ actualizandoDatos ? '...' : dispositivosUnicos.size }}
            <i class="fas fa-sync-alt fa-spin" *ngIf="actualizandoDatos"></i>
          </span>
          <span class="stat-label">Dispositivos</span>
        </div>
        <div class="header-stat-card" [class.updating]="actualizandoDatos">
          <span class="stat-number">
            {{ actualizandoDatos ? '...' : empleadosUnicos.size }}
            <i class="fas fa-sync-alt fa-spin" *ngIf="actualizandoDatos"></i>
          </span>
          <span class="stat-label">Empleados</span>
        </div>
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
                sortable: false,
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
            <div class="modal-navigation">
              <button type="button" class="btn btn-outline-primary" 
                      (click)="anteriorDetalle()" 
                      [disabled]="!puedeAnteriorDetalle"
                      title="Registro anterior">
                <i class="fas fa-chevron-left"></i> Anterior
              </button>
              <span class="modal-counter">
                {{ currentDetailIndex + 1 }} de {{ marcajesFiltrados.length }}
              </span>
              <button type="button" class="btn btn-outline-primary" 
                      (click)="siguienteDetalle()" 
                      [disabled]="!puedeSiguienteDetalle"
                      title="Registro siguiente">
                Siguiente <i class="fas fa-chevron-right"></i>
              </button>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-secondary" (click)="cerrarModal()">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de imagen -->
      <div class="modal" [class.show]="showImageModal" *ngIf="showImageModal">
        <div class="modal-content image-modal">
          <!-- Botón de cerrar flotante -->
          <button type="button" class="btn-close-floating" (click)="closeImageModal()" title="Cerrar">
            ✕
          </button>
          
          <div class="modal-body" style="padding: 0 !important; margin: 0 !important;">
            <div class="image-container" *ngIf="imageUrl">
              <img [src]="imageUrl" [alt]="'Imagen del marcaje ' + selectedMarcaje?.id" 
                   class="marcaje-image" (error)="onImageError()">
            </div>
            <div class="no-image" *ngIf="!imageUrl">
              <p>No hay imagen disponible</p>
            </div>
          </div>
          <!-- Controles de navegación flotantes -->
          <div class="modal-navigation-floating">
            <button type="button" class="btn btn-outline-primary" 
                    (click)="anteriorImagen()" 
                    [disabled]="!puedeAnteriorImagen"
                    title="Imagen anterior">
              <i class="fas fa-chevron-left"></i> Anterior
            </button>
            <span class="modal-counter">
              {{ currentMarcajeIndex + 1 }} de {{ marcajesFiltrados.length }}
            </span>
            <button type="button" class="btn btn-outline-primary" 
                    (click)="siguienteImagen()" 
                    [disabled]="!puedeSiguienteImagen"
                    title="Imagen siguiente">
              Siguiente <i class="fas fa-chevron-right"></i>
            </button>
          </div>
          
          <!-- Acciones flotantes -->
          <div class="modal-actions-floating">
            <button type="button" class="btn btn-primary" (click)="downloadImage()" *ngIf="imageUrl">
              <i class="fas fa-download"></i> Descargar
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

         .header-stat-card.updating {
           opacity: 0.7;
           animation: pulse 1.5s ease-in-out infinite;
         }

         .header-stat-card .stat-number {
           display: flex;
           align-items: center;
           gap: 8px;
         }

         .fa-spin {
           animation: fa-spin 1s linear infinite;
         }

         @keyframes pulse {
           0%, 100% { opacity: 0.7; }
           50% { opacity: 1; }
         }

         @keyframes fa-spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
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

    /* Ocultar indicadores de ordenamiento */
    .ag-theme-alpine .ag-header-cell-sortable .ag-header-cell-label::after,
    .ag-theme-alpine .ag-header-cell-sorted .ag-header-cell-label::after,
    .ag-theme-alpine .ag-sort-indicator,
    .ag-theme-alpine .ag-sort-indicator-icon {
      display: none !important;
    }

    /* Deshabilitar cursor pointer en headers */
    .ag-theme-alpine .ag-header-cell {
      cursor: default !important;
    }

    .ag-theme-alpine .ag-header-cell:hover {
      background-color: transparent !important;
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
    }

    .modal-navigation {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .modal-counter {
      background: #f8f9fa;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #495057;
      border: 1px solid #dee2e6;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
    }

    .modal-navigation .btn {
      padding: 6px 12px;
      font-size: 0.9rem;
    }

    .modal-navigation .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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

      .modal-footer {
        flex-direction: column;
        align-items: stretch;
        gap: 15px;
      }

      .modal-navigation {
        justify-content: center;
        order: 1;
      }

      .modal-actions {
        justify-content: center;
        order: 2;
      }

      .modal-counter {
        font-size: 0.8rem;
        padding: 4px 10px;
      }
    }

    /* Estilos para modal de imagen */
    .image-modal {
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      z-index: 9999 !important;
      overflow: hidden !important;
      max-width: none !important;
      max-height: none !important;
    }

    .image-container {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      padding: 0 !important;
      margin: 0 !important;
      background: #000 !important;
      border-radius: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      position: relative !important;
      overflow: hidden !important;
      border: none !important;
      box-sizing: border-box !important;
    }

    .marcaje-image {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
      display: block !important;
      box-sizing: border-box !important;
    }

    .no-image {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      background: #000;
      border-radius: 0;
      height: 100vh;
      width: 100vw;
      color: #fff;
      font-size: 2rem;
      overflow: hidden;
    }

    .no-image p {
      font-size: 2rem;
      margin: 0;
      font-weight: 500;
      color: #fff;
    }

    /* Botón de cerrar flotante */
    .btn-close-floating {
      position: absolute;
      top: 20px;
      right: 20px;
      z-index: 10000;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 1.2rem;
      transition: all 0.3s;
      box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
    }

    .btn-close-floating:hover {
      background: #c82333;
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(220, 53, 69, 0.5);
    }

    .btn-close-floating {
      font-size: 1.4rem;
      font-weight: bold;
      color: white;
      line-height: 1;
    }

    /* Controles de navegación flotantes */
    .modal-navigation-floating {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 15px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px 20px;
      border-radius: 25px;
      backdrop-filter: blur(10px);
    }

    .modal-navigation-floating .btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      transition: all 0.3s;
    }

    .modal-navigation-floating .btn:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
    }

    .modal-navigation-floating .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .modal-counter {
      color: #000;
      font-weight: 600;
      font-size: 0.9rem;
      min-width: 80px;
      text-align: center;
      background: rgba(255, 255, 255, 0.9);
      padding: 4px 8px;
      border-radius: 12px;
    }

    /* Acciones flotantes */
    .modal-actions-floating {
      position: absolute;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      gap: 10px;
    }

    .modal-actions-floating .btn {
      background: rgba(0, 123, 255, 0.8);
      border: none;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
    }

    .modal-actions-floating .btn:hover {
      background: rgba(0, 123, 255, 1);
      transform: translateY(-2px);
    }
  `]
})
export class MarcajesListComponent implements OnInit, OnDestroy {
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
  currentDetailIndex = -1;
  
  // Estados
  cargando = false;
  totalRegistros = 0;
  
  // Configuración de ag-Grid
  columnDefs: ColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80, 
      sortable: false, 
      filter: false,
      pinned: 'left'
    },
    { 
      field: 'employee_no', 
      headerName: 'Empleado', 
      width: 120, 
      sortable: false, 
      filter: false
    },
    { 
      field: 'nombre', 
      headerName: 'Nombre', 
      width: 200, 
      sortable: false, 
      filter: false
    },
           { 
             field: 'event_time', 
             headerName: 'Fecha/Hora', 
             width: 180, 
             sortable: false, 
             filter: false,
             sort: 'desc', // Ordenar por defecto descendente (más reciente primero)
             valueFormatter: (params) => this.formatearFecha(params.value)
           },
    { 
      field: 'Dispositivo.nombre', 
      headerName: 'Dispositivo', 
      width: 180, 
      sortable: false, 
      filter: false
    },
    { 
      field: 'Dispositivo.ip_remota', 
      headerName: 'IP', 
      width: 140, 
      sortable: false, 
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
    this.iniciarAutoRefresh();
  }

  ngOnDestroy(): void {
    this.detenerAutoRefresh();
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
          
          // Ordenar por fecha más reciente primero (verificar fechas válidas)
          this.marcajes.sort((a, b) => {
            const fechaA = new Date(a.event_time);
            const fechaB = new Date(b.event_time);
            
            // Verificar que las fechas sean válidas
            if (isNaN(fechaA.getTime()) && isNaN(fechaB.getTime())) return 0;
            if (isNaN(fechaA.getTime())) return 1;
            if (isNaN(fechaB.getTime())) return -1;
            
            return fechaB.getTime() - fechaA.getTime(); // Más reciente primero
          });
        } else {
          this.marcajes = [];
        }
        
        this.aplicarFiltros();
        this.calcularEstadisticas();
        this.cargando = false;
        
        // Inicializar conteo para auto-refresh inteligente (usar datos filtrados)
        this.ultimoConteoRegistros = this.marcajesFiltrados.length;
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.cargando = false;
        this.cdr.detectChanges();
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
    
    // Ordenar por fecha más reciente primero (verificar fechas válidas)
    filtrados.sort((a, b) => {
      const fechaA = new Date(a.event_time);
      const fechaB = new Date(b.event_time);
      
      // Verificar que las fechas sean válidas
      if (isNaN(fechaA.getTime()) && isNaN(fechaB.getTime())) return 0;
      if (isNaN(fechaA.getTime())) return 1;
      if (isNaN(fechaB.getTime())) return -1;
      
      return fechaB.getTime() - fechaA.getTime(); // Más reciente primero
    });
    
    this.marcajesFiltrados = filtrados;
    this.calcularEstadisticas();
    this.calcularPaginacion();
  }

  calcularEstadisticas() {
    this.dispositivosUnicos.clear();
    this.empleadosUnicos.clear();
    
    this.marcajesFiltrados.forEach(marcaje => {
      if (marcaje.Dispositivo?.nombre) {
        this.dispositivosUnicos.add(marcaje.Dispositivo.nombre);
      }
      if (marcaje.employee_no) {
        this.empleadosUnicos.add(marcaje.employee_no);
      }
    });
    
    // Forzar detección de cambios después de calcular estadísticas
    this.cdr.detectChanges();
  }

  calcularPaginacion() {
    this.totalPaginas = Math.ceil(this.marcajesFiltrados.length / this.elementosPorPagina);
    this.paginaActual = 1;
  }

  cambiarPagina(pagina: number) {
    this.paginaActual = pagina;
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
    this.currentDetailIndex = this.marcajesFiltrados.findIndex(m => m.id === marcaje.id);
    this.mostrarModal = true;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.marcajeSeleccionado = null;
    this.currentDetailIndex = -1;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // Navegación en modal de detalles
  anteriorDetalle() {
    if (this.currentDetailIndex > 0) {
      this.currentDetailIndex--;
      this.marcajeSeleccionado = this.marcajesFiltrados[this.currentDetailIndex];
      this.cdr.detectChanges();
    }
  }

  siguienteDetalle() {
    if (this.currentDetailIndex < this.marcajesFiltrados.length - 1) {
      this.currentDetailIndex++;
      this.marcajeSeleccionado = this.marcajesFiltrados[this.currentDetailIndex];
      this.cdr.detectChanges();
    }
  }

  get puedeAnteriorDetalle(): boolean {
    return this.currentDetailIndex > 0;
  }

  get puedeSiguienteDetalle(): boolean {
    return this.currentDetailIndex < this.marcajesFiltrados.length - 1;
  }

  tieneImagen(marcaje: Marcaje): boolean {
    // Verificar si existe imagen para este marcaje
    return true; // Por ahora asumimos que todos tienen imagen
  }

  // Variables para modal de imagen
  showImageModal = false;
  selectedMarcaje: any = null;
  imageUrl = '';
  currentMarcajeIndex = -1;

  // Variables para auto-refresh
  private refreshInterval: any;
  private readonly REFRESH_INTERVAL = 30000; // 30 segundos
  autoRefreshEnabled = true;
  actualizandoDatos = false;
  verificandoCambios = false;
  private ultimoConteoRegistros = 0;

  // Variables para filtros
  filtros = {
    dispositivo_id: '',
    employee_no: '',
    fecha_inicio: '',
    fecha_fin: ''
  };

  descargarImagen(marcaje: Marcaje) {
    if (marcaje.id) {
      // Configurar datos para la modal
      this.selectedMarcaje = marcaje;
      this.currentMarcajeIndex = this.marcajesFiltrados.findIndex(m => m.id === marcaje.id);
      
      // Obtener imagen usando el servicio con autenticación
      this.marcajesService.getMarcajeImage(marcaje.id).subscribe({
        next: (blob: Blob) => {
          // Crear URL del blob
          this.imageUrl = URL.createObjectURL(blob);
          
          // Forzar detección de cambios
          this.cdr.detectChanges();
          
          // Abrir modal
          this.showImageModal = true;
          
          // Forzar detección de cambios nuevamente
          this.cdr.detectChanges();
        },
        error: (error) => {
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
    this.currentMarcajeIndex = -1;
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  // Navegación en modal de imagen
  anteriorImagen() {
    if (this.currentMarcajeIndex > 0) {
      this.currentMarcajeIndex--;
      this.selectedMarcaje = this.marcajesFiltrados[this.currentMarcajeIndex];
      this.cargarImagenActual();
    }
  }

  siguienteImagen() {
    if (this.currentMarcajeIndex < this.marcajesFiltrados.length - 1) {
      this.currentMarcajeIndex++;
      this.selectedMarcaje = this.marcajesFiltrados[this.currentMarcajeIndex];
      this.cargarImagenActual();
    }
  }

  private cargarImagenActual() {
    if (this.selectedMarcaje?.id) {
      this.marcajesService.getMarcajeImage(this.selectedMarcaje.id).subscribe({
        next: (blob: Blob) => {
          // Liberar URL anterior si existe
          if (this.imageUrl) {
            URL.revokeObjectURL(this.imageUrl);
          }
          this.imageUrl = URL.createObjectURL(blob);
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error cargando imagen:', error);
          this.imageUrl = '';
          this.cdr.detectChanges();
        }
      });
    }
  }

  get puedeAnteriorImagen(): boolean {
    return this.currentMarcajeIndex > 0;
  }

  get puedeSiguienteImagen(): boolean {
    return this.currentMarcajeIndex < this.marcajesFiltrados.length - 1;
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
    this.imageUrl = '';
  }

  // Métodos para auto-refresh de datos
  iniciarAutoRefresh() {
    if (this.autoRefreshEnabled) {
      this.refreshInterval = setInterval(() => {
        this.verificarYActualizarSiEsNecesario();
      }, this.REFRESH_INTERVAL);
    }
  }

  detenerAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  verificarYActualizarSiEsNecesario() {
    this.verificandoCambios = true;
    this.cdr.detectChanges();
    
    // Hacer una petición ligera solo para obtener el conteo total
    this.marcajesService.getMarcajes(this.obtenerFiltrosActuales()).subscribe({
      next: (response) => {
        const nuevoConteo = response.attlogs ? response.attlogs.length : 0;
        
        // Verificar si hay cambios en los datos filtrados
        if (nuevoConteo !== this.ultimoConteoRegistros) {
          this.actualizarDatos();
        }
        
        // Actualizar el conteo para la próxima verificación
        this.ultimoConteoRegistros = nuevoConteo;
        this.verificandoCambios = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.verificandoCambios = false;
        this.cdr.detectChanges();
      }
    });
  }

  actualizarDatos() {
    this.actualizandoDatos = true;
    
    // Forzar detección de cambios inmediatamente
    this.cdr.detectChanges();
    
    // Solo actualizar los datos, no toda la página
    this.marcajesService.getMarcajes(this.obtenerFiltrosActuales()).subscribe({
      next: (response) => {
        this.marcajes = response.attlogs || [];
        
        // Ordenar por fecha más reciente primero (verificar fechas válidas)
        this.marcajes.sort((a, b) => {
          const fechaA = new Date(a.event_time);
          const fechaB = new Date(b.event_time);
          
          // Verificar que las fechas sean válidas
          if (isNaN(fechaA.getTime()) && isNaN(fechaB.getTime())) return 0;
          if (isNaN(fechaA.getTime())) return 1;
          if (isNaN(fechaB.getTime())) return -1;
          
          return fechaB.getTime() - fechaA.getTime(); // Más reciente primero
        });
        
        // Aplicar filtros actuales para mantener la vista filtrada
        this.aplicarFiltros();
        
        // Actualizar estadísticas (botones de números)
        this.calcularEstadisticas();
        
        // Actualizar ag-Grid si está disponible
        if (this.gridApi) {
          this.gridApi.setGridOption('rowData', this.marcajesFiltrados);
        }
        
        this.actualizandoDatos = false;
        
        // Actualizar conteo para la próxima verificación (usar datos filtrados)
        this.ultimoConteoRegistros = this.marcajesFiltrados.length;
        
        // Forzar detección de cambios para actualizar la UI
        this.cdr.detectChanges();
        
        // Forzar detección de cambios nuevamente después de un pequeño delay
        setTimeout(() => {
          this.cdr.detectChanges();
        }, 100);
      },
      error: (error) => {
        this.actualizandoDatos = false;
        this.cdr.detectChanges();
      }
    });
  }

  obtenerFiltrosActuales() {
    return {
      dispositivo_id: this.filtros.dispositivo_id || undefined,
      employee_no: this.filtros.employee_no || undefined,
      fecha_inicio: this.filtros.fecha_inicio || undefined,
      fecha_fin: this.filtros.fecha_fin || undefined
    };
  }

  toggleAutoRefresh() {
    this.autoRefreshEnabled = !this.autoRefreshEnabled;
    
    if (this.autoRefreshEnabled) {
      this.iniciarAutoRefresh();
    } else {
      this.detenerAutoRefresh();
    }
    
    // Forzar detección de cambios
    this.cdr.detectChanges();
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
