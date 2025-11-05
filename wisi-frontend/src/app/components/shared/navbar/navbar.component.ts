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
          <h1 class="system-title">Wisi Space</h1>
          <div class="user-info-section" *ngIf="currentUser">
            <span class="user-label">Usuario logueado:</span>
            <span class="user-name">{{ currentUser.nombre_apellido }}</span>
            <span class="separator">,</span>
            <span class="salas-label">Salas asignadas:</span>
            <span class="salas-names" *ngIf="salas.length === 1">{{ salas[0].nombre }}</span>
            <span class="salas-multiple" *ngIf="salas.length > 1">
              <span class="varios-text">Varios</span>
              <span class="ver-badge" (click)="showSalasModal = true">Ver</span>
            </span>
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

    <!-- Modal de Salas -->
    <div class="modal-overlay" *ngIf="showSalasModal" (click)="showSalasModal = false">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Salas Asignadas</h3>
          <button class="close-btn" (click)="showSalasModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="salas-list">
            <div class="sala-item" *ngFor="let sala of salas">
              {{ sala.nombre }}
            </div>
          </div>
        </div>
      </div>
    </div>
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

    .user-info-section {
      display: flex;
      align-items: center;
      gap: 5px;
      flex-wrap: wrap;
    }

    .user-label {
      color: white;
      font-weight: normal;
      font-size: 12px;
    }

    .user-name {
      color: white;
      font-weight: 500;
      font-size: 12px;
    }

    .separator {
      color: white;
      font-size: 12px;
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

    .salas-multiple {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .varios-text {
      color: #ff6b6b;
      font-size: 12px;
    }

    .ver-badge {
      background: #ff6b6b;
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
    }

    .ver-badge:hover {
      background: #ff5252;
      transform: scale(1.05);
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

    /* Modal de Salas */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 2000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header h3 {
      margin: 0;
      color: #333;
      font-size: 20px;
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
      border-radius: 4px;
      transition: all 0.3s;
    }

    .close-btn:hover {
      background: #f0f0f0;
      color: #333;
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
    }

    .salas-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .sala-item {
      padding: 12px 15px;
      background: #f8f9fa;
      border-radius: 6px;
      color: #333;
      font-size: 14px;
      border-left: 3px solid #ff6b6b;
    }
  `]
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  salas: any[] = [];
  isDashboard: boolean = false;
  showSalasModal: boolean = false;

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
        const url = (event.urlAfterRedirects || event.url) || '';
        this.isDashboard = url.split('?')[0].split('#')[0].startsWith('/dashboard');
      });

    // Verificar ruta actual
    this.isDashboard = (this.router.url || '').split('?')[0].split('#')[0].startsWith('/dashboard');

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
      }
    });
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
