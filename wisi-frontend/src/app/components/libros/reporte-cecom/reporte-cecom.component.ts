import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-reporte-cecom',
  imports: [CommonModule],
  template: `
    <div class="reporte-wrapper">
      <div class="reporte-container">
      <div class="reporte-header">
        <h1>Reporte CECOM - Libro ID: {{ libroId }}</h1>
        <div class="info">
          <p>Fecha: {{ libro?.created_at | date:'dd/MM/yyyy' }}</p>
          <p>Sala: {{ libro?.Sala?.nombre || 'Sin asignar' }}</p>
        </div>
      </div>

      <div class="content" *ngIf="!loading">
        <!-- 1. Drop de Mesas -->
        <h2>Drop de Mesas</h2>
        <div class="table-container" *ngIf="drops.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>Mesa</th>
                <th>$100</th>
                <th>$50</th>
                <th>$20</th>
                <th>$10</th>
                <th>$5</th>
                <th>$1</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let drop of drops">
                <td>{{ drop.Mesa?.nombre || 'Sin mesa' }}</td>
                <td>{{ drop.denominacion_100 || 0 }}</td>
                <td>{{ drop.denominacion_50 || 0 }}</td>
                <td>{{ drop.denominacion_20 || 0 }}</td>
                <td>{{ drop.denominacion_10 || 0 }}</td>
                <td>{{ drop.denominacion_5 || 0 }}</td>
                <td>{{ drop.denominacion_1 || 0 }}</td>
                <td>{{ calculateDropTotal(drop) | currency:'USD':'symbol':'1.0-0' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td><strong>Total General</strong></td>
                <td><strong>{{ totalDenominacion100 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalDenominacion50 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalDenominacion20 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalDenominacion10 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalDenominacion5 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalDenominacion1 | currency:'USD':'symbol':'1.0-0' }}</strong></td>
                <td><strong>{{ totalGeneral | currency:'USD':'symbol':'1.0-0' }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- 2. Novedades de Mesas -->
        <h2>Novedades de Mesas</h2>
        <div class="table-container" *ngIf="novedadesMesas.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Mesa</th>
                <th>Empleado</th>
                <th>Descripción</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let novedad of novedadesMesas; let i = index">
                <td>{{ i + 1 }}</td>
                <td>{{ novedad.Mesa?.nombre || 'Sin mesa' }}</td>
                <td>
                  <span *ngIf="novedad.Empleado" 
                        class="empleado-link" 
                        (click)="mostrarEmpleado(novedad.Empleado)">
                    {{ novedad.Empleado.nombre }}
                  </span>
                  <span *ngIf="!novedad.Empleado">Sin empleado</span>
                </td>
                <td>{{ novedad.descripcion || 'Sin descripción' }}</td>
                <td>{{ novedad.hora }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. Novedades de Máquinas -->
        <h2>Novedades de Máquinas</h2>
        <div class="table-container" *ngIf="novedades.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Máquina</th>
                <th>Novedad</th>
                <th>Empleado</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evento of novedadesAgrupadas; let i = index">
                <td>{{ i + 1 }}</td>
                <td>
                  <span *ngIf="!evento.esLote">{{ evento.maquinas[0]?.nombre || 'Sin máquina' }}</span>
                  <span *ngIf="evento.esLote" class="evento-lote">
                    <button class="btn btn-info btn-sm" (click)="mostrarMaquinasAfectadas(evento)">
                      ({{ evento.maquinas.length }}) Ver Máquinas
                    </button>
                  </span>
                </td>
                <td>{{ evento.descripcion || 'Sin descripción' }}</td>
                <td>
                  <span *ngIf="evento.empleado" 
                        class="empleado-link" 
                        (click)="mostrarEmpleado(evento.empleado)">
                    {{ evento.empleado.nombre }}
                  </span>
                  <span *ngIf="!evento.empleado">Sin empleado</span>
                </td>
                <td>{{ evento.hora }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 4. Control de Llaves -->
        <h2>Control de Llaves</h2>
        <div class="table-container" *ngIf="controlLlaves.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Llave</th>
                <th>Empleado</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let evento of controlLlavesAgrupados; let i = index">
                <td>{{ i + 1 }}</td>
                <td>
                  <span *ngIf="!evento.esLote">{{ evento.llaves[0]?.nombre || 'Sin llave' }}</span>
                  <span *ngIf="evento.esLote" class="evento-lote">
                    <button class="btn btn-info btn-sm" (click)="mostrarLlavesAfectadas(evento)">
                      ({{ evento.llaves.length }}) Ver Llaves
                    </button>
                  </span>
                </td>
                <td>
                  <span *ngIf="evento.empleado" 
                        class="empleado-link" 
                        (click)="mostrarEmpleado(evento.empleado)">
                    {{ evento.empleado.nombre }}
                  </span>
                  <span *ngIf="!evento.empleado">Sin empleado</span>
                </td>
                <td>{{ evento.hora }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 5. Incidencias Generales -->
        <h2>Incidencias Generales</h2>
        <div class="table-container" *ngIf="incidencias.length > 0">
          <table class="data-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Descripción</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let incidencia of incidencias; let i = index">
                <td>{{ i + 1 }}</td>
                <td>{{ incidencia.descripcion }}</td>
                <td>{{ incidencia.hora }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div *ngIf="drops.length === 0 && novedadesMesas.length === 0 && novedadesAgrupadas.length === 0 && controlLlavesAgrupados.length === 0 && incidencias.length === 0" class="no-data">
          <p>No hay datos disponibles para este libro</p>
        </div>
      </div>

      <div *ngIf="loading" class="loading">
        <p>Cargando reporte...</p>
      </div>
      </div>
    </div>

    <!-- Modal para mostrar máquinas afectadas -->
    <div class="modal-overlay" *ngIf="showMaquinasModal" (click)="cerrarModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h4>Máquinas Afectadas</h4>
          <button class="btn-close" (click)="cerrarModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="evento-info mb-3">
            <strong>Descripción:</strong> {{ eventoSeleccionado?.descripcion }}<br>
            <strong>Empleado:</strong> {{ eventoSeleccionado?.empleado?.nombre }}<br>
            <strong>Hora:</strong> {{ eventoSeleccionado?.hora }}
          </div>
          <div class="maquinas-list">
            <div class="maquina-item" *ngFor="let maquina of maquinasAfectadas">
              <span class="maquina-numero">{{ maquina?.nombre }}</span>
              <span class="maquina-rango">{{ maquina?.Rango?.nombre }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="cerrarModal()">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal para mostrar llaves afectadas -->
    <div class="modal-overlay" *ngIf="showLlavesModal" (click)="cerrarLlavesModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h4>Control de Llaves</h4>
          <button class="btn-close" (click)="cerrarLlavesModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="evento-info mb-3">
            <strong>Empleado:</strong> {{ eventoLlavesSeleccionado?.empleado?.nombre }}<br>
            <strong>Hora:</strong> {{ eventoLlavesSeleccionado?.hora }}
          </div>
          <div class="llaves-list">
            <div class="llave-item" *ngFor="let llave of llavesAfectadas">
              <span class="llave-nombre">{{ llave?.nombre }}</span>
              <span class="llave-sala">{{ llave?.Sala?.nombre }}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="cerrarLlavesModal()">Cerrar</button>
        </div>
      </div>
    </div>

    <!-- Modal para mostrar información del empleado -->
    <div class="modal-overlay" *ngIf="showEmpleadoModal" (click)="cerrarEmpleadoModal()">
      <div class="modal-content empleado-modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h4>Gran Casino San Cristobal</h4>
          <button class="btn-close" (click)="cerrarEmpleadoModal()">&times;</button>
        </div>
        <div class="modal-body empleado-info">
          <div class="empleado-container">
            <div class="empleado-foto">
              <img *ngIf="empleadoSeleccionado?.foto" 
                   [src]="getEmpleadoFoto(empleadoSeleccionado.foto)" 
                   [alt]="empleadoSeleccionado.nombre"
                   class="foto-perfil"
                   (error)="onImageError($event)">
              <div *ngIf="!empleadoSeleccionado?.foto" class="foto-placeholder">
                <span class="icono-usuario">👤</span>
              </div>
            </div>
            <div class="empleado-datos">
              <h3 class="empleado-nombre">{{ empleadoSeleccionado?.nombre }}</h3>
              <div class="datos-lista">
                <div class="dato-item">
                  <strong>Cédula:</strong> {{ empleadoSeleccionado?.cedula }}
                </div>
                <div class="dato-item">
                  <strong>Área:</strong> {{ empleadoSeleccionado?.Area?.nombre || 'General' }}
                </div>
                <div class="dato-item">
                  <strong>Departamento:</strong> {{ empleadoSeleccionado?.Departamento?.nombre || 'Sistemas' }}
                </div>
                <div class="dato-item">
                  <strong>Cargo:</strong> {{ empleadoSeleccionado?.Cargo?.nombre || 'Jefe de Sistemas' }}
                </div>
                <div class="dato-item">
                  <strong>Sexo:</strong> {{ empleadoSeleccionado?.sexo || 'Masculino' }}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="cerrarEmpleadoModal()">Cerrar</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Wrapper principal con altura fija y scroll interno - Actualizado */
    .reporte-wrapper {
      height: calc(100vh - 10px) !important;
      overflow-y: auto;
      background: #f8f9fa;
      position: relative;
      /* Ocultar scrollbar pero mantener funcionalidad */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }

    .reporte-wrapper::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }

    /* Forzar altura específica */
    .reporte-wrapper {
      height: calc(100vh - 10px) !important;
      max-height: calc(100vh - 10px) !important;
    }

    .reporte-container {
      background: #f8f9fa;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      min-height: 100%;
    }

    .reporte-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 12px;
      margin-bottom: 30px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    }

    .reporte-header h1 {
      margin: 0 0 20px 0;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .info p {
      margin: 5px 0;
      font-size: 1.1rem;
    }

    .content {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 0px !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .content h2 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 20px;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid #dee2e6;
      margin-bottom: 30px;
      /* Ocultar scrollbar pero mantener funcionalidad */
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* IE and Edge */
    }

    .table-container::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Opera */
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
    }

    .data-table th {
      background: #343a40;
      color: white;
      padding: 15px 12px;
      font-weight: 600;
      text-align: left;
      border: none;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .data-table td {
      padding: 12px;
      border-top: 1px solid #dee2e6;
    }

    .data-table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .data-table tbody tr:nth-child(even) {
      background-color: #f8f9fa;
    }

    .data-table tbody tr:nth-child(even):hover {
      background-color: #e9ecef;
    }

    .total-row {
      background: #e9ecef !important;
      font-weight: 600;
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      font-style: italic;
    }

    .loading {
      text-align: center;
      padding: 40px;
      color: #666;
    }


    @media (max-width: 768px) {
      .reporte-container {
        padding: 8px;
      }

      .reporte-header {
        padding: 15px;
        margin-bottom: 20px;
      }

      .reporte-header h1 {
        font-size: 1.5rem;
        margin: 0 0 15px 0;
      }

      .info p {
        font-size: 0.9rem;
        margin: 3px 0;
      }

      .content {
        padding: 12px;
        margin-bottom: 0px !important;
      }

      .content h2 {
        font-size: 1.2rem;
        margin-bottom: 15px;
        padding-bottom: 8px;
      }

      .data-table {
        font-size: 0.75rem;
        min-width: unset;
      }

      .data-table th,
      .data-table td {
        padding: 6px 4px;
        font-size: 0.7rem;
        text-align: center;
        white-space: nowrap;
      }

      .data-table th:first-child,
      .data-table td:first-child {
        text-align: left;
        white-space: normal;
      }

      .table-container {
        overflow-x: auto;
        margin-bottom: 20px;
      }

      .total-row {
        font-size: 0.7rem;
      }

      .no-data {
        padding: 20px;
        font-size: 0.8rem;
      }

      .loading {
        padding: 20px;
        font-size: 0.8rem;
      }

      /* Asegurar que todo el contenido sea scrolleable */
      .content {
        height: auto;
      }

      .data-table {
        height: auto;
      }
    }

    /* Estilos para eventos en lote */
    .evento-lote {
      color: #007bff;
      font-weight: bold;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      text-decoration: none;
      display: inline-block;
    }

    .btn-info {
      background: #17a2b8;
      color: white;
      font-size: 12px;
      padding: 4px 8px;
    }

    .btn-info:hover {
      background: #138496;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 12px;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .ms-2 {
      margin-left: 8px;
    }

    .mb-3 {
      margin-bottom: 1rem;
    }

    /* Estilos del modal */
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
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #dee2e6;
      background: #f8f9fa;
    }

    .modal-header h4 {
      margin: 0;
      color: #333;
    }

    .btn-close {
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

    .btn-close:hover {
      color: #000;
    }

    .modal-body {
      padding: 20px;
      max-height: 60vh;
      overflow-y: auto;
    }

    .evento-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
    }

    .maquinas-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }

    .maquina-item {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
    }

    .maquina-numero {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }

    .maquina-rango {
      color: #666;
      font-size: 12px;
      margin-top: 2px;
    }

    .llaves-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      margin-top: 15px;
    }

    .llave-item {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
    }

    .llave-nombre {
      font-weight: bold;
      color: #333;
      font-size: 14px;
    }

    .llave-sala {
      color: #666;
      font-size: 12px;
      margin-top: 2px;
    }

    .modal-footer {
      padding: 15px 20px;
      border-top: 1px solid #dee2e6;
      background: #f8f9fa;
      text-align: right;
    }

    /* Estilos para enlace de empleado */
    .empleado-link {
      color: #17a2b8;
      cursor: pointer;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .empleado-link:hover {
      color: #138496;
      text-decoration: underline;
    }

    /* Estilos para modal de empleado */
    .empleado-modal {
      max-width: 600px;
      width: 90%;
    }

    .empleado-info {
      padding: 0;
    }

    .empleado-container {
      display: flex;
      gap: 20px;
      padding: 20px;
    }

    .empleado-foto {
      flex: 0 0 120px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .foto-perfil {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #17a2b8;
    }

    .foto-placeholder {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: #f8f9fa;
      border: 3px solid #17a2b8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      color: #6c757d;
    }

    .icono-usuario {
      font-size: 48px;
      color: #6c757d;
    }

    .empleado-datos {
      flex: 1;
    }

    .empleado-nombre {
      font-size: 1.5rem;
      font-weight: 700;
      color: #333;
      margin: 0 0 20px 0;
    }

    .datos-lista {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .dato-item {
      font-size: 14px;
      line-height: 1.4;
    }

    .dato-item strong {
      color: #333;
      font-weight: 600;
    }
  `]
})
export class ReporteCecomComponent implements OnInit, AfterViewInit {
  libroId!: number;
  libro: any = null;
  drops: any[] = [];
  novedades: any[] = [];
  novedadesAgrupadas: any[] = [];
  novedadesMesas: any[] = [];
  controlLlaves: any[] = [];
  controlLlavesAgrupados: any[] = [];
  incidencias: any[] = [];
  loading: boolean = true;
  
