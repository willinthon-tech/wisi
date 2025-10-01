import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="casino-background">
        <div class="casino-table">
          <div class="top-left-title">
            <h1 class="main-title">Sistema WISI</h1>
          </div>
          
          <div class="bottom-right-cards">
            <div class="card" *ngFor="let card of cards">{{ card }}</div>
          </div>
        </div>
      </div>
      
      <div class="login-panel">
        <div class="login-form">
          <h2 class="login-title">Ingrese sus Credenciales</h2>
          
          <form (ngSubmit)="onSubmit()" #loginForm="ngForm">
            <div class="form-group">
              <input 
                type="text" 
                [(ngModel)]="credentials.usuario" 
                name="usuario"
                placeholder="Usuario"
                class="form-input"
                required>
            </div>
            
            <div class="form-group">
              <input 
                type="password" 
                [(ngModel)]="credentials.password" 
                name="password"
                placeholder="Contraseña"
                class="form-input"
                required>
            </div>
            
            <button 
              type="submit" 
              class="login-button"
              [disabled]="loading">
              {{ loading ? 'Ingresando...' : 'Ingresar' }}
            </button>
          </form>
          
          <div *ngIf="errorMessage" class="error-message">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      height: 100vh;
      font-family: 'Arial', sans-serif;
    }

    .casino-background {
      flex: 1;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
      position: relative;
      overflow: hidden;
    }

    .casino-table {
      position: relative;
      width: 100%;
      height: 100%;
      background: #0d4f8c;
      padding: 20px;
    }

    .top-left-title {
      position: absolute;
      top: 20px;
      left: 20px;
    }

    .bottom-right-cards {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .card {
      width: 80px;
      height: 120px;
      background: white;
      border: 2px solid #333;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      color: #333;
      font-size: 18px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.3s;
    }

    .card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    }

    .main-title {
      font-size: 48px;
      font-weight: bold;
      color: #ff4444;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }


    .branding {
      position: absolute;
      bottom: 20px;
      left: 20px;
    }

    .wisi-title {
      color: white;
      font-size: 48px;
      font-weight: bold;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .wisi-subtitle {
      color: #ffd700;
      font-size: 16px;
      margin: 5px 0 0 0;
    }

    .login-panel {
      width: 400px;
      background: #2c2c2c;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .login-form {
      width: 100%;
      max-width: 300px;
    }

    .login-title {
      color: white;
      text-align: center;
      margin-bottom: 30px;
      font-size: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-input {
      width: 100%;
      padding: 12px;
      border: 2px solid #555;
      border-radius: 8px;
      background: #1a1a1a;
      color: white;
      font-size: 16px;
      box-sizing: border-box;
    }

    .form-input:focus {
      outline: none;
      border-color: #4CAF50;
    }

    .form-input::placeholder {
      color: #888;
    }

    .login-button {
      width: 100%;
      padding: 12px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      transition: background 0.3s;
    }

    .login-button:hover:not(:disabled) {
      background: #45a049;
    }

    .login-button:disabled {
      background: #666;
      cursor: not-allowed;
    }

    .error-message {
      color: #ff4444;
      text-align: center;
      margin-top: 15px;
      font-size: 14px;
    }
  `]
})
export class LoginComponent {
  credentials = {
    usuario: '',
    password: ''
  };
  
  loading = false;
  errorMessage = '';

  cards = ['A♠', 'K♥', 'Q♦', 'J♣', '10♠', '9♥', '8♦', '7♣'];

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmit() {
    if (this.loading) return;
    
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials.usuario, this.credentials.password)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage = error.error?.message || 'Error al iniciar sesión';
        }
      });
  }
}

