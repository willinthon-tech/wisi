import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-content">
        <div class="pages-grid">
        <!-- Páginas del sistema -->
        <div 
          class="page-card" 
          *ngFor="let page of pages" 
          (click)="navigateToPage(page.id)"
          [class.disabled]="!hasAccessToPage(page)">
          <div class="page-info">
            <h3 class="page-title">{{ page.nombre }}</h3>
          </div>
          <div class="page-status" *ngIf="!hasAccessToPage(page)">
            <span class="no-access">Sin acceso</span>
          </div>
        </div>

        <!-- Super Módulo de Configuración (solo para creador) -->
        <div 
          class="page-card super-module super-usuario-card" 
          (click)="navigateToSuperConfig()"
          [class.disabled]="!canAccessSuperConfig()">
          <div class="page-info">
            <h3 class="page-title">SUPER USUARIO</h3>
          </div>
          <div class="page-status" *ngIf="!canAccessSuperConfig()">
            <span class="no-access">Sin acceso</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
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
      .dashboard-container {
        padding: 20px 15px;
      }
    }

    .dashboard-content {
      max-width: 1400px;
      width: 100%;
      box-sizing: border-box;
    }



    .pages-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 25px;
      width: 100%;
      box-sizing: border-box;
    }

    @media (max-width: 1200px) {
      .pages-grid {
        gap: 20px;
      }
    }

    @media (max-width: 991px) {
      .pages-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
    }

    @media (max-width: 767px) {
      .pages-grid {
        grid-template-columns: 1fr;
        gap: 15px;
      }
    }

    .page-card {
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
      .page-card {
        padding: 40px 30px;
        min-height: 170px;
      }
    }

    @media (max-width: 991px) {
      .page-card {
        padding: 30px 20px;
        min-height: 150px;
      }
    }

    @media (max-width: 767px) {
      .page-card {
        padding: 25px 20px;
        min-height: 140px;
      }
    }

    .page-card:hover:not(.disabled) {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
    }

    .page-card.disabled {
      cursor: not-allowed;
      background: #f5f5f5;
    }

    .super-module {
      background: white;
      color: #333;
    }

    .super-module .page-title {
      color: #333;
      text-align: center;
      font-size: 20px;
      line-height: 1.1;
    }

    .super-module .page-modules {
      color: #666;
    }

    .super-usuario-card {
      background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%) !important;
      border: 2px solid #f8bbd9;
      box-shadow: 0 8px 25px rgba(244, 67, 54, 0.2);
    }

    .super-usuario-card:hover:not(.disabled) {
      transform: translateY(-5px);
      box-shadow: 0 15px 40px rgba(244, 67, 54, 0.3);
      border-color: #e91e63;
    }

    .super-usuario-card .page-title {
      color: #d32f2f;
      font-weight: bold;
    }



    .page-info {
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      flex: 1;
    }

    .page-title {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin: 0;
      text-align: center;
      line-height: 1.1;
    }

    @media (max-width: 991px) {
      .page-title {
        font-size: 22px;
      }
    }

    @media (max-width: 767px) {
      .page-title {
        font-size: 20px;
      }
      .page-card {
        padding: 35px 25px;
        min-height: 160px;
      }
    }

    .page-modules {
      color: #666;
      font-size: 16px;
      margin: 0;
      line-height: 1.5;
    }

    .page-status {
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
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  pages: any[] = [];
  userPages: any[] = []; // Páginas asignadas al usuario

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserData();
      }
    });
  }

  private loadUserData() {
    this.loadPages();
    this.loadUserPages();
  }

  private loadPages() {
    this.userService.getPages().subscribe({
      next: (pages) => {
        
        this.pages = pages;
      },
      error: (error) => {
      }
    });
  }

  private loadUserPages() {
    if (this.currentUser) {
      
      // Cargar las páginas asignadas al usuario desde el backend
      this.userService.getUserMenu().subscribe({
        next: (menuData) => {
          
          if (Array.isArray(menuData)) {
            // Extraer las páginas del menú del usuario
            this.userPages = menuData.map((item: any) => ({
              id: item.id,
              nombre: item.nombre
            }));
          } else {
            this.userPages = [];
          }
          
        },
        error: (error) => {
          // Si hay error, no dar acceso a ninguna página
          this.userPages = [];
        }
      });
    }
  }

  hasAccessToPage(page: any): boolean {
    if (!this.currentUser) {
      return false;
    }
    
    // El creador tiene acceso a todo
    if (this.currentUser.nivel === 'TODO') {
      return true;
    }
    
    // Verificar si el usuario tiene acceso a esta página
    const hasAccess = this.userPages.some(userPage => {
      const match = userPage.id === page.id;
      return match;
    });
    
    
    return hasAccess;
  }

  canAccessSuperConfig(): boolean {
    if (!this.currentUser) return false;
    
    // Solo el creador puede acceder al super módulo de configuración
    return this.currentUser.nivel === 'TODO';
  }


  navigateToPage(pageId: number) {
    if (this.hasAccessToPage({ id: pageId })) {
      // Navegar a la página específica
      this.router.navigate(['/page', pageId]);
    }
  }

  navigateToSuperConfig() {
    if (this.canAccessSuperConfig()) {
      this.router.navigate(['/super-config']);
    }
  }


  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}