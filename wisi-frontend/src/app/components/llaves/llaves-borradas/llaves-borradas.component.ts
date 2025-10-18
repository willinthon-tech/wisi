import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LlavesService } from '../../../services/llaves.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/auth.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-llaves-borradas',
  imports: [CommonModule],
  template: `
    <div class="llaves-borradas-container">
      <div class="header">
        <h2>Llaves Borradas</h2>
        <p class="text-muted">Lista de llaves que han sido marcadas como borradas</p>
      </div>

      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Fecha de Borrado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let llave of llavesBorradas; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ llave.nombre }}</td>
              <td>{{ llave.Sala?.nombre || 'Sin sala' }}</td>
              <td>{{ formatDate(llave.updated_at) }}</td>
              <td>
                <button 
                  class="btn btn-success btn-sm" 
                  [class.disabled]="!canActivate()"
                  [disabled]="!canActivate()"
                  (click)="canActivate() ? activarLlave(llave.id) : null">
                  Activar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="llavesBorradas.length === 0" class="no-data">
          <p>No hay llaves borradas</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .llaves-borradas-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header {
      margin-bottom: 20px;
    }

    .header h2 {
      margin: 0 0 10px 0;
      color: #333;
      font-size: 24px;
      font-weight: 600;
    }

    .text-muted {
      color: #666;
      font-size: 14px;
      margin: 0;
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      scrollbar-width: none; /* Firefox */
      -ms-overflow-style: none; /* Internet Explorer 10+ */
    }

    .table-wrapper::-webkit-scrollbar {
      display: none; /* Chrome, Safari, Edge */
    }

    .table {
      margin: 0;
      border: none;
      width: 100%;
      background: white;
    }

    .table th {
      background-color: #343a40;
      color: white;
      border: none;
      padding: 15px 12px;
      font-weight: 600;
      font-size: 14px;
      position: sticky;
      top: 0;
      z-index: 10;
    }

    .table td {
      padding: 12px;
      vertical-align: middle;
      border-top: 1px solid #dee2e6;
      font-size: 14px;
    }

    .table tbody tr:hover {
      background-color: #f8f9fa;
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      margin: 2px;
      transition: all 0.2s ease;
    }

    .btn-success {
      background: #28a745;
      color: white;
    }

    .btn-sm:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .no-data {
      text-align: center;
      padding: 40px;
      color: #666;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .me-1 {
      margin-right: 0.25rem;
    }

    .mb-1 {
      margin-bottom: 0.25rem;
    }
  `]
})
export class LlavesBorradasComponent implements OnInit, OnDestroy {
  llavesBorradas: any[] = [];
  
  private readonly LLAVES_MODULE_ID = 3; // ID del módulo CECOM (donde están las llaves)
  private permissionsSubscription?: Subscription;

  constructor(
    private llavesService: LlavesService,
    private userService: UserService,
    private authService: AuthService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.loadLlavesBorradas();
    this.loadPermissions();
  }

  ngOnDestroy() {
    if (this.permissionsSubscription) {
      this.permissionsSubscription.unsubscribe();
    }
  }

  loadLlavesBorradas() {
    this.llavesService.getLlavesBorradas().subscribe({
      next: (llaves) => {
        this.llavesBorradas = llaves;
      },
      error: (error) => {
        
        this.errorModalService.showErrorModal({
          title: 'Error',
          message: 'No se pudieron cargar las llaves borradas'
        });
      }
    });
  }

  loadPermissions() {
    // Verificar si es superusuario (nivel TODO)
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      // Superusuario tiene acceso a todo
      return;
    }
    
    // Para usuarios normales, verificar permisos específicos
    this.permissionsService.getUserPermissions().subscribe((permissions: any) => {
      const hasAccess = permissions.some((p: any) => p.Module?.id === this.LLAVES_MODULE_ID);
      if (!hasAccess) {
        this.errorModalService.showErrorModal({
          title: 'Acceso Denegado',
          message: 'No tienes permisos para acceder a este módulo'
        });
      }
    });
  }

  canActivate(): boolean {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.nivel === 'TODO') {
      return true; // Superusuario puede hacer todo
    }
    // TODO: Implementar verificación de permisos específicos para usuarios normales
    return true;
  }

  activarLlave(id: number) {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Activación',
      message: '¿Está seguro de que desea activar esta llave?',
      entity: {
        id: id,
        nombre: 'Llave',
        tipo: 'Llave'
      },
      warningText: 'Esta acción restaurará la llave y estará disponible nuevamente.',
      onConfirm: () => {
        this.llavesService.activarLlave(id).subscribe({
          next: () => {
            this.loadLlavesBorradas();
          },
          error: (error) => {
            
            this.errorModalService.showErrorModal({
              title: 'Error',
              message: 'No se pudo activar la llave'
            });
          }
        });
      }
    });
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
