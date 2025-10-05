import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-super-config',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="super-config-container">
      <div class="config-content">
        <div class="config-tabs">
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('salas')"
            (click)="navigateTo('salas')">
            Gestión de Salas
          </button>
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('paginas')"
            (click)="navigateTo('paginas')">
            Gestión de Páginas
          </button>
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('modulos')"
            (click)="navigateTo('modulos')">
            Gestión de Módulos
          </button>
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('permisos')"
            (click)="navigateTo('permisos')">
            Gestión de Permisos
          </button>
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('usuarios')"
            (click)="navigateTo('usuarios')">
            Gestión de Usuarios
          </button>
          <button 
            class="tab-btn" 
            [class.active]="isActiveRoute('dispositivos')"
            (click)="navigateTo('dispositivos')">
            Gestión de Dispositivos
          </button>
        </div>

        <div class="tab-content">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .super-config-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Arial', sans-serif;
    }


    .config-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px;
    }

    .config-tabs {
      display: flex;
      gap: 10px;
      margin-bottom: 30px;
      flex-wrap: wrap;
    }

    .tab-btn {
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 2px solid transparent;
      padding: 15px 25px;
      border-radius: 10px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      backdrop-filter: blur(10px);
    }

    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .tab-btn.active {
      background: white;
      color: #333;
      border-color: #4CAF50;
    }

    .tab-content {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      height: calc(100vh - 190px);
      max-height: 660px;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Scroll invisible para el contenido de tabs */
    .tab-content::-webkit-scrollbar {
      width: 0px;
      background: transparent;
    }

    .tab-content::-moz-scrollbar {
      width: 0px;
      background: transparent;
    }

    .tab-content {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .tab-panel h2 {
      color: #333;
      margin-bottom: 30px;
      font-size: 28px;
    }

    .form-section {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 25px;
      margin-bottom: 30px;
    }

    .form-section h3 {
      color: #333;
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: bold;
      color: #333;
    }

    .form-input, .form-textarea, .form-select {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 16px;
      transition: border-color 0.3s;
    }

    .form-input:focus, .form-textarea:focus, .form-select:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 12px 25px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.3s;
    }

    .btn-primary:hover {
      background: #45a049;
    }

    .list-section h3 {
      color: #333;
      margin-bottom: 20px;
    }

    .item-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .list-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
      padding: 20px;
      border-radius: 10px;
      border: 1px solid #e9ecef;
    }

    .item-info h4 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .item-info p {
      margin: 0;
      color: #666;
    }

    .item-actions {
      display: flex;
      gap: 10px;
    }

    .btn-edit, .btn-delete {
      padding: 8px 15px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
    }

    .btn-edit {
      background: #ffc107;
      color: #333;
    }

    .btn-edit:hover {
      background: #e0a800;
    }

    .btn-delete {
      background: #dc3545;
      color: white;
    }

    .btn-delete:hover {
      background: #c82333;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }

    .module-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      border: 1px solid #e9ecef;
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .module-icon {
      font-size: 32px;
    }

    .module-info h3 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .module-info p {
      margin: 0;
      color: #666;
    }

    .status-active {
      background: #d4edda;
      color: #155724;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .status-inactive {
      background: #f8d7da;
      color: #721c24;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
    }

    .permissions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .permission-card {
      background: #f8f9fa;
      border-radius: 10px;
      padding: 20px;
      border: 1px solid #e9ecef;
    }

    .permission-card h3 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .permission-card p {
      margin: 0 0 15px 0;
      color: #666;
    }

    .permission-actions {
      display: flex;
      gap: 10px;
    }

    /* Estilos para selección de salas y módulos */
    .salas-selection, .modules-selection {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .sala-option, .module-option {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.3s;
    }

    .sala-option:hover, .module-option:hover {
      border-color: #4CAF50;
      background: #f0f8f0;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-weight: 500;
      color: #333;
    }

    .checkbox-label input[type="checkbox"] {
      margin-right: 10px;
      transform: scale(1.2);
    }

    /* Estilos para detalles de usuario */
    .user-details {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e9ecef;
    }

    .salas-assigned {
      display: flex;
      flex-wrap: wrap;
      gap: 5px;
      align-items: center;
    }

    .sala-tag {
      background: #4CAF50;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: bold;
    }

    .no-assignments {
      color: #dc3545;
      font-style: italic;
      font-size: 14px;
    }

    /* Estilos para modal */
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
      border-radius: 15px;
      width: 90%;
      max-width: 500px;
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

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.3s;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    .form-section h4 {
      color: #333;
      margin: 20px 0 10px 0;
      font-size: 16px;
    }
  `]
})
export class SuperConfigComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Verificar que el usuario tenga permisos de creador
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.nivel !== 'TODO') {
      this.router.navigate(['/dashboard']);
    }
  }


  navigateTo(section: string) {
    this.router.navigate(['/super-config', section]);
  }

  isActiveRoute(route: string): boolean {
    return this.router.url.includes(`/super-config/${route}`);
  }
}
