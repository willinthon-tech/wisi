import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="user-menu-container">
      <div class="menu-header">
        <h2>Menú de Acceso</h2>
        <p>Selecciona una página para acceder a sus módulos</p>
      </div>

      <div class="pages-grid" *ngIf="!loading && pages.length > 0">
        <div class="page-card" *ngFor="let page of pages" (click)="togglePage(page)">
          <div class="page-header">
            <div class="page-icon">{{ getPageIcon(page.icono) }}</div>
            <div class="page-info">
              <h3>{{ page.nombre }}</h3>
              <p>{{ page.descripcion }}</p>
            </div>
            <div class="page-toggle">
              <span class="toggle-icon" [class.expanded]="page.expanded">
                {{ page.expanded ? '▼' : '▶' }}
              </span>
            </div>
          </div>
          
          <div class="modules-list" *ngIf="page.expanded && page.Modules && page.Modules.length > 0">
            <div class="module-item" *ngFor="let module of page.Modules" (click)="navigateToModule(module, $event)">
              <div class="module-icon">{{ getModuleIcon(module.icono) }}</div>
              <div class="module-info">
                <h4>{{ module.nombre }}</h4>
                <p>{{ module.descripcion }}</p>
              </div>
              <div class="module-arrow">→</div>
            </div>
          </div>
          
          <div class="no-modules" *ngIf="page.expanded && (!page.Modules || page.Modules.length === 0)">
            <p>No tienes acceso a módulos en esta página</p>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && pages.length === 0">
        <div class="empty-icon">📄</div>
        <h3>No tienes acceso a páginas</h3>
        <p>Contacta al administrador para obtener permisos</p>
      </div>

      <div class="loading-state" *ngIf="loading">
        <div class="spinner"></div>
        <p>Cargando menú...</p>
      </div>
    </div>
  `,
  styles: [`
    .user-menu-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .menu-header {
      text-align: center;
      margin-bottom: 40px;
    }

    .menu-header h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 32px;
    }

    .menu-header p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .pages-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
      gap: 20px;
    }

    .page-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
      overflow: hidden;
      transition: all 0.3s;
      cursor: pointer;
    }

    .page-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .page-header {
      display: flex;
      align-items: center;
      padding: 25px;
      gap: 20px;
    }

    .page-icon {
      font-size: 48px;
      min-width: 60px;
      text-align: center;
    }

    .page-info {
      flex: 1;
    }

    .page-info h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 20px;
    }

    .page-info p {
      margin: 0;
      color: #666;
      font-size: 14px;
      line-height: 1.4;
    }

    .page-toggle {
      display: flex;
      align-items: center;
    }

    .toggle-icon {
      font-size: 18px;
      color: #666;
      transition: transform 0.3s;
    }

    .toggle-icon.expanded {
      transform: rotate(0deg);
    }

    .modules-list {
      border-top: 1px solid #e9ecef;
      background: #f8f9fa;
    }

    .module-item {
      display: flex;
      align-items: center;
      padding: 15px 25px;
      gap: 15px;
      border-bottom: 1px solid #e9ecef;
      transition: background-color 0.3s;
      cursor: pointer;
    }

    .module-item:last-child {
      border-bottom: none;
    }

    .module-item:hover {
      background: #e9ecef;
    }

    .module-icon {
      font-size: 24px;
      min-width: 30px;
      text-align: center;
    }

    .module-info {
      flex: 1;
    }

    .module-info h4 {
      margin: 0 0 4px 0;
      color: #333;
      font-size: 16px;
      font-weight: 600;
    }

    .module-info p {
      margin: 0;
      color: #666;
      font-size: 13px;
      line-height: 1.3;
    }

    .module-arrow {
      color: #007bff;
      font-size: 18px;
      font-weight: bold;
    }

    .no-modules {
      padding: 20px 25px;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .empty-icon {
      font-size: 64px;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
    }

    .empty-state p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .loading-state {
      text-align: center;
      padding: 60px 20px;
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

    /* Responsive */
    @media (max-width: 768px) {
      .pages-grid {
        grid-template-columns: 1fr;
      }
      
      .page-header {
        flex-direction: column;
        text-align: center;
        gap: 15px;
      }

      .page-toggle {
        order: -1;
      }

      .module-item {
        flex-direction: column;
        text-align: center;
        gap: 10px;
      }
    }
  `]
})
export class UserMenuComponent implements OnInit {
  pages: any[] = [];
  loading = true;

  constructor(
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUserMenu();
  }

  private loadUserMenu() {
    this.loading = true;
    
    this.userService.getUserMenu().subscribe({
      next: (pages) => {
        console.log('Menú del usuario cargado:', pages);
        // Agregar propiedad expanded a cada página
        this.pages = pages.map(page => ({
          ...page,
          expanded: false
        }));
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando menú del usuario:', error);
        alert('Error cargando menú: ' + (error.error?.message || error.message || 'Error desconocido'));
        this.loading = false;
      }
    });
  }

  togglePage(page: any) {
    page.expanded = !page.expanded;
  }

  navigateToModule(module: any, event: Event) {
    event.stopPropagation(); // Evitar que se active el toggle de la página
    
    // Navegar al módulo correspondiente
    if (module.ruta) {
      this.router.navigate([module.ruta]);
    } else {
      console.warn('Módulo sin ruta definida:', module);
      alert('Este módulo no tiene una ruta configurada');
    }
  }

  getPageIcon(icono: string): string {
    const iconMap: { [key: string]: string } = {
      'file': '📄',
      'settings': '⚙️',
      'activity': '📊',
      'chart': '📈',
      'users': '👥',
      'building': '🏢',
      'box': '📦',
      'calendar': '📅',
      'shopping': '🛒',
      'tools': '🔧'
    };
    return iconMap[icono] || '📄';
  }

  getModuleIcon(icono: string): string {
    const iconMap: { [key: string]: string } = {
      'users': '👥',
      'gamepad2': '🎮',
      'building': '🏢',
      'settings': '⚙️',
      'box': '📦',
      'chart': '📊',
      'file': '📄',
      'calendar': '📅',
      'shopping': '🛒',
      'tools': '🔧'
    };
    return iconMap[icono] || '📦';
  }
}

