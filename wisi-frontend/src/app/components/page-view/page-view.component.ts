import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-page-view',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-container">
      <div class="page-content">
        <div class="modules-grid" *ngIf="modules.length > 0">
        <div 
          class="module-card" 
          *ngFor="let module of modules" 
          (click)="navigateToModule(module)"
          [class.disabled]="!hasAccessToModule(module)">
          <div class="module-info">
            <h3 class="module-title">{{ module.nombre }}</h3>
          </div>
          <div class="module-status" *ngIf="!hasAccessToModule(module)">
            <span class="no-access">Sin acceso</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      height: calc(100vh - 80px);
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Arial', sans-serif;
      padding: 30px 20px;
      overflow-x: hidden;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    @media (max-width: 767px) {
      .page-container {
        padding: 20px 15px;
      }
    }

    .page-content {
      max-width: 1400px;
      width: 100%;
      box-sizing: border-box;
    }

    .page-header {
      text-align: center;
      margin-bottom: 30px;
      color: white;
    }

    .page-title {
      font-size: 32px;
      font-weight: bold;
      margin: 0 0 10px 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .page-description {
      font-size: 20px;
      margin: 0;
      opacity: 0.9;
    }

    .modules-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 25px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 1200px) {
      .modules-grid {
        gap: 20px;
      }
    }

    @media (max-width: 991px) {
      .modules-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
    }

    @media (max-width: 767px) {
      .modules-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }
    }

    .module-card {
      background: white;
      border-radius: 15px;
      padding: 35px 25px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 160px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (min-width: 1201px) {
      .module-card {
        padding: 40px 30px;
        min-height: 170px;
      }
    }

    @media (max-width: 991px) {
      .module-card {
        padding: 30px 20px;
        min-height: 150px;
      }
    }

    @media (max-width: 767px) {
      .module-card {
        padding: 25px 20px;
        min-height: 140px;
      }
    }

    .module-card:hover:not(.disabled) {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
    }

    .module-card.disabled {
      cursor: not-allowed;
      background: #f5f5f5;
      opacity: 1 !important;
    }

    .module-info {
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex: 1;
    }

    .module-title {
      font-size: 20px;
      font-weight: bold;
      color: #333;
      margin: 0;
      text-align: center;
      line-height: 1.1;
    }

    .module-description {
      color: #666;
      font-size: 16px;
      margin: 0;
      line-height: 1.5;
    }

    .module-status {
      position: absolute;
      top: 15px;
      right: 15px;
    }

    .no-access {
      background: #ff4444;
      color: white;
      padding: 6px 12px;
      border-radius: 15px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
    }

  `]
})
export class PageViewComponent implements OnInit {
  page: any = null;
  modules: any[] = [];
  currentUser: User | null = null;
  userModules: any[] = []; // Módulos asignados al usuario
  pageId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.pageId = +params['id'];
      this.loadPageData();
    });

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserModules();
      }
    });
  }

  private loadPageData() {
    // Cargar datos de la página
    this.userService.getPages().subscribe({
      next: (pages) => {
        this.page = pages.find(p => p.id === this.pageId);
        if (this.page) {
          this.loadPageModules();
        }
      },
      error: (error) => {
      }
    });
  }

  private loadPageModules() {
    // Cargar módulos de la página
    this.userService.getModules().subscribe({
      next: (modules) => {
        this.modules = modules.filter(module => 
          module.page_id === this.pageId
        );
      },
      error: (error) => {
      }
    });
  }

  private loadUserModules() {
    if (!this.currentUser) return;
    
    // El creador tiene acceso a todo
    if (this.currentUser.nivel === 'TODO') {
      this.userModules = []; // No necesita cargar módulos específicos
      return;
    }
    
    // Cargar módulos asignados al usuario
    this.userService.getUserModules().subscribe({
      next: (modules) => {
        this.userModules = modules;
      },
      error: (error) => {
        this.userModules = [];
      }
    });
  }

  hasAccessToModule(module: any): boolean {
    if (!this.currentUser) return false;
    
    // El creador tiene acceso a todo
    if (this.currentUser.nivel === 'TODO') {
      return true;
    }
    
    // Verificar si el usuario tiene acceso a este módulo específico
    const hasAccess = this.userModules.some(userModule => {
      const match = userModule.id === module.id;
      return match;
    });
    
    
    return hasAccess;
  }

  getModuleIcon(icono: string): string {
    const iconMap: { [key: string]: string } = {
      'users': 'fas fa-users',
      'gamepad2': 'fas fa-gamepad',
      'building': 'fas fa-building',
      'settings': 'fas fa-cog'
    };
    return iconMap[icono] || 'fas fa-cube';
  }

  navigateToModule(module: any) {
    
    if (this.hasAccessToModule(module)) {
      this.router.navigate([module.ruta]);
    } else {
    }
  }
}