  // Modal para mostrar máquinas afectadas
  showMaquinasModal = false;
  maquinasAfectadas: any[] = [];
  eventoSeleccionado: any = null;

  // Modal para mostrar llaves afectadas
  showLlavesModal = false;
  llavesAfectadas: any[] = [];
  eventoLlavesSeleccionado: any = null;

  // Modal para mostrar información del empleado
  showEmpleadoModal = false;
  empleadoSeleccionado: any = null;

  // Totales calculados
  totalDenominacion100: number = 0;
  totalDenominacion50: number = 0;
  totalDenominacion20: number = 0;
  totalDenominacion10: number = 0;
  totalDenominacion5: number = 0;
  totalDenominacion1: number = 0;
  totalGeneral: number = 0;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private meta: Meta,
    private title: Title
  ) { }

  ngOnInit(): void {
    this.libroId = +this.route.snapshot.paramMap.get('libroId')!;
    this.loadReportData();
  }

  ngAfterViewInit(): void {
    // Ya no necesitamos forzar estilos, el scroll interno se encarga
  }

  loadReportData(): void {
    this.loading = true;
    
    // Cargar datos del libro usando endpoint público
    this.http.get(`${environment.apiUrl}/public/libros/${this.libroId}`).subscribe({
      next: (libro: any) => {
        this.libro = libro;
        this.loadRelatedData();
        this.updateMetaTags();
      },
      error: (error: any) => {
        this.loading = false;
      }
    });
  }

  loadRelatedData(): void {
    let completedRequests = 0;
    const totalRequests = 5;

    const checkAllLoaded = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        this.loading = false;
      }
    };

    // Cargar drops usando endpoint público
    this.http.get(`${environment.apiUrl}/public/drops/${this.libroId}`).subscribe({
      next: (drops: any) => {
        this.drops = drops;
        this.calculateTotals();
        checkAllLoaded();
      },
      error: (error: any) => {
        checkAllLoaded();
      }
    });

    // Cargar novedades de mesas usando endpoint público
    this.http.get(`${environment.apiUrl}/public/novedades-mesas/${this.libroId}`).subscribe({
      next: (novedadesMesas: any) => {
        this.novedadesMesas = novedadesMesas;
        checkAllLoaded();
      },
      error: (error: any) => {
        checkAllLoaded();
      }
    });

    // Cargar novedades de máquinas usando endpoint público
    this.http.get(`${environment.apiUrl}/public/novedades-maquinas/${this.libroId}`).subscribe({
      next: (novedades: any) => {
        this.novedades = novedades;
        // Agrupar novedades por [Empleado, Novedad, Hora]
        this.novedadesAgrupadas = this.agruparNovedades(novedades);
        checkAllLoaded();
      },
      error: (error: any) => {
        checkAllLoaded();
      }
    });

    // Cargar control de llaves usando endpoint público
    this.http.get(`${environment.apiUrl}/public/control-llaves/${this.libroId}`).subscribe({
      next: (controlLlaves: any) => {
        this.controlLlaves = controlLlaves;
        // Agrupar control de llaves por [Empleado, Hora]
        this.controlLlavesAgrupados = this.agruparControlLlaves(controlLlaves);
        checkAllLoaded();
      },
      error: (error: any) => {
        checkAllLoaded();
      }
    });

    // Cargar incidencias usando endpoint público
    this.http.get(`${environment.apiUrl}/public/incidencias/${this.libroId}`).subscribe({
      next: (incidencias: any) => {
        this.incidencias = incidencias;
        checkAllLoaded();
      },
      error: (error: any) => {
        checkAllLoaded();
      }
    });
  }

  calculateTotals(): void {
    this.totalDenominacion100 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_100 || 0) * 100), 0);
    this.totalDenominacion50 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_50 || 0) * 50), 0);
    this.totalDenominacion20 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_20 || 0) * 20), 0);
    this.totalDenominacion10 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_10 || 0) * 10), 0);
    this.totalDenominacion5 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_5 || 0) * 5), 0);
    this.totalDenominacion1 = this.drops.reduce((sum: number, drop: any) => sum + ((drop.denominacion_1 || 0) * 1), 0);
    
    this.totalGeneral = this.totalDenominacion100 + this.totalDenominacion50 + this.totalDenominacion20 + 
                       this.totalDenominacion10 + this.totalDenominacion5 + this.totalDenominacion1;
    
    // Actualizar metaetiquetas después de calcular totales
    this.updateMetaTags();
  }

  calculateDropTotal(drop: any): number {
    return ((drop.denominacion_100 || 0) * 100) +
           ((drop.denominacion_50 || 0) * 50) +
           ((drop.denominacion_20 || 0) * 20) +
           ((drop.denominacion_10 || 0) * 10) +
           ((drop.denominacion_5 || 0) * 5) +
           ((drop.denominacion_1 || 0) * 1);
  }

  updateMetaTags(): void {
    if (!this.libro || !this.totalGeneral) return;

    const sala = this.libro.Sala?.nombre || 'Sala';
    const fecha = new Date(this.libro.created_at).toLocaleDateString('es-ES');
    const total = this.totalGeneral.toLocaleString('es-ES', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    const title = `Reporte de CECOM ${sala} - ${fecha} - Total de Drop Recaudado: ${total}`;
    const description = 'Para ver más detalles abra el enlace';

    // Actualizar título de la página
    this.title.setTitle(title);

    // Actualizar metaetiquetas Open Graph
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: window.location.href });
    
    // Metaetiquetas adicionales para mejor compatibilidad
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });

  }

  agruparNovedades(novedades: any[]): any[] {
    const grupos = new Map<string, any>();
    
    novedades.forEach(novedad => {
      const clave = `${novedad.empleado_id}-${novedad.descripcion}-${novedad.hora}`;
      
      if (grupos.has(clave)) {
        const grupo = grupos.get(clave);
        grupo.maquinas.push(novedad.Maquina);
        grupo.ids.push(novedad.id);
      } else {
        grupos.set(clave, {
          empleado: novedad.Empleado,
          descripcion: novedad.descripcion,
          hora: novedad.hora,
          maquinas: [novedad.Maquina],
          ids: [novedad.id],
          esLote: false
        });
      }
    });
    
    // Convertir a array y marcar como lote si tiene más de 1 máquina
    return Array.from(grupos.values()).map(grupo => {
      grupo.esLote = grupo.maquinas.length > 1;
      return grupo;
    });
  }

  agruparControlLlaves(controlLlaves: any[]): any[] {
    const grupos = new Map<string, any>();
    
    controlLlaves.forEach(control => {
      const clave = `${control.empleado_id}-${control.hora}`;
      
      if (grupos.has(clave)) {
        const grupo = grupos.get(clave);
        grupo.llaves.push(control.Llave);
        grupo.ids.push(control.id);
      } else {
        grupos.set(clave, {
          empleado: control.Empleado,
          hora: control.hora,
          llaves: [control.Llave],
          ids: [control.id],
          esLote: false
        });
      }
    });
    
    // Convertir a array y marcar como lote si tiene más de 1 llave
    return Array.from(grupos.values()).map(grupo => {
      grupo.esLote = grupo.llaves.length > 1;
      return grupo;
    });
  }

  mostrarMaquinasAfectadas(evento: any) {
    this.eventoSeleccionado = evento;
    this.maquinasAfectadas = evento.maquinas;
    this.showMaquinasModal = true;
  }

  cerrarModal() {
    this.showMaquinasModal = false;
    this.maquinasAfectadas = [];
    this.eventoSeleccionado = null;
  }

  mostrarLlavesAfectadas(evento: any) {
    this.eventoLlavesSeleccionado = evento;
    this.llavesAfectadas = evento.llaves;
    this.showLlavesModal = true;
  }

  cerrarLlavesModal() {
    this.showLlavesModal = false;
    this.llavesAfectadas = [];
    this.eventoLlavesSeleccionado = null;
  }

  // Método para mostrar información del empleado
  mostrarEmpleado(empleado: any) {
    
    
    
    this.empleadoSeleccionado = empleado;
    this.showEmpleadoModal = true;
  }

  cerrarEmpleadoModal() {
    this.showEmpleadoModal = false;
    this.empleadoSeleccionado = null;
  }

  // Método para obtener la foto del empleado con el formato correcto
  getEmpleadoFoto(foto: string): string {
    
    
    
    
    if (!foto) {
      
      return '';
    }
    
    // Si ya tiene el prefijo data:, devolver tal como está
    if (foto.startsWith('data:')) {
      
      return foto;
    }
    
    // Si no tiene prefijo, agregar el prefijo base64
    const fotoConPrefijo = `data:image/png;base64,${foto}`;
    
    return fotoConPrefijo;
  }

  // Método para manejar errores de imagen
  onImageError(event: any) {
    
    // Ocultar la imagen y mostrar el placeholder
    event.target.style.display = 'none';
  }
}

