import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-maquinas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <h1>Módulo Máquinas</h1>
        <p>Gestión de Máquinas de Casino</p>
      </div>
      
      <div class="module-content">
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">🎰</div>
            <h3>Inventario de Máquinas</h3>
            <p>Controla el inventario y estado de todas las máquinas</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🔧</div>
            <h3>Mantenimiento</h3>
            <p>Programa y registra mantenimientos preventivos y correctivos</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <h3>Rendimiento</h3>
            <p>Monitorea el rendimiento financiero de cada máquina</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📈</div>
            <h3>Estadísticas</h3>
            <p>Analiza datos de uso y rentabilidad</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
      padding: 20px;
    }

    .module-header {
      text-align: center;
      color: white;
      margin-bottom: 40px;
    }

    .module-header h1 {
      font-size: 48px;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    }

    .module-header p {
      font-size: 20px;
      margin: 10px 0 0 0;
      opacity: 0.9;
    }

    .module-content {
      max-width: 1200px;
      margin: 0 auto;
    }

    .feature-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
    }

    .feature-card {
      background: white;
      border-radius: 15px;
      padding: 30px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease;
    }

    .feature-card:hover {
      transform: translateY(-5px);
    }

    .feature-icon {
      font-size: 48px;
      margin-bottom: 20px;
    }

    .feature-card h3 {
      color: #333;
      margin: 0 0 15px 0;
      font-size: 24px;
    }

    .feature-card p {
      color: #666;
      margin: 0;
      line-height: 1.5;
    }
  `]
})
export class MaquinasComponent {}












