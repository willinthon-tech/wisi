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
    <div class="horarios-container"> <div class="header mb-4">
        <h2 class="mb-0">Pool Global de Personal</h2>
        <p class="text-muted">Personal desincorporado disponible para reingreso en todas las sedes.</p>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre Completo</th>
              <th>Cédula</th>
              <th class="text-center">Edad</th>
              <th>Fecha Desincorporación</th>
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
                  alt="Foto"
                  class="employee-photo clickable-photo" 
                  (click)="verFotoGrande(empleado)"
                />
                <span *ngIf="!empleado.foto" class="no-photo clickable-photo" (click)="verFotoGrande(empleado)">Sin foto</span>
              </td>
              <td><strong>{{ empleado.nombre }}</strong></td>
              <td><span class="badge-cedula">{{ empleado.cedula }}</span></td>
              <td class="text-center">
                <span class="edad-badge">{{ calcularEdad(empleado.fecha_cumpleanos) }}</span>
              </td>
              <td>{{ formatDate(empleado.updated_at) }}</td>
              <td class="text-center">
                <button class="btn btn-primary btn-sm action-btn" (click)="abrirModalIncorporar(empleado)">
                   <i class="fas fa-user-plus me-1"></i> Incorporar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-overlay"> <div class="modal-content-large" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class="fas fa-user-edit me-2"></i>Ficha de Reincorporación</h3>
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
                    />
                    <div *ngIf="!selectedEmpleado?.foto" class="no-photo-large"><i class="fas fa-user fa-4x"></i></div>
                  </div>
                  
                  <div class="info-details-box bg-light p-3 rounded">
                    <div class="detail-item mb-2">
                      <span class="detail-label">NOMBRE:</span>
                      <div class="detail-value">{{ selectedEmpleado?.nombre }}</div>
                    </div>
                    <div class="detail-item mb-2">
                      <span class="detail-label">CÉDULA:</span>
                      <div class="detail-value">{{ selectedEmpleado?.cedula }}</div>
                    </div>
                    <div class="detail-item mb-2">
                      <span class="detail-label">FECHA NACIMIENTO:</span>
                      <div class="detail-value">{{ formatDate(selectedEmpleado?.fecha_cumpleanos) }}</div>
                    </div>
                    <div class="detail-item mb-2">
                      <span class="detail-label">EDAD:</span>
                      <div class="detail-value">{{ calcularEdad(selectedEmpleado?.fecha_cumpleanos) }}</div>
                    </div>
                    <div class="detail-item">
                      <span class="detail-label">SEXO:</span>
                      <div class="detail-value">{{ selectedEmpleado?.sexo === 'M' ? 'MASCULINO' : 'FEMENINO' }}</div>
                    </div>
                  </div>
                </div>

                <div class="col-md-8 ps-4">
                  <h5 class="section-title mb-4">Configuración de Reingreso</h5>
                  
                  <div class="form-group mb-4">
                    <label class="form-label-bold">Cargo y Sede de Destino:</label>
                    <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-control form-select-lg" required>
                      <option [ngValue]="null">--- Seleccione el cargo ---</option>
                      <option *ngFor="let c of todosLosCargos" [value]="c.id">
                        {{ c.nombre }} | {{ c.Departamento?.Area?.Sala?.nombre || 'General' }}
                      </option>
                    </select>
                  </div>

                  <div class="form-group mb-4">
                    <label class="form-label-bold">Fecha de Inicio de Labores:</label>
                    <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control form-control-lg" required />
                  </div>

                  <div class="alert alert-warning shadow-sm border-0 border-start border-4 border-warning mt-5">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>Nota:</strong> Al confirmar, el empleado pasará automáticamente a la lista de personal activo.
                  </div>
                </div>
              </div>

              <div class="modal-footer-custom mt-4">
                <button type="button" class="btn btn-secondary px-4" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success btn-lg px-5" [disabled]="!reincForm.form.valid">
                  Finalizar Reincorporación
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div *ngIf="showPhotoModal" class="modal-overlay" (click)="closePhotoModal()">
        <div class="modal-content-photo" (click)="$event.stopPropagation()">
          <div class="photo-header">
            <div class="p-header-info">
              <h4 class="m-0">{{ selectedEmpleadoParaFoto?.nombre }}</h4>
              <small class="text-light opacity-75">{{ selectedEmpleadoParaFoto?.cedula }}</small>
            </div>
            <button class="btn-close-photo" (click)="closePhotoModal()">&times;</button>
          </div>
          <div class="photo-viewer-body bg-dark text-center">
            <img [src]="'data:image/jpeg;base64,' + selectedEmpleadoParaFoto?.foto" class="img-zoom" />
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* Estilos base copiados de empleados-list.component.ts */
    .horarios-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
    .table-wrapper { background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .employee-photo { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #3498db; }
    .no-photo { width: 45px; height: 45px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6c757d; text-align: center; }
    .edad-badge { background-color: #e8f4fd; color: #2b6cb0; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; }
    .badge-cedula { font-family: monospace; font-weight: bold; background: #f8f9fa; border: 1px solid #dee2e6; padding: 4px 8px; border-radius: 4px; }
    .clickable-photo { cursor: pointer; transition: transform 0.2s; }
    .clickable-photo:hover { transform: scale(1.05); }

    /* Modales Estilo Profesional */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; z-index: 1050; }
    .modal-content-large { background: white; border-radius: 12px; width: 900px; max-width: 95%; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0,0,0,0.5); }
    .modal-header { background: #343a40; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; color: white; font-size: 30px; cursor: pointer; }
    
    .photo-preview-large { width: 100%; height: 250px; object-fit: cover; border-radius: 8px; border: 4px solid #fff; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
    .no-photo-large { height: 250px; background: #f1f3f5; display: flex; align-items: center; justify-content: center; border-radius: 8px; }
    
    .detail-label { font-size: 0.7rem; font-weight: 800; color: #6c757d; }
    .detail-value { font-size: 0.95rem; font-weight: 600; color: #333; margin-bottom: 8px; }
    .section-title { color: #34495e; font-weight: 700; border-left: 5px solid #3498db; padding-left: 10px; }
    .form-label-bold { font-weight: 700; color: #2c3e50; margin-bottom: 8px; }

    /* Visor de Fotos Estilo Galería */
    .modal-content-photo { background: #000; border-radius: 8px; overflow: hidden; width: auto; max-width: 90vw; }
    .photo-header { padding: 12px 20px; background: #222; display: flex; justify-content: space-between; align-items: center; }
    .btn-close-photo { background: none; border: none; color: #fff; font-size: 35px; cursor: pointer; }
    .img-zoom { max-height: 80vh; max-width: 100%; }
    .modal-footer-custom { display: flex; justify-content: flex-end; gap: 15px; padding: 20px; border-top: 1px solid #eee; }
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

  verFotoGrande(empleado: any) {
    this.selectedEmpleadoParaFoto = empleado;
    this.showPhotoModal = true;
  }

  closePhotoModal() { this.showPhotoModal = false; }

  confirmarIncorporacion() {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Reincorporación',
      message: `¿Estás seguro de que deseas reincorporar a "${this.selectedEmpleado.nombre}"?`,
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
              title: 'Error de Servidor',
              message: err.error?.message || 'No se pudo activar el empleado.',
            });
          }
        });
      }
    });
  }

  // Lógica de cálculo idéntica a tu archivo original
  calcularEdad(fechaNacimiento: string): string {
    if (!fechaNacimiento) return '-';
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad + ' años';
  }

  formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}