import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard-simple',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-content">
          <div class="header-left">
            <h1 class="system-title">Sistema WISI</h1>
            <div class="salas-assigned">
              <span class="salas-label">Salas asignadas:</span>
              <span class="salas-names">Monagas Royal, Roraima</span>
            </div>
          </div>
          <div class="user-info">
            <span class="user-name">{{ currentUser?.nombre_apellido }}</span>
            <button class="logout-btn" (click)="logout()">Cerrar Sesión</button>
          </div>
        </div>
      </header>

      <main class="dashboard-main">
        <div class="main-content">
          <!-- Cartas en la esquina izquierda -->
          <div class="cards-section">
            <div class="card">
              <div class="card-content">
                <span class="card-value">A</span>
                <span class="card-suit">♠</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">K</span>
                <span class="card-suit">♥</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">Q</span>
                <span class="card-suit">♦</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">J</span>
                <span class="card-suit">♠</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">10</span>
                <span class="card-suit">♣</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">9</span>
                <span class="card-suit">♥</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">8</span>
                <span class="card-suit">♦</span>
              </div>
            </div>
            <div class="card">
              <div class="card-content">
                <span class="card-value">7</span>
                <span class="card-suit">♣</span>
              </div>
            </div>
          </div>

          <!-- Título centrado -->
          <div class="center-title">
            <h1 class="main-title">Sistema WISI</h1>
          </div>

          <!-- Botones BET/ANTE en la derecha -->
          <div class="controls-section">
            <div class="control-box">
              <h3 class="control-title">WISI</h3>
              <div class="coins">
                <span class="coin">🪙</span>
                <span class="coin">🪙</span>
                <span class="coin">🪙</span>
              </div>
              <p class="control-description">Sistema de control y gestión</p>
            </div>
            <div class="control-buttons">
              <button class="bet-btn">
                <span class="btn-text">BET</span>
                <div class="btn-coins">
                  <span class="coin">🪙</span>
                  <span class="coin">🪙</span>
                  <span class="coin">🪙</span>
                </div>
              </button>
              <button class="ante-btn">
                <span class="btn-text">ANTE</span>
                <div class="btn-coins">
                  <span class="coin">🪙</span>
                  <span class="coin">🪙</span>
                  <span class="coin">🪙</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      font-family: 'Arial', sans-serif;
    }

    .dashboard-header {
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 0;
      backdrop-filter: blur(10px);
    }

    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .system-title {
      font-size: 32px;
      font-weight: bold;
      margin: 0;
      color: #ffd700;
    }

    .salas-assigned {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .salas-label {
      color: #ff6b6b;
      font-weight: bold;
      font-size: 14px;
    }

    .salas-names {
      color: #ff6b6b;
      font-size: 14px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-name {
      font-size: 18px;
      font-weight: 500;
      color: white;
    }

    .logout-btn {
      background: #dc3545;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: all 0.3s;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .logout-btn:hover {
      background: #c82333;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .dashboard-main {
      min-height: calc(100vh - 80px);
      padding: 20px;
    }

    .main-content {
      display: grid;
      grid-template-columns: 1fr 2fr 1fr;
      gap: 40px;
      align-items: center;
      height: 100%;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Sección de cartas (izquierda) */
    .cards-section {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .card {
      background: white;
      border: 2px solid #333;
      border-radius: 12px;
      width: 120px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .card-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }

    .card-suit {
      font-size: 20px;
      color: #333;
    }

    /* Título centrado */
    .center-title {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .main-title {
      font-size: 48px;
      font-weight: bold;
      color: #ff4444;
      text-align: center;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    /* Sección de controles (derecha) */
    .controls-section {
      display: flex;
      flex-direction: column;
      gap: 30px;
      align-items: center;
    }

    .control-box {
      background: white;
      border: 2px solid #333;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      min-width: 200px;
    }

    .control-title {
      font-size: 32px;
      font-weight: bold;
      color: #333;
      margin: 0 0 15px 0;
    }

    .coins {
      display: flex;
      justify-content: center;
      gap: 5px;
      margin-bottom: 15px;
    }

    .coin {
      font-size: 20px;
    }

    .control-description {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .control-buttons {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .bet-btn, .ante-btn {
      background: #ffd700;
      border: 2px solid #333;
      border-radius: 8px;
      padding: 20px 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
      min-width: 150px;
    }

    .bet-btn:hover, .ante-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    .btn-text {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }

    .btn-coins {
      display: flex;
      justify-content: center;
      gap: 5px;
    }

    .btn-coins .coin {
      font-size: 16px;
    }
  `]
})
export class DashboardSimpleComponent implements OnInit {
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Dashboard simple component initialized');
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

