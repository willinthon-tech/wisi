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
              <option value="marron">Marrón</option>
              <option value="azul">Azul</option>
              <option value="verde">Verde</option>
              <option value="naranja">Naranja</option>
              <option value="morado">Morado</option>
              <option value="rosado">Rosado</option>
              <option value="gris">Gris</option>
              <option value="amarillo">Amarillo</option>
              <option value="vinotinto">Vinotinto</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Grid de carnets -->
      <div class="carnets-grid" *ngIf="!loading">
        <div class="carnet-wrapper" *ngFor="let carnet of filteredEmpleados">
          <div class="carnet-card" (click)="descargarCarnet(carnet)">
          
          <!-- Frente del carnet (solo para empleados) -->
          <div [id]="getCarnetId(carnet)" *ngIf="carnet.type === 'empleado'">
            <div [style]="getCarnetFrontStyles(carnet)">
              <div *ngIf="carnet.sala?.logo">
                <img [src]="getSalaLogo(carnet.sala.logo)" [alt]="carnet.sala.nombre" [style]="getLogoStyles()"> 
              </div>
              <div *ngIf="!carnet.sala?.logo" [style]="getLogoTextStyles()">
                {{carnet.sala.nombre}}
              </div>
                  
                <div [style]="getHeaderStyles()">
                </div>
                
                <div [style]="getBodyStyles()">
                  <div [style]="getBlackExtensionStyles()"></div>
                  
                  <div [style]="getPhotoContainerStyles()">
                    <div [style]="getHexagonalPhotoStyles(carnet.color)">
                      <img *ngIf="carnet.data?.foto" [src]="getEmployeePhoto(carnet.data.foto)" [alt]="carnet.data.nombre" [style]="getPhotoImageStyles()">
                      <div *ngIf="!carnet.data?.foto" [style]="getPhotoPlaceholderStyles()">👤</div>
                    </div>
                  </div>
                  
                  <div [style]="getEmployeeNameStyles()">
                    {{ (carnet.data?.nombre || 'SIN NOMBRE').toUpperCase() }}
                  </div>
                  
                  <div [style]="getBadgeStyles(carnet.color)">
                    {{ (carnet.data?.Cargo?.nombre || 'SIN CARGO').toUpperCase() }}
                  </div>
                  
                  <div [style]="getEmployeeDetailsStyles()">
                    <div [style]="getDetailLineStyles()">
                      <span [style]="getDetailLabelStyles()">Cedula :</span>
                      <span [style]="getDetailValueStyles()">{{ carnet.data?.cedula || 'SIN CÉDULA' }}</span>
                    </div>
                    <div [style]="getDetailLineStyles()">
                      <span [style]="getDetailLabelStyles()">Departamento :</span>
                      <span [style]="getDetailValueStyles()">{{ carnet.data?.Cargo?.Departamento?.nombre || 'SIN DEPARTAMENTO' }}</span>
                    </div>
                    <div [style]="getDetailLineStyles()">
                      <span [style]="getDetailLabelStyles()">Área :</span>
                      <span [style]="getDetailValueStyles()">{{ carnet.data?.Cargo?.Departamento?.Area?.nombre || 'SIN ÁREA' }}</span>
                    </div>
                    <div [style]="getDetailLineStyles()">
                      <span [style]="getDetailLabelStyles()">Ingreso :</span>
                      <span [style]="getDetailValueStyles()">{{ carnet.data?.fecha_ingreso || 'SIN FECHA' }}</span>
                    </div>
                  </div>
                  
                  <div [style]="getBarcodeSectionStyles()">
                    <div [style]="getBarcodeStyles(carnet.color)">
                      <span *ngFor="let bar of generateBarcodeBars(carnet.data)" 
                            [style]="getBarcodeBarStyles(bar, carnet.color)">
                      </span>
                    </div>
                  </div>
                </div>
            </div>
          </div>

          <!-- Reverso del carnet (solo para salas - cara trasera) -->
          <div [id]="getCarnetId(carnet)" *ngIf="carnet.type === 'sala'">
            <div [style]="getCarnetBackStyles(carnet)">
              <div [style]="getBackContentStyles()">
                <p [style]="getIntroTextStyles()">El portador del presente Carnet presta sus servicios Profesionales a:</p>
                
                <div [style]="getCompanyInfoStyles()">
                  <h3 [style]="getCompanyNameStyles()">{{ carnet.data?.nombre_comercial || carnet.sala?.nombre_comercial || 'SIN NOMBRE' }}</h3>
                  <p [style]="getCompanyRifStyles()">R.I.F.: {{ carnet.data?.rif || carnet.sala?.rif || 'SIN RIF' }}</p>
                </div>
                
                <p [style]="getInstructionTextStyles()">
                  Se le agradece a las autoridades Civiles, Militares y otros Organismos Públicos, 
                  brindarle todo su apoyo y colaboración. En caso de emergencia o pérdida, favor avisar al teléfono:
                </p>
                
                <div [style]="getPhoneSectionStyles()">
                  <p [style]="getPhoneNumberStyles()">{{ carnet.data?.telefono || carnet.sala?.telefono || 'SIN TELÉFONO' }}</p>
                </div>
                
                <p [style]="getAddressTextStyles()">{{ carnet.data?.ubicacion || carnet.sala?.ubicacion || 'SIN UBICACIÓN' }}</p>
                
                <div [style]="getEmailSectionStyles(carnet.color)">
                  <div [style]="getEmailLabelStyles()">Correo:</div>
                  <div [style]="getEmailAddressStyles()">{{ carnet.data?.correo || carnet.sala?.correo || 'SIN CORREO' }}</div>
                </div>
              </div>
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
      max-width: 90vw;
      max-height: 90vh;
      width: 90vw;
      height: 90vh;
      background: #f8f9fa;
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
      padding: 0 !important;
      margin: 0 !important;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100%;
    }

    .carnet-modal-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      width: 100%;
    }

    .carnet-card-modal {
      cursor: default !important;
      /* Usar exactamente los mismos estilos que .carnet-card pero más grande */
      width: 53.98mm;
      height: 85.6mm;
      margin: 20px;
      transform: scale(3);
      transform-origin: center;
    }

    .carnet-card-modal:hover {
      transform: scale(3) !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
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
  filteredEmpleados: any[] = [];
  carnetsData: any[] = []; // Combinación de empleados y salas
  loading = true;
  ladoFilter: string = '';
  colorFilter: string = '';

  // Variables para modal de carnet
  showCarnetModal = false;
  carnetSeleccionado: any = null;
  currentCarnetIndex = -1;

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
      
      // Agregar carnets de empleados (solo activos y de salas asignadas al usuario)
      this.empleados.forEach(empleado => {
        // Verificar que el empleado esté activo
        if (empleado.activo !== 1) {
          return; // Saltar empleados inactivos
        }
        
        // Buscar la sala completa con todos sus datos (incluyendo logo)
        const empleadoSala = empleado?.Cargo?.Departamento?.Area?.Sala;
        const salaCompleta = this.salas.find(sala => sala.id === empleadoSala?.id);
        
        // Solo agregar si la sala está asignada al usuario
        if (!salaCompleta) {
          return; // Saltar empleados de salas no asignadas al usuario
        }
        
        // Crear un carnet por cada color para cada empleado
        const colors = ['marron', 'azul', 'verde', 'naranja', 'morado', 'rosado', 'gris', 'amarillo', 'vinotinto'];
        colors.forEach(color => {
          const carnetData = {
            type: 'empleado',
            data: empleado,
            sala: salaCompleta,
            color: color
          };
          
          this.carnetsData.push(carnetData);
        });
      });
      
      // Agregar caras traseras para CADA sala asignada al usuario
      this.salas.forEach(sala => {
        // Crear un carnet por cada color para cada sala
        const colors = ['marron', 'azul', 'verde', 'naranja', 'morado', 'rosado', 'gris', 'amarillo', 'vinotinto'];
        colors.forEach(color => {
          this.carnetsData.push({
            type: 'sala',
            data: sala, // Usar la información de la sala
            sala: sala,
            color: color
          });
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
  abrirCarnetModal(carnet: any) {
    this.carnetSeleccionado = carnet;
    this.currentCarnetIndex = this.filteredEmpleados.findIndex(c => c === carnet);
    this.showCarnetModal = true;
  }

  cerrarCarnetModal() {
    this.showCarnetModal = false;
    this.carnetSeleccionado = null;
    this.currentCarnetIndex = -1;
  }

  anteriorCarnet() {
    if (this.currentCarnetIndex > 0) {
      this.currentCarnetIndex--;
      this.carnetSeleccionado = this.filteredEmpleados[this.currentCarnetIndex];
    }
  }

  siguienteCarnet() {
    if (this.currentCarnetIndex < this.filteredEmpleados.length - 1) {
      this.currentCarnetIndex++;
      this.carnetSeleccionado = this.filteredEmpleados[this.currentCarnetIndex];
    }
  }

  get puedeAnteriorCarnet(): boolean {
    return this.currentCarnetIndex > 0;
  }

  get puedeSiguienteCarnet(): boolean {
    return this.currentCarnetIndex < this.filteredEmpleados.length - 1;
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
    return `background: ${colorHex}; color: white; padding: 1.5mm 12mm; clip-path: polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%); margin: 0 auto; font-size: 1.8mm; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap; display: inline-block;`;
  }

  getEmployeeDetailsStyles(): string {
    return 'text-align: left; margin-top: 4mm; margin-bottom: 12px; max-width: 40mm; margin-left: auto; margin-right: auto;';
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
    return colorMap[color] || '#722f37';
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
        console.error('Error al capturar el carnet:', error);
      });
    }).catch((error: any) => {
      console.error('Error al cargar html2canvas:', error);
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
    ctx.fillText(`Departamento: ${carnet.data?.Cargo?.Departamento?.nombre || 'Sin departamento'}`, 20, detailsY + 25);
    ctx.fillText(`Área: ${carnet.data?.Area?.nombre || 'Sin área'}`, 20, detailsY + 50);
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
                        <div><strong>Departamento:</strong> ${carnetData.data?.Cargo?.Departamento?.nombre || 'Sin departamento'}</div>
                        <div><strong>Área:</strong> ${carnetData.data?.Area?.nombre || 'Sin área'}</div>
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

  getCarnetId(carnet: any): string {
    if (carnet.type === 'empleado') {
      return `carnet-empleado-${carnet.data?.id || 'unknown'}`;
    } else if (carnet.type === 'sala') {
      return `carnet-sala-${carnet.sala?.id || 'unknown'}`;
    }
    return `carnet-unknown-${Date.now()}`;
  }

  async descargarCarnet(carnet: any) {
    try {
      const carnetId = this.getCarnetId(carnet);
      const element = document.getElementById(carnetId);
      
      if (!element) {
        console.error('No se encontró el elemento del carnet');
        return;
      }

      // Buscar el contenedor padre .carnet-card que tiene overflow: hidden
      const carnetCard = element.closest('.carnet-card');
      if (!carnetCard) {
        console.error('No se encontró el contenedor .carnet-card');
        return;
      }

      // Usar EXACTAMENTE las mismas dimensiones del carnet principal
      const carnetWidthMM = 53.98;  // Ancho del carnet principal
      const carnetHeightMM = 85.6; // Alto del carnet principal
      const dpi = 300;
      const mmToPixels = dpi / 25.4; // Conversión mm a píxeles
      
      const widthPixels = Math.round(carnetWidthMM * mmToPixels);
      const heightPixels = Math.round(carnetHeightMM * mmToPixels);

      console.log(`📏 Dimensiones EXACTAS del carnet: ${widthPixels}x${heightPixels}px (${carnetWidthMM}mm x ${carnetHeightMM}mm @ ${dpi}DPI)`);

      // Capturar el contenedor .carnet-card completo (con overflow: hidden)
      const dataUrl = await htmlToImage.toPng(carnetCard as HTMLElement, {
        width: widthPixels,
        height: heightPixels,
        quality: 1.0,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Resolución estándar
        cacheBust: true,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node) => {
          // Incluir todos los elementos del carnet
          return true;
        }
      });

      // Crear enlace de descarga
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `carnet-${carnet.type}-${carnet.color}-${carnet.data?.id || carnet.sala?.id || 'unknown'}-${timestamp}.png`;
      link.href = dataUrl;
      
      // Simular click para descargar
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('✅ Carnet descargado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al descargar carnet:', error);
    }
  }
}
