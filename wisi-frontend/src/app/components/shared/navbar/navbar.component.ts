import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="navbar">
      <div class="navbar-content">
        <div class="navbar-left">
          <h1 class="system-title">Sistema WISI</h1>
          <div class="salas-assigned" *ngIf="salas.length > 0">
            <span class="salas-label">Salas asignadas:</span>
            <span class="salas-names">{{ getSalasNames() }}</span>
          </div>
        </div>
        <div class="navbar-right">
          <button 
            class="action-btn" 
            [class.logout-btn]="isDashboard"
            [class.back-btn]="!isDashboard"
            (click)="handleButtonClick()">
            {{ isDashboard ? 'Cerrar Sesión' : 'Volver' }}
          </button>
        </div>
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      background: #2c3e50;
      color: white;
      padding: 15px 0;
      position: sticky;
      top: 0;
      z-index: 1000;
      width: 100%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .navbar-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .navbar-left {
      display: flex;
      flex-direction: column;
      gap: 5px;
      flex: 1;
    }

    .system-title {
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      color: #ffd700;
      line-height: 1;
    }

    .salas-assigned {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .salas-label {
      color: #ff6b6b;
      font-weight: bold;
      font-size: 12px;
    }

    .salas-names {
      color: #ff6b6b;
      font-size: 12px;
    }

    .navbar-right {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .action-btn {
      border: none;
      padding: 12px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      min-width: 120px;
    }

    .logout-btn {
      background: #dc3545;
      color: white;
    }

    .logout-btn:hover {
      background: #c82333;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .back-btn {
      background: #6c757d;
      color: white;
    }

    .back-btn:hover {
      background: #5a6268;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }
  `]
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  salas: any[] = [];
  isDashboard: boolean = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit() {
    // Suscribirse a cambios de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.isDashboard = event.url === '/dashboard';
      });

    // Verificar ruta actual
    this.isDashboard = this.router.url === '/dashboard';

    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadUserData();
      }
    });
  }

  private loadUserData() {
    this.loadSalas();
  }

  loadSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.salas = salas;
      },
      error: (error: any) => {
        console.error('Error cargando salas del usuario para navbar:', error);
      }
    });
  }

  getSalasNames(): string {
    return this.salas.map(sala => sala.nombre).join(', ');
  }

  handleButtonClick() {
    if (this.isDashboard) {
      this.logout();
    } else {
      this.goBack();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  goBack() {
    window.history.back();
  }
}
