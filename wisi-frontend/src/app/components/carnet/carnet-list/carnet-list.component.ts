import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { UserService } from '../../../services/user.service';

@Component({
  selector: 'app-carnet-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="carnet-container">
      <!-- Header con filtros -->
      <div class="header-section">
        <h2>🎫 Carnets de Empleados</h2>
        
        <div class="filters-section">
          <div class="filter-group">
            <label for="ladoFilter">Lado del Carnet:</label>
            <select 
              id="ladoFilter" 
              [(ngModel)]="ladoFilter" 
              (change)="applyFilters()"
              class="filter-select">
              <option value="">Todos</option>
              <option value="frente">De Frente</option>
              <option value="detras">Detrás</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="colorFilter">Color:</label>
            <select 
              id="colorFilter" 
              [(ngModel)]="colorFilter" 
              (change)="applyFilters()"
              class="filter-select">
              <option value="">Todos los colores</option>
              <option value="gris-claro">Gris Claro</option>
              <option value="marron-oscuro">Marrón Oscuro</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Grid de carnets -->
      <div class="carnets-grid" *ngIf="!loading">
        <div class="carnet-card" *ngFor="let carnet of filteredEmpleados">
          
          <!-- Frente del carnet (solo para empleados) -->
          <div class="carnet-front" *ngIf="carnet.type === 'empleado'">
            
          <div *ngIf="carnet.sala?.logo">
            <img  [src]="getSalaLogo(carnet.sala.logo)" [alt]="carnet.sala.nombre" class="casino-logo-full"> 
          </div>
          <div class="casino-logo-full" *ngIf="!carnet.sala?.logo">
            {{carnet.sala.nombre}}
          </div>
              
            <div class="carnet-header-black">
            </div>
            
            <div class="carnet-body-gray">
              <div class="black-background-extension"></div>
              
              <div class="hexagonal-photo-container">
                <div class="hexagonal-photo">
                  <img *ngIf="carnet.data?.foto" [src]="getEmployeePhoto(carnet.data.foto)" [alt]="carnet.data.nombre">
                  <div *ngIf="!carnet.data?.foto" class="photo-placeholder">👤</div>
                </div>
              </div>
              
              <div class="employee-name-large">
                {{ (carnet.data?.nombre || 'SIN NOMBRE').toUpperCase() }}
              </div>
              
              <div class="position-hexagonal-badge">
                {{ (carnet.data?.Cargo?.nombre || 'SIN CARGO').toUpperCase() }}
              </div>
              
              <div class="employee-details">
                <div class="detail-line">
                  <span class="label">Cedula :</span>
                  <span class="value">{{ carnet.data?.cedula || 'SIN CÉDULA' }}</span>
                </div>
                <div class="detail-line">
                  <span class="label">Departamento :</span>
                  <span class="value">{{ carnet.data?.Cargo?.Departamento?.nombre || 'SIN DEPARTAMENTO' }}</span>
                </div>
                <div class="detail-line">
                  <span class="label">Área :</span>
                  <span class="value">{{ carnet.data?.Cargo?.Departamento?.Area?.nombre || 'SIN ÁREA' }}</span>
                </div>
                <div class="detail-line">
                  <span class="label">Ingreso :</span>
                  <span class="value">{{ carnet.data?.fecha_ingreso || 'SIN FECHA' }}</span>
                </div>
              </div>
              
              <div class="barcode-section">
                <div class="barcode">
                  <span *ngFor="let bar of generateBarcodeBars(carnet.data)" 
                        class="barcode-bar" 
                        [style.height]="bar.height + 'mm'"
                        [style.width]="bar.width + 'px'">
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Reverso del carnet (solo para salas - cara trasera) -->
          <div class="carnet-back" *ngIf="carnet.type === 'sala'">
            <div class="carnet-back-content">
              <p class="intro-text">El portador del presente Carnet presta sus servicios Profesionales a:</p>
              
              <div class="company-info">
                <h3 class="company-name">{{ carnet.data?.nombre_comercial || carnet.sala?.nombre_comercial || 'SIN NOMBRE' }}</h3>
                <p class="company-rif">R.I.F.: {{ carnet.data?.rif || carnet.sala?.rif || 'SIN RIF' }}</p>
              </div>
              
              <p class="instruction-text">
                Se le agradece a las autoridades Civiles, Militares y otros Organismos Públicos, 
                brindarle todo su apoyo y colaboración. En caso de emergencia o pérdida, favor avisar al teléfono:
              </p>
              
              <div class="phone-section">
                <p class="phone-number">{{ carnet.data?.telefono || carnet.sala?.telefono || 'SIN TELÉFONO' }}</p>
              </div>
              
              <p class="address-text">{{ carnet.data?.ubicacion || carnet.sala?.ubicacion || 'SIN UBICACIÓN' }}</p>
              
              <div class="email-section">
                <div class="email-label">Correo:</div>
                <div class="email-address">{{ carnet.data?.correo || carnet.sala?.correo || 'SIN CORREO' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando carnets...</p>
      </div>

      <!-- Empty state -->
      <div class="empty-state" *ngIf="!loading && filteredEmpleados.length === 0">
        <h3>No hay carnets para mostrar</h3>
        <p>No se encontraron empleados con los filtros aplicados</p>
      </div>
    </div>
  `,
  styles: [`
    .carnet-container {
      padding: 20px;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .header-section h2 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 24px;
    }

    .filters-section {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .filter-group label {
      font-weight: 600;
      color: #333;
      font-size: 14px;
    }

    .filter-select {
      padding: 8px 12px;
      border: 2px solid #ddd;
      border-radius: 6px;
      background: white;
      font-size: 14px;
      min-width: 150px;
    }

    .filter-select:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .carnets-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-top: 20px;
    }

    .carnet-card {
      width: 53.98mm; /* Ancho del carnet de identidad */
      height: 85.6mm; /* Alto del carnet de identidad */
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    /* Estilos para el frente del carnet */
    .carnet-front {
      width: 100%;
      height: 100%;
      background: #f5f5f5;
      position: relative;
    }

    .carnet-header-black {
      background: #000;
      color: #FFD700;
      padding: 4mm;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      height: 20mm;
      clip-path: polygon(0% 0%, 100% 0%, 100% 80%, 85% 90%, 15% 90%, 0% 80%);
    }

    .casino-logo-section {
      text-align: center;
      width: 100%;
      position: relative;
      z-index: 20;
    }

    .casino-logo {
      width: 30mm;
      height: auto;
      object-fit: contain;
      max-height: 15mm;
      max-width: 100%;
      position: relative;
      z-index: 20;
      display: block;
      margin: 0 auto;
    }

    .empty-logo-section {
      width: 100%;
      height: 15mm;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* Logo centrado y más pequeño para no cortar la foto */
    .casino-logo-full {
      width: 150px;
      height: auto;
      object-fit: contain;
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 30;
      max-height: 20mm;
    }

    .empty-logo-full {
      width: 100%;
      height: 100%;
      background: transparent;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 30;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 3mm;
    }

    /* Estilos para cuando no hay logo - muestra el nombre de la sala */
    .casino-logo-full:not(img) {
      color: #fff;
      text-align: center;
      margin-top: 26px;
      font-size: 12px;
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 30;
    }

    .casino-name {
      font-size: 4mm;
      font-weight: bold;
      color: #FFD700;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
      margin: 0;
      letter-spacing: 1px;
    }

    .casino-subtitle {
      font-size: 2.5mm;
      font-weight: normal;
      color: #FFD700;
      margin: 1mm 0;
      letter-spacing: 0.5px;
    }

    .casino-stars {
      font-size: 2mm;
      color: #FFD700;
      margin: 0;
    }

    .carnet-body-gray {
      background: #f5f5f5;
      padding: 4mm;
      text-align: center;
      position: relative;
      height: calc(100% - 20mm);
    }
    
    .black-background-extension {
      position: absolute;
      top: -30mm;
      left: 0;
      right: 0;
      height: 45mm;
      background: #000;
      z-index: 5;
      clip-path: polygon(0% 0%, 100% 0%, 100% 80%, 85% 90%, 15% 90%, 0% 80%);
    }

    .angular-stripes {
      position: absolute;
      top: -4mm;
      left: 0;
      right: 0;
      height: 4mm;
      background: linear-gradient(45deg, #722f37 0%, #722f37 50%, #f5f5f5 50%, #f5f5f5 100%);
      clip-path: polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%);
    }

    .hexagonal-photo-container {
      margin-bottom: 3mm;
      margin-top: -2mm;
      z-index: 20;
      position: relative;
    }

    .hexagonal-photo {
      width: 22mm;
      height: 22mm;
      border: 4px solid #722f37;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      margin: 0 auto;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      position: relative;
    }
    
    .hexagonal-photo::before {
      content: '';
      position: absolute;
      top: -4px;
      left: -4px;
      right: -4px;
      bottom: -4px;
      background: #722f37;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
      z-index: -1;
    }

    .hexagonal-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    }

    .photo-placeholder {
      font-size: 6mm;
      color: #722f37;
    }

    .employee-name-large {
      font-size: 3.2mm;
      font-weight: bold;
      color: #000;
      text-transform: uppercase;
      line-height: 1.1;
      letter-spacing: 0.5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .position-hexagonal-badge {
      background: #722f37;
      color: white;
      padding: 1.5mm 12mm;
      clip-path: polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%);
      margin: 0 auto;
      font-size: 1.8mm;
      font-weight: bold;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      white-space: nowrap;
      display: inline-block;
    }

    .employee-details {
      text-align: left;
      margin-top: 6mm;
      margin-bottom: 1mm;
      max-width: 40mm;
      margin-left: auto;
      margin-right: auto;
    }

    .detail-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5mm;
      font-size: 2.2mm;
    }

    .detail-line .label {
      font-weight: bold;
      color: #333;
    }

    .detail-line .value {
      color: #000;
      font-weight: normal;
    }

    .barcode-section {
      position: absolute;
      bottom: 1mm;
      left: 1mm;
      right: 1mm;
      height: 3mm;
    }

    .barcode {
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 0px;
    }

    .barcode-bar {
      display: inline-block;
      background: #722f37;
      border-radius: 0.1px;
      vertical-align: bottom;
    }

    /* Estilos para el reverso del carnet */
    .carnet-back {
      width: 100%;
      height: 100%;
      background: #f5f5f5;
      color: #333;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      padding: 3mm;
    }

    .carnet-back-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .intro-text {
      margin: 0 !important;
      font-size: 2.5mm;
      color: #333;
      line-height: 1.2;
      text-align: left;
      font-weight: normal;
    }

    .company-info {
      margin: 5mm 0 5mm 0;
      text-align: center;
    }

    .company-name {
      margin: 0 !important;
      font-size: 3.5mm !important;
      font-weight: bold;
      text-decoration: underline;
      color: #000 !important;
      text-align: center;
      line-height: 1.1;
    }

    .company-rif {
      margin: 0 !important;
      font-size: 3mm;
      font-weight: bold;
      color: #000 !important;
      text-align: center;
    }

    .instruction-text {
      margin: 0 !important;
      font-size: 2.3mm;
      color: #333;
      line-height: 1.2;
      text-align: left;
      font-weight: normal;
    }

    .phone-section {
      margin: 5mm 0 0 0;
    }

    .phone-number {
      margin: 0 !important;
      font-size: 3mm;
      font-weight: bold;
      color: #333;
      text-align: center;
    }

    .address-text {
      margin: auto !important;
      font-size: 3mm;
      font-style: italic;
      color: #333;
      line-height: 1.2;
      text-align: center;
    }

    .email-section {
      background: #722f37;
      color: white;
      padding: 2mm;
      border-radius: 2mm;
      margin-top: auto;
      margin-bottom: 0mm;
      text-align: center;
      min-height: 8mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .email-label {
      font-size: 2.3mm;
      font-weight: normal;
      margin-bottom: 1mm;
    }

    .email-address {
      font-size: 2.3mm;
      font-weight: bold;
      color: white;
      margin-top: 1mm;
      word-break: break-all;
      line-height: 1.1;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
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

    .loading-state p {
      color: #666;
      font-size: 16px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .empty-state h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 20px;
    }

    .empty-state p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .carnets-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    
    @media (max-width: 900px) {
      .carnets-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
    
    @media (max-width: 600px) {
      .carnets-grid {
        grid-template-columns: 1fr;
      }
      
      .filters-section {
        flex-direction: column;
      }
      
      .filter-select {
        min-width: 100%;
      }
    }
  `]
})
export class CarnetListComponent implements OnInit {
  empleados: any[] = [];
  salas: any[] = [];
  filteredEmpleados: any[] = [];
  carnetsData: any[] = []; // Combinación de empleados y salas
  loading = true;
  ladoFilter: string = '';
  colorFilter: string = '';

  constructor(
    private empleadosService: EmpleadosService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadCarnetsData();
  }

  private loadCarnetsData() {
    this.loading = true;
    
    // Cargar empleados y salas en paralelo
    Promise.all([
      this.empleadosService.getEmpleados().toPromise(),
      this.userService.getUserSalas().toPromise()
    ]).then(([empleados, salas]) => {
      
      this.empleados = empleados || [];
      this.salas = salas || [];
      
      // Crear carnets para cada sala
      this.carnetsData = [];
      
      // Agregar carnets de empleados
      this.empleados.forEach(empleado => {
        // Buscar la sala completa con todos sus datos (incluyendo logo)
        const empleadoSala = empleado?.Cargo?.Departamento?.Area?.Sala;
        const salaCompleta = this.salas.find(sala => sala.id === empleadoSala?.id);
        
        
        const carnetData = {
          type: 'empleado',
          data: empleado,
          sala: salaCompleta || empleadoSala // Usar sala completa si existe, sino la básica
        };
        
        
        this.carnetsData.push(carnetData);
      });
      
      // Agregar caras traseras para CADA sala asignada al usuario
      this.salas.forEach(sala => {
        this.carnetsData.push({
          type: 'sala',
          data: sala, // Usar la información de la sala
          sala: sala
        });
      });
      
      this.applyFilters();
      this.loading = false;
    }).catch(error => {
      console.error('❌ Error cargando datos:', error);
      this.loading = false;
    });
  }

  applyFilters() {
    if (this.ladoFilter === 'frente') {
      // Solo carnets de empleados (frente)
      this.filteredEmpleados = this.carnetsData.filter(carnet => carnet.type === 'empleado');
    } else if (this.ladoFilter === 'detras') {
      // Solo caras traseras de salas (detrás)
      this.filteredEmpleados = this.carnetsData.filter(carnet => carnet.type === 'sala');
    } else {
      // Todos: empleados + caras traseras de salas
      this.filteredEmpleados = this.carnetsData;
    }
    
    // Aplicar filtro de color si es necesario
    if (this.colorFilter !== 'todos') {
      // Por ahora todos los carnets tienen los mismos colores
      // Aquí se puede implementar la lógica de colores específicos
    }
  }

  shouldShowFront(): boolean {
    // Solo mostrar frente para empleados, nunca para salas
    return this.ladoFilter === '' || this.ladoFilter === 'frente' || this.ladoFilter === 'todos';
  }

  getEmployeePhoto(foto: string): string {
    if (!foto) return '';
    
    if (foto.startsWith('data:')) {
      return foto;
    }
    
    return `data:image/png;base64,${foto}`;
  }

  getSalaLogo(logo: string): string {
    if (!logo) {
      return '';
    }
    
    if (logo.startsWith('data:')) {
      return logo;
    }
    
    return `data:image/png;base64,${logo}`;
  }
  

  generateBarcodeData(empleado: any): string {
    if (!empleado) return 'SIN DATA';
    
    // Generar código de barras con la data del empleado
    const barcodeData = {
      id: empleado.id || '0',
      cedula: empleado.cedula || 'SIN_CEDULA',
      nombre: empleado.nombre || 'SIN_NOMBRE',
      cargo: empleado.Cargo?.nombre || 'SIN_CARGO',
      sala: empleado.Cargo?.Departamento?.Area?.Sala?.nombre || 'SIN_SALA'
    };
    
    // Crear un string único con la data del empleado
    return `${barcodeData.id}|${barcodeData.cedula}|${barcodeData.nombre}|${barcodeData.cargo}|${barcodeData.sala}`;
  }

  generateBarcodeBars(empleado: any): any[] {
    if (!empleado) return [];
    
    // Crear un código de barras visual con barras verticales
    const data = this.generateBarcodeData(empleado);
    const bars = [];
    
    // Generar barras para código de barras
    const barcodeLength = 40; // Número de barras
    
    for (let i = 0; i < barcodeLength; i++) {
      const char = data.charCodeAt(i % data.length);
      const height = (char % 3) + 1; // Altura variable de 1 a 3mm
      const width = (char % 2) + 1; // Ancho variable de 1 a 2px
      
      bars.push({
        height: height,
        width: width
      });
    }
    
    return bars;
  }

  getSalaInfo(empleado: any, field: string): string {
    try {
      // Ruta: empleado.Cargo.Departamento.Area.Sala
      const sala = empleado?.Cargo?.Departamento?.Area?.Sala;
      console.log('🏢 Sala info for', empleado?.nombre, ':', sala);
      return sala?.[field] || '';
    } catch (error) {
      console.error('Error obteniendo info de sala:', error);
      return '';
    }
  }
}
