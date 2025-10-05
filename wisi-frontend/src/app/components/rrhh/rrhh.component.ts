import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PermissionsService } from '../../services/permissions.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rrhh',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="module-container">
      <div class="module-header">
        <h1>Módulo RRHH</h1>
        <p>Recursos Humanos</p>
      </div>
      
      <div class="module-content">
        <div class="actions-section">
          <button 
            class="action-btn"
            [class.disabled]="!canAdd()"
            [disabled]="!canAdd()"
            (click)="canAdd() ? navigateToAdd() : null">
            <span class="btn-icon">➕</span>
            Agregar
          </button>
          
          <button 
            class="action-btn"
            [class.disabled]="!canEdit()"
            [disabled]="!canEdit()"
            (click)="canEdit() ? navigateToEdit() : null">
            <span class="btn-icon">✏️</span>
            Editar
          </button>
          
          <button 
            class="action-btn"
            [class.disabled]="!canReport()"
            [disabled]="!canReport()"
            (click)="canReport() ? navigateToReport() : null">
            <span class="btn-icon">📊</span>
            Reporte
          </button>
          
          <button 
            class="action-btn"
            [class.disabled]="!canDelete()"
            [disabled]="!canDelete()"
            (click)="canDelete() ? navigateToDelete() : null">
            <span class="btn-icon">🗑️</span>
            Eliminar
          </button>
        </div>
        
        <div class="feature-grid">
          <div class="feature-card" (click)="navigateToAreas()">
            <div class="feature-icon">🏢</div>
            <h3>Gestión de Áreas</h3>
            <p>Administra áreas por sala</p>
          </div>
          
          <div class="feature-card" (click)="navigateToDepartamentos()">
            <div class="feature-icon">🏛️</div>
            <h3>Gestión de Departamentos</h3>
            <p>Administra departamentos por área</p>
          </div>
          
          <div class="feature-card" (click)="navigateToCargos()">
            <div class="feature-icon">👔</div>
            <h3>Gestión de Cargos</h3>
            <p>Administra cargos por departamento</p>
          </div>
          
          <div class="feature-card" (click)="navigateToEmpleados()">
            <div class="feature-icon">👥</div>
            <h3>Gestión de Empleados</h3>
            <p>Administra empleados y sus datos personales</p>
          </div>
          
          <div class="feature-card" (click)="navigateToHorarios()">
            <div class="feature-icon">🕒</div>
            <h3>Gestión de Horarios</h3>
            <p>Administra plantillas de horarios</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📋</div>
            <h3>Gestión de Personal</h3>
            <p>Administra contratos y nóminas</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📋</div>
            <h3>Reportes</h3>
            <p>Genera reportes de personal y estadísticas</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📅</div>
            <h3>Horarios</h3>
            <p>Gestiona horarios y turnos de trabajo</p>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Estadísticas</h3>
            <p>Visualiza métricas y KPIs del personal</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .module-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

    .actions-section {
      display: flex;
      gap: 15px;
      margin-bottom: 40px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.9);
      border: none;
      border-radius: 12px;
      padding: 15px 25px;
      font-size: 16px;
      font-weight: 600;
      color: #333;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .action-btn:hover:not(.disabled) {
      background: white;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
    }

    .action-btn.disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }

    .action-btn.disabled:hover {
      transform: none;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .btn-icon {
      font-size: 18px;
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
      cursor: pointer;
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
export class RrhhComponent implements OnInit, OnDestroy {
  private readonly RRHH_MODULE_ID = 1; // Módulo RRHH
  private permissionsSubscription?: Subscription;

  constructor(
    private permissionsService: PermissionsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse a cambios de permisos
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(permissions => {
      this.debugPermissions();
    });

    // Debug inicial
    this.debugPermissions();
  }

  ngOnDestroy(): void {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  debugPermissions(): void {
    const allPermissions = this.permissionsService.getCurrentPermissions();

    // Mostrar todos los módulos únicos que tiene el usuario
    const uniqueModules = [...new Set(allPermissions.map(p => p.moduleId))];

    // Mostrar permisos por módulo
    uniqueModules.forEach(moduleId => {
      const modulePermissions = allPermissions.filter(p => p.moduleId === moduleId);
    });


    // Debug adicional para verificar el módulo específico
    const rrhhPermissions = allPermissions.filter(p => p.moduleId === 1);
  }

  // Métodos para verificar permisos
  canAdd(): boolean {
    return this.permissionsService.canAdd(this.RRHH_MODULE_ID);
  }

  canEdit(): boolean {
    return this.permissionsService.canEdit(this.RRHH_MODULE_ID);
  }

  canReport(): boolean {
    return this.permissionsService.canReport(this.RRHH_MODULE_ID);
  }

  canDelete(): boolean {
    return this.permissionsService.canDelete(this.RRHH_MODULE_ID);
  }

  // Métodos de navegación
  navigateToAdd(): void {
    // this.router.navigate(['/rrhh/add']);
  }

  navigateToEdit(): void {
    // this.router.navigate(['/rrhh/edit']);
  }

  navigateToReport(): void {
    // this.router.navigate(['/rrhh/report']);
  }

  navigateToDelete(): void {
    // this.router.navigate(['/rrhh/delete']);
  }

  navigateToAreas(): void {
    this.router.navigate(['/areas']);
  }

  navigateToDepartamentos(): void {
    this.router.navigate(['/departamentos']);
  }

  navigateToCargos(): void {
    this.router.navigate(['/cargos']);
  }

  navigateToEmpleados(): void {
    this.router.navigate(['/empleados']);
  }

  navigateToHorarios(): void {
    this.router.navigate(['/horarios']);
  }
}



