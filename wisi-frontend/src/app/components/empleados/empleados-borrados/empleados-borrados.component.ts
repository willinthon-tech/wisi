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
    <div class="horarios-container"> 
      <div class="header">
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
                <img 
                  *ngIf="empleado.foto" 
                  [src]="'data:image/jpeg;base64,' + empleado.foto" 
                  class="employee-photo-circle clickable-photo" 
                  (click)="verFotoGrande(empleado)"
                  title="Click para ampliar"
                />
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

      <div *ngIf="showModal" class="modal-overlay"> <div class="modal-content-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class="fas fa-file-signature me-2"></i>Ficha de Reincorporación</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          
          <div class="modal-body p-4">
            <form #reincForm="ngForm" (ngSubmit)="confirmarIncorporacion()">
              <div class="row">
                <div class="col-md-4 border-end">
                  <div class="text-center mb-3">
                    <img 
                      *ngIf="selectedEmpleado?.foto" 
                      [src]="'data:image/jpeg;base64,' + selectedEmpleado.foto" 
                      class="photo-preview-large clickable-photo" 
                      (click)="verFotoGrande(selectedEmpleado)"
                      title="Click para ampliar"
                    />
                    <div *ngIf="!selectedEmpleado?.foto" class="no-photo-large">
                      <i class="fas fa-user fa-4x"></i>
                    </div>
                  </div>
                  <div class="info-box bg-light p-3 rounded border">
                    <label class="small fw-bold text-uppercase text-primary">Nombre Completo:</label>
                    <p class="mb-2 fw-bold">{{ selectedEmpleado?.nombre }}</p>
                    
                    <label class="small fw-bold text-uppercase text-primary">Documento de Identidad:</label>
                    <p class="mb-0 fw-bold">{{ selectedEmpleado?.cedula }}</p>
                  </div>
                </div>

                <div class="col-md-8 ps-4">
                  <h5 class="border-bottom pb-2 mb-4 text-secondary">
                    <i class="fas fa-briefcase me-2"></i>Nueva Asignación Laboral
                  </h5>
                  
                  <div class="form-group mb-4">
                    <label class="fw-bold mb-1">Cargo y Sede Destino:</label>
                    <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-control form-select-lg" required>
                      <option [ngValue]="null">--- Seleccione el cargo ---</option>
                      <option *ngFor="let c of todosLosCargos" [value]="c.id">
                        {{ c.nombre }} | {{ c.Departamento?.Area?.Sala?.nombre || 'General' }}
                      </option>
                    </select>
                    <small class="text-muted mt-1 d-block">
                      <i class="fas fa-info-circle me-1"></i>Al elegir el cargo, se vincula automáticamente a la sala correspondiente.
                    </small>
                  </div>

                  <div class="form-group mb-4">
                    <label class="fw-bold mb-1">Fecha de Reingreso:</label>
                    <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control form-control-lg" required />
                  </div>

                  <div class="alert alert-warning mt-4 shadow-sm border-start border-4 border-warning">
                    <div class="d-flex">
                      <i class="fas fa-exclamation-circle fa-2x me-3 text-warning"></i>
                      <div>
                        <strong>Atención:</strong> Al finalizar, el registro será movido a la lista de personal activo.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer mt-4 pt-3 border-top">
                <button type="button" class="btn btn-secondary px-4" (click)="closeModal()">
                  <i class="fas fa-times me-1"></i> Cancelar
                </button>
                <button type="submit" class="btn btn-success btn-lg px-5 shadow" [disabled]="!reincForm.form.valid">
                  <i class="fas fa-check-circle me-1"></i> Finalizar Reincorporación
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div *ngIf="showPhotoModal" class="modal-overlay" (click)="closePhotoModal()">
        <div class="modal-content-photo" (click)="$event.stopPropagation()">
          <div class="photo-modal-header">
            <div class="employee-info-header">
              <h4 class="mb-0">{{ selectedEmpleadoParaFoto?.nombre }}</h4>
              <span class="badge bg-primary">{{ selectedEmpleadoParaFoto?.cedula }}</span>
            </div>
            <button class="close-btn-light" (click)="closePhotoModal()">&times;</button>
          </div>
          <div class="photo-body text-center bg-dark">
            <img [src]="'data:image/jpeg;base64,' + selectedEmpleadoParaFoto?.foto" class="img-fluid large-photo-zoom" />
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .horarios-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .table-wrapper { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .employee-photo-circle { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; cursor: pointer; transition: transform 0.2s; }
    .employee-photo-circle:hover { transform: scale(1.1); }
    .badge-cedula { font-family: monospace; font-weight: bold; background: #e9ecef; padding: 4px 8px; border-radius: 4px; }
    .clickable-photo { cursor: pointer; }
    
    /* Modal Large (Identico a Edición) */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content-large { background: white; border-radius: 12px; width: 900px; max-width: 95%; box-shadow: 0 25px 50px rgba(0,0,0,0.4); }
    .modal-header { background: #343a40; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; color: white; font-size: 28px; cursor: pointer; }
    
    .photo-preview-large { width: 100%; height: 220px; object-fit: cover; border-radius: 8px; border: 4px solid #dee2e6; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
    .no-photo-large { height: 220px; background: #f8f9fa; display: flex; align-items: center; justify-content: center; border-radius: 8px; color: #adb5bd; border: 2px dashed #dee2e6; }
    
    /* Modal Foto Grande */
    .modal-content-photo { background: #333; border-radius: 8px; width: auto; max-width: 80vw; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }
    .photo-modal-header { padding: 10px 20px; background: #222; color: white; display: flex; justify-content: space-between; align-items: center; }
    .close-btn-light { background: none; border: none; color: #aaa; font-size: 32px; cursor: pointer; }
    .close-btn-light:hover { color: white; }
    .large-photo-zoom { max-height: 70vh; width: auto; }
    .employee-info-header h4 { font-size: 1.1rem; font-weight: 600; }

    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; }
    .info-box { border-left: 4px solid #3498db !important; }
  `]
})
export class EmpleadosBorradosComponent implements OnInit {
  empleados: any[] = [];
  todosLosCargos: any[] = [];
  showModal = false;
  showPhotoModal = false;
  selectedEmpleado: any = null;
  selectedEmpleadoParaFoto: any = null;

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
    this.empleadosService.getEmpleadosBorrados().subscribe(res => this.empleados = res);
    
    this.cargosService.getCargos().subscribe(res => {
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

  // Gestión de Foto Grande
  verFotoGrande(empleado: any) {
    this.selectedEmpleadoParaFoto = empleado;
    this.showPhotoModal = true;
  }

  closePhotoModal() {
    this.showPhotoModal = false;
    this.selectedEmpleadoParaFoto = null;
  }

  confirmarIncorporacion() {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Reincorporación',
      message: `¿Estás seguro de que deseas activar a "${this.selectedEmpleado.nombre}" en su nuevo cargo?`,
      onConfirm: () => {
        const payload = {
          ...this.selectedEmpleado,
          activo: 1,
          cargo_id: Number(this.form.cargo_id),
          fecha_ingreso: this.form.fecha_ingreso,
          dispositivos: [] 
        };

        this.empleadosService.updateEmpleado(this.selectedEmpleado.id, payload).subscribe({
          next: () => {
            this.empleados = this.empleados.filter(e => e.id !== this.selectedEmpleado.id);
            this.closeModal();
          },
          error: (err) => {
            this.errorModalService.showErrorModal({
              title: 'Error de Incorporación',
              message: err.error?.message || 'No se pudo completar la activación.',
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