import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { CargosService } from '../../../services/cargos.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';

@Component({
  selector: 'app-empleados-borrados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="horarios-container"> <div class="header">
        <h2 class="mb-0">Pool Global de Personal</h2>
        <p class="text-muted">Personal desincorporado disponible para todas las sedes.</p>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre Completo</th>
              <th>Cédula</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img *ngIf="empleado.foto" [src]="'data:image/jpeg;base64,' + empleado.foto" class="employee-photo-circle" />
                <span *ngIf="!empleado.foto" class="text-muted">Sin foto</span>
              </td>
              <td><strong>{{ empleado.nombre }}</strong></td>
              <td><span class="badge-cedula">{{ empleado.cedula }}</span></td>
              <td class="text-center">
                <button class="btn btn-primary btn-sm" (click)="abrirModalIncorporar(empleado)">
                  <i class="fas fa-user-plus me-1"></i> Incorporar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Ficha de Reincorporación</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          
          <div class="modal-body p-4">
            <form #reincForm="ngForm" (ngSubmit)="confirmarIncorporacion()">
              <div class="row">
                <div class="col-md-4 border-end">
                  <div class="text-center mb-3">
                    <img *ngIf="selectedEmpleado?.foto" [src]="'data:image/jpeg;base64,' + selectedEmpleado.foto" class="photo-preview-large" />
                    <div *ngIf="!selectedEmpleado?.foto" class="no-photo-large"><i class="fas fa-user fa-4x"></i></div>
                  </div>
                  <div class="info-box bg-light p-2 rounded">
                    <label class="small fw-bold text-uppercase">Nombre:</label>
                    <p class="mb-2">{{ selectedEmpleado?.nombre }}</p>
                    <label class="small fw-bold text-uppercase">Cédula:</label>
                    <p class="mb-0">{{ selectedEmpleado?.cedula }}</p>
                  </div>
                </div>

                <div class="col-md-8">
                  <h5 class="border-bottom pb-2 mb-3">Asignación Laboral</h5>
                  
                  <div class="form-group mb-3">
                    <label class="fw-bold">Cargo:</label>
                    <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-control form-select-lg" required>
                      <option [ngValue]="null">--- Seleccione el cargo ---</option>
                      <option *ngFor="let c of todosLosCargos" [value]="c.id">
                        {{ c.nombre }} ({{ c.Departamento?.Area?.Sala?.nombre || 'General' }})
                      </option>
                    </select>
                    <small class="text-muted">Seleccione el cargo. Esto asignará automáticamente la sala.</small>
                  </div>

                  <div class="form-group mb-3">
                    <label class="fw-bold">Nueva Fecha de Ingreso:</label>
                    <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control" required />
                  </div>

                  <div class="alert alert-warning mt-4 small">
                    <i class="fas fa-exclamation-triangle"></i> Al confirmar, el empleado pasará a estar <strong>Activo</strong> y será visible en los reportes de su nueva sala.
                  </div>
                </div>
              </div>

              <div class="modal-footer mt-4 pb-0 pe-0">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success btn-lg" [disabled]="!reincForm.form.valid">
                  <i class="fas fa-check-circle me-1"></i> Finalizar Reincorporación
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .horarios-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .table-wrapper { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .employee-photo-circle { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
    .badge-cedula { font-family: monospace; font-weight: bold; background: #e9ecef; padding: 4px 8px; border-radius: 4px; }
    
    /* Modal Large Style (Copiado de Edición) */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content-large { background: white; border-radius: 12px; width: 850px; max-width: 95%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); }
    .modal-header { background: #343a40; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; color: white; font-size: 28px; cursor: pointer; }
    
    .photo-preview-large { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; border: 3px solid #dee2e6; }
    .no-photo-large { height: 180px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #adb5bd; border: 2px dashed #dee2e6; }
    
    .form-control-sm { font-size: 0.85rem; }
    .small-label { font-size: 0.7rem; font-weight: 700; color: #6c757d; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
  `]
})
export class EmpleadosBorradosComponent implements OnInit {
  empleados: any[] = [];
  todosLosCargos: any[] = [];
  showModal = false;
  selectedEmpleado: any = null;

  form = { cargo_id: null as any, fecha_ingreso: '' };

  constructor(
    private empleadosService: EmpleadosService,
    private cargosService: CargosService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // 1. Cargamos el pool global (que ahora es realmente global tras el cambio en server.js)
    this.empleadosService.getEmpleadosBorrados().subscribe(res => this.empleados = res);
    
    // 2. Cargamos TODOS los cargos de una vez para no tener que filtrar por sala
    this.cargosService.getCargos().subscribe(res => {
      // Ordenamos alfabéticamente por nombre de sala y luego cargo para que sea fácil buscar
      this.todosLosCargos = res.sort((a, b) => {
        const salaA = a.Departamento?.Area?.Sala?.nombre || '';
        const salaB = b.Departamento?.Area?.Sala?.nombre || '';
        return salaA.localeCompare(salaB);
      });
    });
  }

  canEdit() { return this.permissionsService.canEditByName('Empleados'); }

  abrirModalIncorporar(empleado: any) {
    this.selectedEmpleado = empleado;
    this.form = { cargo_id: null, fecha_ingreso: '' };
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  confirmarIncorporacion() {
    this.confirmModalService.showConfirmModal({
      title: 'Finalizar Incorporación',
      message: `¿Deseas activar a ${this.selectedEmpleado.nombre}?`,
      onConfirm: () => {
        // MERGE TOTAL: Enviamos el objeto original con los cambios aplicados
        // Esto evita el error 400 ya que mandamos nombre, cédula, foto, etc.
        const payload = {
          ...this.selectedEmpleado,
          activo: 1, // Activamos el registro
          cargo_id: Number(this.form.cargo_id),
          fecha_ingreso: this.form.fecha_ingreso,
          dispositivos: [] // Se limpia de dispositivos por seguridad
        };

        this.empleadosService.updateEmpleado(this.selectedEmpleado.id, payload).subscribe({
          next: () => {
            this.empleados = this.empleados.filter(e => e.id !== this.selectedEmpleado.id);
            this.closeModal();
          },
          error: (err) => {
            this.errorModalService.showErrorModal({
              title: 'Error de Incorporación',
              message: err.error?.message || 'No se pudo activar el empleado. Verifica los datos.',
            });
          }
        });
      }
    });
  }

  formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES');
  }
}