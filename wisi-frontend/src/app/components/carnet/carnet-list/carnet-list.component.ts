import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { UserService } from '../../../services/user.service';
import * as htmlToImage from 'html-to-image';

@Component({
  selector: 'app-carnet-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="carnet-container">
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

      <!-- Bloque de selección de lado del carnet -->
      <div class="lado-selector-section">
        <div class="lado-selector-container">
          <label class="lado-selector-label">Lado del Carnet:</label>
          <div class="radio-buttons-group">
            <label class="radio-option">
              <input 
                type="radio" 
                name="ladoCarnet" 
                value="frente"
                [checked]="ladoCarnet === 'frente'"
                (change)="onLadoCarnetChange('frente')"
                class="radio-input"
                [disabled]="!selectedSalaForDataLoad">
              <span class="radio-label">De frente</span>
            </label>
            <label class="radio-option">
              <input 
                type="radio" 
                name="ladoCarnet" 
                value="detras"
                [checked]="ladoCarnet === 'detras'"
                (change)="onLadoCarnetChange('detras')"
                class="radio-input"
                [disabled]="!selectedSalaForDataLoad">
              <span class="radio-label">Detrás</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Barra de búsqueda (solo para frente) -->
      <div class="search-section" *ngIf="selectedSalaForDataLoad && ladoCarnet === 'frente'">
        <div class="search-container">
          <label for="searchInput" class="search-label">Buscar empleado:</label>
          <input 
            id="searchInput" 
            type="text" 
            class="search-input"
            placeholder="Buscar por nombre, cédula o cargo..."
            [(ngModel)]="searchText"
            [disabled]="!selectedSalaForDataLoad"
            (keyup)="onSearchChange()" />
        </div>
      </div>

      <!-- Lista de empleados (solo para frente) -->
      <div class="empleados-list-section" *ngIf="!loading && selectedSalaForDataLoad && ladoCarnet === 'frente' && empleadosMostrados.length > 0">
        <div class="empleados-grid">
          <div class="empleado-card" *ngFor="let empleado of empleadosMostrados" (click)="abrirCarnetModal(empleado)">
            <div class="empleado-foto-container">
              <img *ngIf="empleado.foto" 
                   [src]="getEmployeePhoto(empleado.foto)" 
                   [alt]="empleado.nombre"
                   class="empleado-foto">
              <div *ngIf="!empleado.foto" class="empleado-foto-placeholder">
                <i class="fas fa-user"></i>
              </div>
            </div>
            <div class="empleado-info">
              <div class="empleado-nombre">{{ empleado.nombre }}</div>
              <div class="empleado-cedula">{{ empleado.cedula }}</div>
              <div class="empleado-cargo">{{ empleado.Cargo?.nombre || 'Sin cargo' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de salas (para detrás) -->
      <div class="sala-card-section" *ngIf="!loading && selectedSalaForDataLoad && ladoCarnet === 'detras'">
        <div class="sala-card" (click)="abrirCarnetModalSala()">
          <div class="sala-info">
            <div class="sala-nombre">{{ salaSeleccionadaParaDetras?.nombre || 'Sala' }}</div>
          </div>
        </div>
      </div>

      <!-- Loading state -->
      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando empleados...</p>
      </div>

      <!-- Empty state para frente -->
      <div class="empty-state" *ngIf="!loading && selectedSalaForDataLoad && ladoCarnet === 'frente' && empleadosMostrados.length === 0">
        <h3 *ngIf="searchText && empleadosFiltrados.length > 0">No se encontraron empleados con la búsqueda</h3>
        <h3 *ngIf="!searchText || empleadosFiltrados.length === 0">No hay empleados para mostrar</h3>
        <p *ngIf="searchText && empleadosFiltrados.length > 0">Intenta con otros términos de búsqueda</p>
        <p *ngIf="!searchText || empleadosFiltrados.length === 0">No se encontraron empleados para esta sala</p>
      </div>

      <!-- Modal de carnets -->
      <div class="modal" [class.show]="showCarnetModal">
        <div class="modal-content carnet-modal">
          <button class="btn-close-floating" (click)="cerrarCarnetModal()">×</button>
          
          <div class="modal-body">
            <div class="carnet-modal-container" *ngIf="carnetSeleccionado">
              <div class="carnet-card-modal" [id]="getCarnetId(carnetSeleccionado)">
                <!-- Frente del carnet -->
                <div *ngIf="ladoCarnet === 'frente' && carnetSeleccionado.type === 'empleado'">
                  <div [style]="getCarnetFrontStyles(carnetSeleccionado)" id="carnet-front-container">
                    <div *ngIf="carnetSeleccionado.sala?.logo">
                      <img [src]="getSalaLogo(carnetSeleccionado.sala.logo)" [alt]="carnetSeleccionado.sala.nombre" [style]="getLogoStyles()"> 
                    </div>
                    <div *ngIf="!carnetSeleccionado.sala?.logo" [style]="getLogoTextStyles()">
                      {{carnetSeleccionado.sala.nombre}}
                    </div>
                          
                    <div [style]="getHeaderStyles()">
                    </div>
                    
                    <div [style]="getBodyStyles()">
                      <div [style]="getBlackExtensionStyles()"></div>
                      
                      <div [style]="getPhotoContainerStyles()">
                        <div [style]="getHexagonalPhotoStyles(carnetSeleccionado.color)">
                          <img *ngIf="carnetSeleccionado.data?.foto" [src]="getEmployeePhoto(carnetSeleccionado.data.foto)" [alt]="carnetSeleccionado.data.nombre" [style]="getPhotoImageStyles()">
                          <div *ngIf="!carnetSeleccionado.data?.foto" [style]="getPhotoPlaceholderStyles()">👤</div>
                        </div>
                      </div>
                      
                      <div [style]="getEmployeeNameStyles()">
                        {{ (carnetSeleccionado.data?.nombre || 'SIN NOMBRE').toUpperCase() }}
                      </div>
                      
                      <div [style]="getBadgeStyles(carnetSeleccionado.color)">
                        {{ (carnetSeleccionado.data?.Cargo?.nombre || 'SIN CARGO').toUpperCase() }}
                      </div>
                      
                      <div [style]="getEmployeeDetailsStyles()">
                        <div [style]="getDetailLineStyles()">
                          <span [style]="getDetailLabelStyles()">Cedula :</span>
                          <span [style]="getDetailValueStyles()">{{ carnetSeleccionado.data?.cedula || 'SIN CÉDULA' }}</span>
                        </div>
                        <div [style]="getDetailLineStyles()">
                          <span [style]="getDetailLabelStyles()">Departamento :</span>
                          <span [style]="getDetailValueStyles()">{{ carnetSeleccionado.data?.Cargo?.Area?.Departamento?.nombre || 'SIN DEPARTAMENTO' }}</span>
                        </div>
                        <div [style]="getDetailLineStyles()">
                          <span [style]="getDetailLabelStyles()">Área :</span>
                          <span [style]="getDetailValueStyles()">{{ carnetSeleccionado.data?.Cargo?.Area?.nombre || 'SIN ÁREA' }}</span>
                        </div>
                        <div [style]="getDetailLineStyles()">
                          <span [style]="getDetailLabelStyles()">Ingreso :</span>
                          <span [style]="getDetailValueStyles()">{{ carnetSeleccionado.data?.fecha_ingreso || 'SIN FECHA' }}</span>
                        </div>
                      </div>
                      
                      <div [style]="getBarcodeSectionStyles()">
                        <div [style]="getBarcodeStyles(carnetSeleccionado.color)">
                          <span *ngFor="let bar of generateBarcodeBars(carnetSeleccionado.data)" 
                                [style]="getBarcodeBarStyles(bar, carnetSeleccionado.color)">
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Reverso del carnet -->
                <div *ngIf="ladoCarnet === 'detras'">
                  <div [style]="getCarnetBackStyles(carnetSeleccionado)" id="carnet-back-container">
                    <div [style]="getBackContentStyles()">
                      <p [style]="getIntroTextStyles()">El portador del presente Carnet presta sus servicios Profesionales a:</p>
                      
                      <div [style]="getCompanyInfoStyles()">
                        <h3 [style]="getCompanyNameStyles()">{{ carnetSeleccionado.sala?.nombre_comercial || carnetSeleccionado.sala?.nombre || 'SIN NOMBRE' }}</h3>
                        <p [style]="getCompanyRifStyles()">R.I.F.: {{ carnetSeleccionado.sala?.rif || 'SIN RIF' }}</p>
                      </div>
                      
                      <p [style]="getInstructionTextStyles()">
                        Se le agradece a las autoridades Civiles, Militares y otros Organismos Públicos, 
                        brindarle todo su apoyo y colaboración. En caso de emergencia o pérdida, favor avisar al teléfono:
                      </p>
                      
                      <div [style]="getPhoneSectionStyles()">
                        <p [style]="getPhoneNumberStyles()">{{ carnetSeleccionado.sala?.telefono || 'SIN TELÉFONO' }}</p>
                      </div>
                      
                      <p [style]="getAddressTextStyles()">{{ carnetSeleccionado.sala?.ubicacion || 'SIN UBICACIÓN' }}</p>
                      
                      <div [style]="getEmailSectionStyles(carnetSeleccionado.color)">
                        <div [style]="getEmailLabelStyles()">Correo:</div>
                        <div [style]="getEmailAddressStyles()">{{ carnetSeleccionado.sala?.correo || 'SIN CORREO' }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Controles de navegación -->
          <div class="modal-navigation-floating">
            <button class="btn" *ngIf="ladoCarnet === 'frente'" (click)="carnetAnterior()" [disabled]="!puedeAnteriorCarnet">Anterior</button>
            <button class="btn" (click)="cambioColorAnterior()" [disabled]="!puedeColorAnterior">←</button>
            <span class="modal-counter" *ngIf="ladoCarnet === 'frente'">{{ currentCarnetIndex + 1 }} / {{ empleadosFiltrados.length }} - {{ currentColorIndex + 1 }} / {{ colors.length }}</span>
            <span class="modal-counter" *ngIf="ladoCarnet === 'detras'">{{ currentColorIndex + 1 }} / {{ colors.length }}</span>
            <button class="btn" (click)="cambioColorSiguiente()" [disabled]="!puedeColorSiguiente">→</button>
            <button class="btn" *ngIf="ladoCarnet === 'frente'" (click)="carnetSiguiente()" [disabled]="!puedeSiguienteCarnet">Siguiente</button>
          </div>

          <!-- Acciones -->
          <div class="modal-actions-floating">
            <button class="btn" (click)="descargarCarnet(carnetSeleccionado)">Descargar</button>
          </div>
        </div>
      </div>
    </div>

  `,
  styles: [`
    .carnet-container {
      padding: 20px;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    /* Estilos para selección de sala */
    .sala-selector-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .sala-selector-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .sala-selector-label {
      font-weight: 600;
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
      cursor: pointer;
      padding: 8px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      transition: all 0.3s;
      background: white;
    }

    .radio-option:hover {
      border-color: #4CAF50;
      background: #f0f9f0;
    }

    .radio-input {
      margin-right: 8px;
      cursor: pointer;
    }

    .radio-input:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    .radio-label {
      font-size: 14px;
      color: #333;
      user-select: none;
    }

    .radio-option input[type="radio"]:checked + .radio-label {
      font-weight: 600;
      color: #4CAF50;
    }

    .radio-option input[type="radio"]:checked ~ *,
    .radio-option:has(input[type="radio"]:checked) {
      border-color: #4CAF50;
      background: #e8f5e9;
    }

    /* Estilos para selección de lado */
    .lado-selector-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .lado-selector-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .lado-selector-label {
      font-weight: 600;
      color: #333;
      font-size: 16px;
      margin-bottom: 10px;
    }

    /* Estilos para barra de búsqueda */
    .search-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .search-container {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .search-label {
      font-weight: 600;
      color: #333;
      font-size: 16px;
      white-space: nowrap;
      display: flex;
      align-items: center;
    }

    .search-input {
      flex: 1;
      padding: 12px 16px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 14px;
      transition: border-color 0.3s;
      background: white;
    }

    .search-input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .search-input:disabled {
      background: #f5f5f5;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .search-input::placeholder {
      color: #999;
    }

    @media (max-width: 768px) {
      .search-container {
        flex-direction: column;
      }
      
      .search-label {
        margin-bottom: 8px;
      }
    }

    /* Estilos para lista de empleados */
    .empleados-list-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .empleados-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .empleado-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 15px;
      border: none;
      border-radius: 8px;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      min-height: 220px;
      justify-content: center;
    }

    .empleado-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    }

    .empleado-foto-container {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      overflow: hidden;
      margin-bottom: 15px;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
    }

    .empleado-foto {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .empleado-foto-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 40px;
    }

    .empleado-info {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .empleado-nombre {
      font-weight: bold;
      color: #000;
      font-size: 16px;
      margin-bottom: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empleado-cedula {
      font-size: 14px;
      color: #333;
      margin-bottom: 0;
      font-weight: normal;
    }

    .empleado-cargo {
      font-size: 12px;
      color: #999;
      font-style: italic;
    }

    /* Estilos para tarjeta de sala (detrás) */
    .sala-card-section {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .sala-card {
      display: flex;
      align-items: center;
      padding: 20px;
      border: 2px solid #ddd;
      border-radius: 12px;
      background: white;
      cursor: pointer;
      transition: all 0.3s;
      gap: 20px;
    }

    .sala-card:hover {
      border-color: #4CAF50;
      transform: translateY(-5px);
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
    }

    .sala-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: #4CAF50;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 32px;
      flex-shrink: 0;
      overflow: hidden;
    }

    .sala-logo-icon {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }

    .sala-info {
      flex: 1;
    }

    .sala-nombre {
      font-weight: 600;
      color: #333;
      font-size: 18px;
      margin-bottom: 5px;
    }

    .sala-descripcion {
      font-size: 14px;
      color: #666;
    }

    .carnet-card {
      background: #f5f5f5;
      border-radius: 4px;
      overflow: hidden !important; /* Forzar overflow hidden */
      position: relative;
      margin: 0 auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      /* Aislar del CSS global */
      overflow-x: hidden !important;
      overflow-y: hidden !important;
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

    /* Colores para badge del cargo - Parte Frontal */
    .position-hexagonal-badge.marron { background: #722f37; }
    .position-hexagonal-badge.azul { background: #1e40af; }
    .position-hexagonal-badge.verde { background: #16a34a; }
    .position-hexagonal-badge.naranja { background: #ea580c; }
    .position-hexagonal-badge.morado { background: #9333ea; }
    .position-hexagonal-badge.rosado { background: #db2777; }
    .position-hexagonal-badge.gris { background: #6b7280; }
    .position-hexagonal-badge.amarillo { background: #eab308; color: #000; }
    .position-hexagonal-badge.vinotinto { background: #8B0000; }

    /* Colores para borde de la foto hexagonal */
    .hexagonal-photo.marron { 
      border: 4px solid #722f37; 
    }
    .hexagonal-photo.marron::before { 
      background: #722f37; 
    }
    
    .hexagonal-photo.azul { 
      border: 4px solid #1e40af; 
    }
    .hexagonal-photo.azul::before { 
      background: #1e40af; 
    }
    
    .hexagonal-photo.verde { 
      border: 4px solid #16a34a; 
    }
    .hexagonal-photo.verde::before { 
      background: #16a34a; 
    }
    
    .hexagonal-photo.naranja { 
      border: 4px solid #ea580c; 
    }
    .hexagonal-photo.naranja::before { 
      background: #ea580c; 
    }
    
    .hexagonal-photo.morado { 
      border: 4px solid #9333ea; 
    }
    .hexagonal-photo.morado::before { 
      background: #9333ea; 
    }
    
    .hexagonal-photo.rosado { 
      border: 4px solid #db2777; 
    }
    .hexagonal-photo.rosado::before { 
      background: #db2777; 
    }
    
    .hexagonal-photo.gris { 
      border: 4px solid #6b7280; 
    }
    .hexagonal-photo.gris::before { 
      background: #6b7280; 
    }
    
    .hexagonal-photo.amarillo { 
      border: 4px solid #eab308; 
    }
    .hexagonal-photo.amarillo::before { 
      background: #eab308; 
    }
    
    .hexagonal-photo.vinotinto { 
      border: 4px solid #8B0000; 
    }
    .hexagonal-photo.vinotinto::before { 
      background: #8B0000; 
    }

    /* Colores para barras del barcode */
    .barcode.marron .barcode-bar { background: #722f37; }
    .barcode.azul .barcode-bar { background: #1e40af; }
    .barcode.verde .barcode-bar { background: #16a34a; }
    .barcode.naranja .barcode-bar { background: #ea580c; }
    .barcode.morado .barcode-bar { background: #9333ea; }
    .barcode.rosado .barcode-bar { background: #db2777; }
    .barcode.gris .barcode-bar { background: #6b7280; }
    .barcode.amarillo .barcode-bar { background: #eab308; }
    .barcode.vinotinto .barcode-bar { background: #8B0000; }

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

    /* Colores para sección de correo - Parte Trasera */
    .email-section.marron { background: #722f37; }
    .email-section.azul { background: #1e40af; }
    .email-section.verde { background: #16a34a; }
    .email-section.naranja { background: #ea580c; }
    .email-section.morado { background: #9333ea; }
    .email-section.rosado { background: #db2777; }
    .email-section.gris { background: #6b7280; }
    .email-section.amarillo { background: #eab308; color: #000; }
    .email-section.vinotinto { background: #8B0000; }

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

    /* Estilos del modal - COPIADOS DEL MODAL DE MARCAJES */
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

    .carnet-modal {
      max-width: 98vw;
      max-height: 98vh;
      width: 98vw;
      height: 98vh;
      background: #f8f9fa;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      position: relative;
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
      justify-content: center;
      gap: 15px;
      background: rgba(0, 0, 0, 0.7);
      padding: 10px 20px;
      border-radius: 25px;
      backdrop-filter: blur(10px);
      min-width: fit-content;
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
      font-weight: 600;
    }

    .modal-actions-floating .btn:hover {
      background: rgba(0, 123, 255, 1);
      transform: translateY(-2px);
    }

    .modal-actions-floating .btn.btn-success {
      background: rgba(40, 167, 69, 0.8);
    }

    .modal-actions-floating .btn.btn-success:hover {
      background: rgba(40, 167, 69, 1);
    }

    .modal-body {
      padding: 10px !important;
      margin: 0 !important;
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
      overflow: hidden;
      min-height: 0;
      max-height: calc(98vh - 140px);
      box-sizing: border-box;
    }

    .carnet-modal-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      padding: 0;
      overflow: hidden;
      margin: 0 auto;
      max-width: 100%;
      max-height: 100%;
    }

    .carnet-card-modal {
      cursor: default !important;
      width: 53.98mm;
      height: 85.6mm;
      margin: 0 auto;
      transform-origin: center center;
      flex-shrink: 0;
      position: relative;
      /* Scale inicial, será sobrescrito por JS o media queries */
      transform: scale(2);
    }

    .carnet-card-modal:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
    }
    
    /* Ajustar escala responsiva para que no se corte y quepa sin scroll */
    /* Tamaño del carnet: 53.98mm x 85.6mm ≈ 204px x 323px a 96dpi */
    /* Ajustamos para que siempre quepa en el espacio disponible */
    @media (min-width: 1800px) {
      .carnet-card-modal {
        transform: scale(2.8);
      }
    }
    
    @media (min-width: 1400px) and (max-width: 1799px) {
      .carnet-card-modal {
        transform: scale(2.5);
      }
    }
    
    @media (min-width: 1200px) and (max-width: 1399px) {
      .carnet-card-modal {
        transform: scale(2.2);
      }
    }
    
    @media (min-width: 1000px) and (max-width: 1199px) {
      .carnet-card-modal {
        transform: scale(2);
      }
    }
    
    @media (min-width: 800px) and (max-width: 999px) {
      .carnet-card-modal {
        transform: scale(1.7);
      }
    }
    
    @media (min-width: 600px) and (max-width: 799px) {
      .carnet-card-modal {
        transform: scale(1.4);
      }
    }
    
    @media (min-width: 400px) and (max-width: 599px) {
      .carnet-card-modal {
        transform: scale(1.1);
      }
    }
    
    @media (max-width: 399px) {
      .carnet-card-modal {
        transform: scale(0.9);
      }
    }

    .carnet-card {
      cursor: pointer;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .carnet-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
    }

    /* Estilos para los botones de acción */
    .carnet-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    }

  `]
})
export class CarnetListComponent implements OnInit {
  empleados: any[] = [];
  salas: any[] = [];
  userSalas: any[] = [];
  empleadosFiltrados: any[] = [];
  filteredEmpleados: any[] = [];
  carnetsData: any[] = []; // Combinación de empleados y salas
  loading = true;
  ladoFilter: string = '';
  colorFilter: string = '';
  
  // Variables para selección de sala y lado
  selectedSalaForDataLoad: number | null = null;
  ladoCarnet: string = 'frente';
  searchText: string = '';
  empleadosMostrados: any[] = [];
  salaSeleccionadaParaDetras: any = null;
  
  // Variables para modal de carnet
  showCarnetModal = false;
  carnetSeleccionado: any = null;
  currentCarnetIndex = -1;
  currentColorIndex = 0;
  carnetsDisponibles: any[] = [];
  colors = ['marron', 'azul', 'verde', 'naranja', 'morado', 'rosado', 'gris', 'amarillo', 'vinotinto'];
  empleadoActualEnModal: any = null;

  constructor(
    private empleadosService: EmpleadosService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.loadUserSalas();
  }

  private loadUserSalas() {
    this.loading = true;
    this.userService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.userSalas = salas || [];
        if (this.userSalas.length > 0) {
          this.selectedSalaForDataLoad = this.userSalas[0].id;
          this.salaSeleccionadaParaDetras = this.userSalas[0];
          if (this.ladoCarnet === 'frente') {
            this.loadEmpleados();
          } else {
            this.loading = false;
          }
        } else {
          this.loading = false;
        }
      },
      error: () => {
        this.userSalas = [];
        this.loading = false;
      }
    });
  }

  onSalaSelectorChange(salaId: number) {
    this.selectedSalaForDataLoad = salaId;
    this.searchText = ''; // Limpiar búsqueda al cambiar de sala
    
    // Actualizar sala seleccionada para detrás
    this.salaSeleccionadaParaDetras = this.userSalas.find(s => s.id === salaId);
    
    if (this.ladoCarnet === 'frente') {
      this.loadEmpleados();
    }
  }

  onLadoCarnetChange(lado: string) {
    this.ladoCarnet = lado;
    
    // Si cambiamos a detrás, cargar la sala seleccionada
    if (lado === 'detras' && this.selectedSalaForDataLoad) {
      this.salaSeleccionadaParaDetras = this.userSalas.find(s => s.id === this.selectedSalaForDataLoad);
    }
    
    if (this.showCarnetModal) {
      if (lado === 'frente' && this.empleadoActualEnModal) {
        this.actualizarCarnetEnModal();
      } else if (lado === 'detras' && this.salaSeleccionadaParaDetras) {
        this.actualizarCarnetEnModal();
      }
    }
  }

  private loadEmpleados() {
    if (!this.selectedSalaForDataLoad) {
      this.empleadosFiltrados = [];
      this.empleadosMostrados = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.empleadosService.getEmpleados().subscribe({
      next: (empleados: any[]) => {
        this.empleados = empleados || [];
        
        // Filtrar empleados activos de la sala seleccionada
        this.empleadosFiltrados = this.empleados.filter(empleado => {
          if (empleado.activo !== 1) return false;
          
          const empleadoSala = empleado?.Cargo?.Area?.Departamento?.Sala;
          return empleadoSala?.id === this.selectedSalaForDataLoad;
        });
        
        this.aplicarFiltroBusqueda();
        this.loading = false;
      },
      error: () => {
        this.empleados = [];
        this.empleadosFiltrados = [];
        this.empleadosMostrados = [];
        this.loading = false;
      }
    });
  }

  onSearchChange() {
    this.aplicarFiltroBusqueda();
  }

  private aplicarFiltroBusqueda() {
    if (!this.searchText || this.searchText.trim() === '') {
      this.empleadosMostrados = [...this.empleadosFiltrados];
      return;
    }

    const searchTerm = this.searchText.toLowerCase().trim();
    
    this.empleadosMostrados = this.empleadosFiltrados.filter(empleado => {
      const nombre = (empleado.nombre || '').toLowerCase();
      const cedula = (empleado.cedula || '').toLowerCase();
      const cargo = (empleado.Cargo?.nombre || '').toLowerCase();
      
      return nombre.includes(searchTerm) || 
             cedula.includes(searchTerm) || 
             cargo.includes(searchTerm);
    });
  }

  applyFilters() {
    this.filteredEmpleados = this.carnetsData.filter(carnet => {
      // Filtro por lado
      const ladoMatch = !this.ladoFilter || 
        (this.ladoFilter === 'frente' && carnet.type === 'empleado') ||
        (this.ladoFilter === 'detras' && carnet.type === 'sala') ||
        (this.ladoFilter === 'todos');
      
      // Filtro por color
      const colorMatch = !this.colorFilter || carnet.color === this.colorFilter;
      
      return ladoMatch && colorMatch;
    });
  }

  getRandomColor(): string {
    const colors = ['marron', 'azul', 'verde', 'naranja', 'morado', 'rosado', 'gris', 'amarillo', 'vinotinto'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Métodos para el modal de carnet
  abrirCarnetModal(empleado: any) {
    this.empleadoActualEnModal = empleado;
    
    // Buscar la sala completa
    const empleadoSala = empleado?.Cargo?.Area?.Departamento?.Sala;
    const salaCompleta = this.userSalas.find(s => s.id === empleadoSala?.id) || empleadoSala;
    
    // Crear el carnet inicial (siempre frente para empleados)
    this.carnetSeleccionado = {
      type: 'empleado',
      data: empleado,
      sala: salaCompleta,
      color: this.colors[this.currentColorIndex]
    };
    
    // Preparar lista de carnets disponibles (todos los empleados de esta sala)
    this.prepararCarnetsDisponibles();
    this.currentCarnetIndex = this.empleadosFiltrados.findIndex(e => e.id === empleado.id);
    this.showCarnetModal = true;
  }

  abrirCarnetModalSala() {
    if (!this.salaSeleccionadaParaDetras) return;
    
    this.empleadoActualEnModal = null;
    
    // Crear el carnet de tipo sala (parte trasera)
    this.carnetSeleccionado = {
      type: 'sala',
      data: this.salaSeleccionadaParaDetras,
      sala: this.salaSeleccionadaParaDetras,
      color: this.colors[this.currentColorIndex]
    };
    
    // Para detrás, solo hay un carnet por color de la sala
    this.carnetsDisponibles = this.colors.map(color => ({
      type: 'sala',
      data: this.salaSeleccionadaParaDetras,
      sala: this.salaSeleccionadaParaDetras,
      color: color
    }));
    
    this.currentCarnetIndex = 0; // Solo hay un "elemento" (la sala)
    this.showCarnetModal = true;
  }

  private prepararCarnetsDisponibles() {
    this.carnetsDisponibles = [];
    
    this.empleadosFiltrados.forEach(empleado => {
      const empleadoSala = empleado?.Cargo?.Area?.Departamento?.Sala;
      const salaCompleta = this.userSalas.find(s => s.id === empleadoSala?.id) || empleadoSala;
      
      if (this.ladoCarnet === 'frente') {
        this.colors.forEach(color => {
          this.carnetsDisponibles.push({
            type: 'empleado',
            data: empleado,
            sala: salaCompleta,
            color: color
          });
        });
      } else {
        // Para detrás, solo necesitamos un carnet por color (es el mismo para todos)
        // Pero por consistencia, creamos uno por empleado también
        this.colors.forEach(color => {
          this.carnetsDisponibles.push({
            type: 'sala',
            data: salaCompleta,
            sala: salaCompleta,
            color: color
          });
        });
      }
    });
  }

  actualizarCarnetEnModal() {
    if (this.ladoCarnet === 'detras') {
      // Para detrás, actualizar con la sala seleccionada
      if (this.salaSeleccionadaParaDetras) {
        this.carnetSeleccionado = {
          type: 'sala',
          data: this.salaSeleccionadaParaDetras,
          sala: this.salaSeleccionadaParaDetras,
          color: this.colors[this.currentColorIndex]
        };
      }
      return;
    }
    
    // Para frente, actualizar con el empleado
    if (!this.empleadoActualEnModal) return;
    
    const empleadoSala = this.empleadoActualEnModal?.Cargo?.Area?.Departamento?.Sala;
    const salaCompleta = this.userSalas.find(s => s.id === empleadoSala?.id) || empleadoSala;
    
    this.carnetSeleccionado = {
      type: 'empleado',
      data: this.empleadoActualEnModal,
      sala: salaCompleta,
      color: this.colors[this.currentColorIndex]
    };
    
    this.prepararCarnetsDisponibles();
  }

  cerrarCarnetModal() {
    this.showCarnetModal = false;
    this.carnetSeleccionado = null;
    this.currentCarnetIndex = -1;
    this.currentColorIndex = 0;
    this.empleadoActualEnModal = null;
    this.carnetsDisponibles = [];
  }

  carnetAnterior() {
    if (this.ladoCarnet === 'detras') {
      // Para detrás, navegamos solo por colores (no hay múltiples salas)
      return;
    }
    
    if (this.currentCarnetIndex > 0) {
      this.currentCarnetIndex--;
      this.currentColorIndex = 0;
      this.empleadoActualEnModal = this.empleadosFiltrados[this.currentCarnetIndex];
      this.actualizarCarnetEnModal();
    }
  }

  carnetSiguiente() {
    if (this.ladoCarnet === 'detras') {
      // Para detrás, navegamos solo por colores (no hay múltiples salas)
      return;
    }
    
    if (this.currentCarnetIndex < this.empleadosFiltrados.length - 1) {
      this.currentCarnetIndex++;
      this.currentColorIndex = 0;
      this.empleadoActualEnModal = this.empleadosFiltrados[this.currentCarnetIndex];
      this.actualizarCarnetEnModal();
    }
  }

  cambioColorAnterior() {
    if (this.currentColorIndex > 0) {
      this.currentColorIndex--;
      this.actualizarCarnetEnModal();
    }
  }

  cambioColorSiguiente() {
    if (this.currentColorIndex < this.colors.length - 1) {
      this.currentColorIndex++;
      this.actualizarCarnetEnModal();
    }
  }

  get puedeAnteriorCarnet(): boolean {
    if (this.ladoCarnet === 'detras') return false; // No hay navegación entre salas
    return this.currentCarnetIndex > 0;
  }

  get puedeSiguienteCarnet(): boolean {
    if (this.ladoCarnet === 'detras') return false; // No hay navegación entre salas
    return this.currentCarnetIndex < this.empleadosFiltrados.length - 1;
  }

  get puedeColorAnterior(): boolean {
    return this.currentColorIndex > 0;
  }

  get puedeColorSiguiente(): boolean {
    return this.currentColorIndex < this.colors.length - 1;
  }


  // ===== ESTILOS INLINE PARA CARNET FRONTAL =====
  
  getCarnetFrontStyles(carnet: any): string {
    return 'width: 53.98mm; height: 85.6mm; background: #f5f5f5; position: relative;';
  }

  getLogoStyles(): string {
    return 'width: 150px; height: 64px; object-fit: contain; position: absolute; top: 13px; left: 50%; transform: translateX(-50%); z-index: 30;';
  }

  getLogoTextStyles(): string {
    return 'color: #fff; text-align: center; margin-top: 26px; font-size: 12px; position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 30;';
  }

  getHeaderStyles(): string {
    return 'background: #000; color: #FFD700; padding: 4mm; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; height: 20mm; clip-path: polygon(0% 0%, 100% 0%, 100% 80%, 85% 90%, 15% 90%, 0% 80%);';
  }

  getBodyStyles(): string {
    return 'background: #f5f5f5; padding: 4mm; text-align: center; position: relative; height: calc(100% - 20mm);';
  }

  getBlackExtensionStyles(): string {
    return 'position: absolute; top: -30mm; left: 0; right: 0; height: 45mm; background: #000; z-index: 5; clip-path: polygon(0% 0%, 100% 0%, 100% 80%, 85% 90%, 15% 90%, 0% 80%);';
  }

  getPhotoContainerStyles(): string {
    return 'margin-bottom: 3mm; margin-top: -2mm; z-index: 20; position: relative;';
  }

  getHexagonalPhotoStyles(color: string): string {
    const colorHex = this.getColorHex(color);
    return `width: 22mm; height: 22mm; border: 2px solid ${colorHex}; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); margin: 0 auto; overflow: hidden; display: flex; align-items: center; justify-content: center; background: ${colorHex}; position: relative;`;
  }

  getPhotoImageStyles(): string {
    return 'width: calc(100% - 4px); height: calc(100% - 4px); object-fit: cover; clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%); background: #fff; border-radius: 0;';
  }

  getPhotoPlaceholderStyles(): string {
    return 'font-size: 6mm; color: #722f37;';
  }

  getEmployeeNameStyles(): string {
    return 'font-size: 3.2mm; font-weight: bold; color: #000; text-transform: uppercase; line-height: 1.1; letter-spacing: 0.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
  }

  getBadgeStyles(color: string): string {
    const colorHex = this.getColorHex(color);
    return `background: ${colorHex}; color: white; padding: 1.5mm 4mm; clip-path: polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%); margin: 0 auto; font-size: 1.8mm; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; display: inline-block; width: auto; min-width: fit-content;`;
  }

  getEmployeeDetailsStyles(): string {
    return 'text-align: left; margin-top: 6mm; margin-bottom: 1mm; max-width: 40mm; margin-left: auto; margin-right: auto;';
  }

  getDetailLineStyles(): string {
    return 'display: flex; justify-content: space-between; margin-bottom: 0.5mm; font-size: 2.2mm;';
  }

  getDetailLabelStyles(): string {
    return 'font-weight: bold; color: #333;';
  }

  getDetailValueStyles(): string {
    return 'color: #000; font-weight: normal;';
  }

  getBarcodeSectionStyles(): string {
    return 'bottom: 2mm; height: 3mm; left: 1mm; position: absolute; right: 1mm;';
  }

  getBarcodeStyles(color: string): string {
    return 'text-align: center; white-space: nowrap; overflow: hidden; height: 100%; display: flex; align-items: flex-end; justify-content: space-between; gap: 0px;';
  }

  getBarcodeBarStyles(bar: any, color: string): string {
    const colorHex = this.getColorHex(color);
    return `display: inline-block; background: ${colorHex}; border-radius: 0.1px; vertical-align: bottom; width: ${bar.width}px; height: ${bar.height}mm;`;
  }

  // ===== ESTILOS INLINE PARA CARNET TRASERO =====

  getCarnetBackStyles(carnet: any): string {
    return 'width: 53.98mm; height: 85.6mm; background: #f5f5f5; color: #333; font-family: Arial, sans-serif; display: flex; flex-direction: column; padding: 3mm;';
  }

  getBackContentStyles(): string {
    return 'flex: 1; display: flex; flex-direction: column;';
  }

  getIntroTextStyles(): string {
    return 'margin: 0 !important; font-size: 2.5mm; color: #333; line-height: 1.2; text-align: left; font-weight: normal;';
  }

  getCompanyInfoStyles(): string {
    return 'margin: 5mm 0 5mm 0; text-align: center;';
  }

  getCompanyNameStyles(): string {
    return 'margin: 0 !important; font-size: 3.5mm !important; font-weight: bold; text-decoration: underline; color: #000 !important; text-align: center; line-height: 1.1;';
  }

  getCompanyRifStyles(): string {
    return 'margin: 0 !important; font-size: 3mm; font-weight: bold; color: #000 !important; text-align: center;';
  }

  getInstructionTextStyles(): string {
    return 'margin: 0 !important; font-size: 2.3mm; color: #333; line-height: 1.2; text-align: left; font-weight: normal;';
  }

  getPhoneSectionStyles(): string {
    return 'margin-top: 5mm;';
  }

  getPhoneNumberStyles(): string {
    return 'margin: 0 !important; font-size: 3mm; font-weight: bold; color: #333; text-align: center;';
  }

  getAddressTextStyles(): string {
    return 'align-items: center; color: rgb(51, 51, 51); display: flex; flex: 1 1 0%; font-size: 3mm; font-style: italic; justify-content: center; line-height: 1.2; margin: auto 0px !important; margin-bottom: 50px !important; text-align: center;';
  }

  getEmailSectionStyles(color: string): string {
    const colorHex = this.getColorHex(color);
    return `background: ${colorHex}; border-radius: 2mm; bottom: 0px; color: white; flex-direction: column; justify-content: center; left: 0px; margin-bottom: 2mm; margin-top: auto; min-height: 8mm; padding: 2mm; position: absolute; right: 0px; text-align: center; width: 180px; margin: auto; margin-bottom: 10px;`;
  }

  getEmailLabelStyles(): string {
    return 'font-size: 2.3mm; font-weight: normal; margin-bottom: 1mm;';
  }

  getEmailAddressStyles(): string {
    return 'font-size: 2.3mm; font-weight: bold; color: white; margin-top: 1mm; word-break: break-all; line-height: 1.1;';
  }

  // Estilos para el logo de la sala en el reverso
  getLogoSectionStyles(): string {
    return 'text-align: center; margin-bottom: 5mm; margin-top: 2mm;';
  }

  getSalaLogoStyles(): string {
    return 'max-width: 30mm; max-height: 30mm; object-fit: contain; margin: 0 auto; display: block;';
  }

  getSalaLogoPlaceholderStyles(): string {
    return 'width: 30mm; height: 30mm; background: #e9ecef; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; font-size: 15mm; color: #6c757d;';
  }


  getColorHex(color: string): string {
    const colorMap: { [key: string]: string } = {
      'marron': '#722f37',
      'azul': '#1e40af',
      'verde': '#16a34a',
      'naranja': '#ea580c',
      'morado': '#9333ea',
      'rosado': '#db2777',
      'gris': '#6b7280',
      'amarillo': '#eab308',
      'vinotinto': '#8B0000'
    };
    const hexColor = colorMap[color] || '#722f37';
    return hexColor;
  }


  generateBarcodeHTML(id: string): string {
    const bars = this.generateBarcodeBars({ id });
    return bars.map(bar => 
      `<span class="barcode-bar" style="width: ${bar.width}px; height: ${bar.height}mm;"></span>`
    ).join('');
  }



  private captureElementToCanvas(element: HTMLElement, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    // Crear una imagen del elemento usando html2canvas
    import('html2canvas').then((html2canvas) => {
      html2canvas.default(element, {
        useCORS: true,
        allowTaint: true,
        width: 53.98 * 11.81, // 53.98mm a píxeles
        height: 85.6 * 11.81 // 85.6mm a píxeles
      }).then((canvasResult: HTMLCanvasElement) => {
        // Dibujar la imagen capturada en nuestro canvas
        ctx.drawImage(canvasResult, 0, 0);
        
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png', 1.0);
        link.download = `carnet_${this.getCarnetName(element)}.png`;
        link.click();
      }).catch((error: any) => {
        
      });
    }).catch((error: any) => {
      
    });
  }

  private getCarnetName(element: HTMLElement): string {
    // Extraer el nombre del carnet del elemento
    const nameElement = element.querySelector('.employee-name-large');
    if (nameElement) {
      return nameElement.textContent?.trim() || 'carnet';
    }
    return 'carnet';
  }



  private renderCarnetToCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, carnet?: any) {
    const carnetData = carnet || this.carnetSeleccionado;
    const isEmpleado = carnetData.type === 'empleado';
    
    if (isEmpleado) {
      // Renderizar carnet de empleado
      this.renderEmpleadoCarnet(ctx, width, height, carnetData);
    } else {
      // Renderizar carnet de sala (parte trasera)
      this.renderSalaCarnet(ctx, width, height, carnetData);
    }
  }

  private renderEmpleadoCarnet(ctx: CanvasRenderingContext2D, width: number, height: number, carnet: any) {
    // Header negro con forma angular
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height * 0.25);
    ctx.lineTo(width * 0.85, height * 0.3);
    ctx.lineTo(width * 0.15, height * 0.3);
    ctx.lineTo(0, height * 0.25);
    ctx.closePath();
    ctx.fill();
    
    // Logo de la sala
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(carnet.sala?.nombre || 'Sala', width / 2, 50);
    
    // Cuerpo del carnet
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, height * 0.3, width, height * 0.7);
    
    // Foto hexagonal (círculo por simplicidad)
    const photoX = width / 2;
    const photoY = height * 0.45;
    const photoRadius = 60;
    
    // Borde de la foto
    ctx.fillStyle = this.getColorHex(carnet.color);
    ctx.beginPath();
    ctx.arc(photoX, photoY, photoRadius + 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Fondo de la foto
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(photoX, photoY, photoRadius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Iniciales en la foto
    ctx.fillStyle = '#666';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    const initials = (carnet.data?.nombre || 'E').split(' ').map((n: string) => n[0]).join('').substring(0, 2);
    ctx.fillText(initials, photoX, photoY + 8);
    
    // Nombre del empleado
    ctx.fillStyle = '#000';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(carnet.data?.nombre || 'Empleado', width / 2, height * 0.65);
    
    // Badge del cargo
    const badgeY = height * 0.72;
    const badgeWidth = 200;
    const badgeHeight = 30;
    
    ctx.fillStyle = this.getColorHex(carnet.color);
    ctx.beginPath();
    ctx.moveTo(width / 2 - badgeWidth / 2, badgeY);
    ctx.lineTo(width / 2 + badgeWidth / 2, badgeY);
    ctx.lineTo(width / 2 + badgeWidth / 2 - 10, badgeY + badgeHeight);
    ctx.lineTo(width / 2 - badgeWidth / 2 + 10, badgeY + badgeHeight);
    ctx.closePath();
    ctx.fill();
    
    // Texto del cargo
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(carnet.data?.Cargo?.nombre || 'Sin cargo', width / 2, badgeY + 20);
    
    // Detalles
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    const detailsY = height * 0.8;
    ctx.fillText(`Cédula: ${carnet.data?.cedula || 'Sin cédula'}`, 20, detailsY);
    ctx.fillText(`Departamento: ${carnet.data?.Cargo?.Area?.Departamento?.nombre || 'Sin departamento'}`, 20, detailsY + 25);
    ctx.fillText(`Área: ${carnet.data?.Cargo?.Area?.nombre || 'Sin área'}`, 20, detailsY + 50);
    ctx.fillText(`Ingreso: ${carnet.data?.fecha_ingreso || 'Sin fecha'}`, 20, detailsY + 75);
    ctx.fillText(`ID: ${carnet.data?.id || 'Sin ID'}`, 20, detailsY + 100);
    
    // Barcode
    ctx.fillStyle = this.getColorHex(carnet.color);
    const barcodeY = height * 0.95;
    for (let i = 0; i < 30; i++) {
      const barWidth = Math.random() * 4 + 2;
      const barHeight = Math.random() * 30 + 20;
      ctx.fillRect(50 + i * 6, barcodeY, barWidth, barHeight);
    }
  }

  private renderSalaCarnet(ctx: CanvasRenderingContext2D, width: number, height: number, carnet: any) {
    // Fondo
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);
    
    // Texto introductorio
    ctx.fillStyle = '#000';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('El portador del presente Carnet presta sus servicios Profesionales a:', width / 2, 80);
    
    // Nombre de la empresa
    ctx.font = 'bold 28px Arial';
    ctx.fillText(carnet.data?.nombre_comercial || carnet.data?.nombre || 'Empresa', width / 2, 130);
    
    // RIF
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`RIF: ${carnet.data?.rif || 'Sin RIF'}`, width / 2, 170);
    
    // Teléfono
    ctx.font = '18px Arial';
    ctx.fillText(`Tel: ${carnet.data?.telefono || 'Sin teléfono'}`, width / 2, 200);
    
    // Email
    ctx.fillText(`Email: ${carnet.data?.correo || 'Sin correo'}`, width / 2, 230);
    
    // Ubicación
    ctx.fillText(carnet.data?.ubicacion || 'Sin ubicación', width / 2, 260);
    
    // Texto de instrucciones
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Se le agradece a las autoridades Civiles, Militares y otros', width / 2, 320);
    ctx.fillText('Organismos Públicos, brindarle todo su apoyo y colaboración.', width / 2, 340);
    ctx.fillText('En caso de emergencia o pérdida, favor avisar al teléfono:', width / 2, 360);
    
    // Teléfono de emergencia
    ctx.font = 'bold 20px Arial';
    ctx.fillText(carnet.data?.telefono || 'Sin teléfono', width / 2, 390);
    
    // Sección de email con color
    ctx.fillStyle = this.getColorHex(carnet.color);
    ctx.fillRect(0, height - 120, width, 120);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Correo Electrónico:', width / 2, height - 80);
    ctx.font = '16px Arial';
    ctx.fillText(carnet.data?.correo || 'Sin correo', width / 2, height - 50);
  }


  imprimirCarnet() {
    if (this.carnetSeleccionado) {
      // Crear una ventana de impresión con el carnet en tamaño real
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const carnetData = this.carnetSeleccionado;
        const isEmpleado = carnetData.type === 'empleado';
        
        printWindow.document.write(`
          <html>
            <head>
              <title>Imprimir Carnet - ${carnetData.data?.nombre || 'Carnet'}</title>
              <style>
                @page {
                  size: 53.98mm 85.6mm;
                  margin: 0;
                }
                body { 
                  margin: 0; 
                  padding: 0; 
                  font-family: Arial, sans-serif;
                  width: 53.98mm;
                  height: 85.6mm;
                  overflow: hidden;
                }
                .carnet-print { 
                  width: 53.98mm; 
                  height: 85.6mm; 
                  position: relative;
                  background: #f8f9fa;
                  color: #000;
                }
                .carnet-front {
                  width: 100%;
                  height: 100%;
                  position: relative;
                }
                .carnet-back {
                  width: 100%;
                  height: 100%;
                  position: relative;
                  background: #f8f9fa;
                  padding: 5mm;
                  box-sizing: border-box;
                }
                .print-header {
                  background: #000;
                  color: white;
                  padding: 2mm;
                  text-align: center;
                  font-size: 8px;
                }
                .print-body {
                  padding: 3mm;
                  font-size: 6px;
                }
                .print-name {
                  font-size: 10px;
                  font-weight: bold;
                  text-align: center;
                  margin: 2mm 0;
                }
                .print-details {
                  font-size: 5px;
                  line-height: 1.2;
                }
                .print-company {
                  font-size: 8px;
                  font-weight: bold;
                  text-align: center;
                  margin: 2mm 0;
                }
                .print-info {
                  font-size: 5px;
                  text-align: center;
                  margin: 1mm 0;
                }
              </style>
            </head>
            <body>
              <div class="carnet-print">
                ${isEmpleado ? `
                  <div class="carnet-front">
                    <div class="print-header">
                      ${carnetData.sala?.nombre || 'Sala'}
                    </div>
                    <div class="print-body">
                      <div class="print-name">${carnetData.data?.nombre || 'Empleado'}</div>
                      <div class="print-details">
                        <div><strong>Cargo:</strong> ${carnetData.data?.Cargo?.nombre || 'Sin cargo'}</div>
                        <div><strong>Departamento:</strong> ${carnetData.data?.Cargo?.Area?.Departamento?.nombre || 'Sin departamento'}</div>
                        <div><strong>Área:</strong> ${carnetData.data?.Cargo?.Area?.nombre || 'Sin área'}</div>
                        <div><strong>ID:</strong> ${carnetData.data?.id || 'Sin ID'}</div>
                        <div><strong>Color:</strong> ${carnetData.color}</div>
                      </div>
                    </div>
                  </div>
                ` : `
                  <div class="carnet-back">
                    <div class="print-company">${carnetData.data?.nombre_comercial || carnetData.data?.nombre}</div>
                    <div class="print-info">RIF: ${carnetData.data?.rif || 'Sin RIF'}</div>
                    <div class="print-info">Tel: ${carnetData.data?.telefono || 'Sin teléfono'}</div>
                    <div class="print-info">Email: ${carnetData.data?.correo || 'Sin correo'}</div>
                    <div class="print-info">${carnetData.data?.ubicacion || 'Sin ubicación'}</div>
                    <div class="print-info">Color: ${carnetData.color}</div>
                  </div>
                `}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
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
      sala: empleado.Cargo?.Area?.Departamento?.Sala?.nombre || 'SIN_SALA'
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
      // Ruta: empleado.Cargo.Area.Departamento.Sala
      const sala = empleado?.Cargo?.Area?.Departamento?.Sala;
      
      return sala?.[field] || '';
    } catch (error) {
      
      return '';
    }
  }

  getCarnetId(carnet: any): string {
    if (carnet.type === 'empleado') {
      return `carnet-empleado-${carnet.data?.id || 'unknown'}-${carnet.color}`;
    } else if (carnet.type === 'sala') {
      return `carnet-sala-${carnet.sala?.id || 'unknown'}-${carnet.color}`;
    }
    return `carnet-unknown-${Date.now()}-${carnet.color}`;
  }

  async descargarCarnet(carnet: any) {
    try {
      // El contenedor principal es el div con class="carnet-card-modal" y el id dinámico
      const carnetId = this.getCarnetId(carnet);
      const carnetCardElement = document.getElementById(carnetId);
      
      if (!carnetCardElement) {
        
        return;
      }

      // Determinar qué contenedor interno usar según el lado del carnet
      let carnetContainer: HTMLElement | null = null;
      
      if (this.ladoCarnet === 'frente') {
        // Para el frente, usar el contenedor con id="carnet-front-container"
        carnetContainer = carnetCardElement.querySelector('#carnet-front-container') as HTMLElement;
      } else if (this.ladoCarnet === 'detras') {
        // Para el reverso, usar el contenedor con id="carnet-back-container"
        carnetContainer = carnetCardElement.querySelector('#carnet-back-container') as HTMLElement;
      }
      
      // Si no se encuentra el contenedor interno, usar el contenedor principal
      if (!carnetContainer) {
        carnetContainer = carnetCardElement;
      }

      // Capturar el carnet con html-to-image sin modificar estilos
      const dataUrl = await htmlToImage.toPng(carnetContainer, {
        quality: 1.0, // Máxima calidad
        backgroundColor: '#ffffff',
        pixelRatio: 20, // Ultra alta resolución (20x)
        cacheBust: true,
        filter: (node) => {
          // Solo incluir elementos que pertenecen al carnet
          return node === carnetContainer || carnetContainer?.contains(node) || false;
        }
      });

      // Crear enlace de descarga
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      // Para empleados usar cédula, para salas usar nombre de la sala
      const identifier = carnet.type === 'empleado' 
        ? (carnet.data?.cedula || carnet.data?.id || 'unknown')
        : (carnet.sala?.nombre || carnet.sala?.id || 'unknown');
      
      link.download = `carnet-${identifier}-${carnet.color}-${carnet.data?.id || carnet.sala?.id || 'unknown'}-${timestamp}.png`;
      link.href = dataUrl;
      
      // Simular click para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      
      
    } catch (error) {
      
    }
  }
}


