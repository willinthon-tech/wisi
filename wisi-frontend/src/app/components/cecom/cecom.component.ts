import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cecom',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container" *ngIf="hasAccess; else noAccess">
      <div class="module-header">
        <h1>Módulo CECOM</h1>
        <p>Centro de Control y Monitoreo</p>
      </div>
      
      <div class="module-content">
        <div class="feature-grid">
          <div class="feature-card">
            <div class="feature-icon">📹</div>
            <h3>Monitoreo en Tiempo Real</h3>
            <p>Supervisa todas las áreas del casino en tiempo real</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🚨</div>
            <h3>Alertas y Alarmas</h3>
            <p>Sistema de alertas automáticas para situaciones críticas</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Dashboard Central</h3>
            <p>Panel de control centralizado con métricas clave</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">🔒</div>
            <h3>Seguridad</h3>
            <p>Control de acceso y protocolos de seguridad</p>
          </div>
        </div>
      </div>
    </div>

    <ng-template #noAccess>
      <div class="no-access-container">
        <div class="no-access-content">
          <div class="access-icon">🚫</div>
          <h1>Acceso Denegado</h1>
          <p>No tienes permisos para acceder al módulo CECOM.</p>
          <p>Contacta al administrador para obtener los permisos necesarios.</p>
          <button class="btn-back" (click)="goBack()">
            ← Volver al Dashboard
          </button>
        </div>
      </div>
    </ng-template>
  `,
  styles: [`
    .module-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%);
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

    .no-access-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .no-access-content {
      background: white;
      border-radius: 20px;
      padding: 60px 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      max-width: 500px;
      width: 100%;
    }

    .access-icon {
      font-size: 80px;
      margin-bottom: 30px;
    }

    .no-access-content h1 {
      color: #333;
      font-size: 32px;
      margin: 0 0 20px 0;
      font-weight: 700;
    }

    .no-access-content p {
      color: #666;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 15px 0;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 15px 30px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
      margin-top: 30px;
      font-size: 16px;
    }

    .btn-back:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }
  `]
})
export class CecomComponent implements OnInit, OnDestroy {
  hasAccess: boolean = false;
  private readonly CECOM_MODULE_ID = 3; // ID del módulo CECOM
  private permissionsSubscription?: Subscription;

  constructor(
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Verificar permisos al cargar el componente
    this.checkPermissions();
    
    // Suscribirse a cambios de permisos
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      console.log('🔄 Permisos actualizados en CECOM:', permissions);
      this.checkPermissions();
    });
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  private checkPermissions(): void {
    // Verificar si el usuario tiene al menos un permiso para el módulo CECOM
    const permissions = this.permissionsService.getCurrentPermissions();
    const cecomPermissions = permissions.filter(p => p.moduleId === this.CECOM_MODULE_ID);
    
    console.log('🔍 Verificando acceso a CECOM (módulo 3):');
    console.log('📋 Permisos del usuario:', permissions);
    console.log('🏢 Permisos para CECOM:', cecomPermissions);
    
    this.hasAccess = cecomPermissions.length > 0;
    
    console.log('✅ Tiene acceso a CECOM:', this.hasAccess);
    
    if (!this.hasAccess) {
      console.log('❌ Usuario sin permisos para CECOM, redirigiendo...');
      // Opcional: redirigir automáticamente después de un tiempo
      setTimeout(() => {
        this.goBack();
      }, 3000);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}



