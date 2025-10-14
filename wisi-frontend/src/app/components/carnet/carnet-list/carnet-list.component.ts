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
          <div class="carnet-front" *ngIf="shouldShowFront()">
            <!-- Diseño del carnet - Frente -->
            <div class="carnet-header">
              <div class="company-logo">
                <div class="logo-placeholder">🏢</div>
              </div>
              <div class="company-info">
                <h3>GRAN CASINO</h3>
                <p>San Cristóbal</p>
              </div>
            </div>
            
            <div class="carnet-body">
              <div class="employee-photo">
                <img *ngIf="carnet.data?.foto" [src]="getEmployeePhoto(carnet.data.foto)" [alt]="carnet.data.nombre">
                <div *ngIf="!carnet.data?.foto" class="photo-placeholder">👤</div>
              </div>
              
              <div class="employee-info">
                <h4 class="employee-name">{{ carnet.data?.nombre || 'Sala sin empleados' }}</h4>
                <p class="employee-cedula">{{ carnet.data?.cedula || carnet.sala?.nombre }}</p>
                <p class="employee-position">{{ carnet.data?.Cargo?.nombre || 'Sin cargo' }}</p>
                <p class="employee-department">{{ carnet.data?.Departamento?.nombre || 'Sin departamento' }}</p>
              </div>
            </div>
            
            <div class="carnet-footer">
              <div class="employee-id">ID: {{ carnet.data?.id || carnet.sala?.id }}</div>
              <div class="validity">Válido hasta: 12/2025</div>
            </div>
          </div>

          <div class="carnet-back" *ngIf="!shouldShowFront()">
            <!-- Diseño del carnet - Detrás (Información de la Sala) -->
            <div class="carnet-back-content">
              <p class="intro-text">El portador del presente Carnet presta sus servicios Profesionales a:</p>
              
              <div class="company-info">
                <h3 class="company-name">{{ carnet.sala?.nombre_comercial || 'GRAN CASINO SAN CRISTÓBAL' }}</h3>
                <p class="company-rif">R.I.F.: {{ carnet.sala?.rif || 'J-12345678-9' }}</p>
              </div>
              
              <p class="instruction-text">
                Se le agradece a las autoridades Civiles, Militares y otros Organismos Públicos, 
                brindarle todo su apoyo y colaboración. En caso de emergencia o pérdida, favor avisar al teléfono:
              </p>
              
              <div class="phone-section">
                <p class="phone-number">{{ carnet.sala?.telefono || '0412-000.00.00' }}</p>
              </div>
              
              <p class="address-text">{{ carnet.sala?.ubicacion || 'Av. Principal, Centro, San Cristóbal' }}</p>
              
              <div class="email-section">
                <div class="email-label">Correo:</div>
                <div class="email-address">{{ carnet.sala?.correo || 'info@casino.com' }}</div>
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
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: transform 0.3s ease;
      width: 220px;
      height: 360px;
      margin: 0 auto;
    }

    .carnet-card:hover {
      transform: translateY(-4px);
    }

    /* Estilos para el frente del carnet */
    .carnet-front {
      padding: 15px;
      height: 400px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .carnet-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .company-logo {
      width: 50px;
      height: 50px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
    }

    .logo-placeholder {
      font-size: 24px;
    }

    .company-info h3 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
    }

    .company-info p {
      margin: 0;
      font-size: 12px;
      opacity: 0.8;
    }

    .carnet-body {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .employee-photo {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      margin-right: 15px;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .employee-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .photo-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.2);
      font-size: 32px;
    }

    .employee-info {
      flex: 1;
    }

    .employee-name {
      margin: 0 0 5px 0;
      font-size: 16px;
      font-weight: bold;
    }

    .employee-cedula {
      margin: 0 0 5px 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .employee-position {
      margin: 0 0 3px 0;
      font-size: 12px;
      opacity: 0.8;
    }

    .employee-department {
      margin: 0;
      font-size: 12px;
      opacity: 0.8;
    }

    .carnet-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      opacity: 0.8;
    }

    /* Estilos para el reverso del carnet */
    .carnet-back {
      padding: 15px;
      height: 400px;
      background: #f5f5f5; /* Gris claro como en la imagen */
      color: #333;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
    }

    .carnet-back-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .intro-text {
      margin: 0 !important;
      font-size: 10px;
      color: #333;
      line-height: 1.3;
      text-align: left;
      font-weight: normal;
    }

    .company-info {
      margin: 20px 0 20px 0;
      text-align: center;
    }

    .company-name {
      margin: 0 !important;
      font-size: 12px !important;
      font-weight: bold;
      text-decoration: underline;
      color: #000 !important;
      text-align: center;
      line-height: 1.1;
    }

    .company-rif {
      margin: 0 !important;
      font-size: 12px;
      font-weight: bold;
      color: #000 !important;
      text-align: center;
    }

    .instruction-text {
      margin: 0 !important;
      font-size: 10px;
      color: #333;
      line-height: 1.3;
      text-align: left;
      font-weight: normal;
    }

    .phone-section {
      margin: 20px 0 20px 0;
    }

    .phone-number {
      margin: 0 !important;
      font-size: 12px;
      font-weight: bold;
      color: #333;
      text-align: center;
    }

    .address-text {
      margin: 0 !important;
      font-size: 10px;
      font-style: italic;
      color: #333;
      line-height: 1.3;
      text-align: center;
    }

    .email-section {
      background: #8B4513; /* Marrón oscuro como en la imagen */
      color: white;
      padding: 10px;
      border-radius: 8px;
      margin-top: auto;
      margin-bottom: 35px;
      text-align: center;
      min-height: 40px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .email-label {
      font-size: 10px;
      font-weight: normal;
      margin-bottom: 4px;
    }

    .email-address {
      font-size: 10px;
      font-weight: bold;
      color: white;
      margin-top: 2px;
      word-break: break-all;
      line-height: 1.2;
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
      this.userService.getSalas().toPromise()
    ]).then(([empleados, salas]) => {
      console.log('🔍 Empleados cargados:', empleados);
      console.log('🏢 Salas cargadas:', salas);
      
      this.empleados = empleados || [];
      this.salas = salas || [];
      
      // Crear carnets para cada sala
      this.carnetsData = [];
      console.log('🔍 Debug - Salas cargadas:', salas);
      
      // Agregar carnets de empleados
      this.empleados.forEach(empleado => {
        this.carnetsData.push({
          type: 'empleado',
          data: empleado,
          sala: empleado?.Cargo?.Departamento?.Area?.Sala
        });
      });
      
      // Agregar carnets de salas sin empleados
      this.salas.forEach(sala => {
        const hasEmployees = this.empleados.some(emp => 
          emp?.Cargo?.Departamento?.Area?.Sala?.id === sala.id
        );
        
        if (!hasEmployees) {
          this.carnetsData.push({
            type: 'sala',
            data: null,
            sala: sala
          });
        }
      });
      
      console.log('🎫 Carnets creados:', this.carnetsData);
      this.applyFilters();
      this.loading = false;
    }).catch(error => {
      console.error('❌ Error cargando datos:', error);
      this.loading = false;
    });
  }

  applyFilters() {
    this.filteredEmpleados = this.carnetsData.filter(carnet => {
      // Filtro por lado (frente/detrás) - esto se maneja en el template
      // Filtro por color - por ahora todos los carnets tienen los mismos colores
      return true;
    });
  }

  shouldShowFront(): boolean {
    return this.ladoFilter === '' || this.ladoFilter === 'frente';
  }

  getEmployeePhoto(foto: string): string {
    if (!foto) return '';
    
    if (foto.startsWith('data:')) {
      return foto;
    }
    
    return `data:image/png;base64,${foto}`;
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
