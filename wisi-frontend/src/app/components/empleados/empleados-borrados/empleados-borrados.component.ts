import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { CargosService } from '../../../services/cargos.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-empleados-borrados',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="horarios-container">
      <div class="header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 class="mb-0">Personal Desincorporados</h2>
          <p class="text-muted">Personal desincorporado disponible para todas las sedes.</p>
        </div>
        <div class="search-box">
          <div class="input-group shadow-sm">
            <span class="input-group-text bg-white border-end-0">
              <i class="fas fa-search text-muted"></i>
            </span>
            <input 
              type="text" 
              class="form-control border-start-0 ps-0" 
              [(ngModel)]="filtroTexto" 
              (input)="aplicarFiltro()" 
              placeholder="Buscar por nombre o cédula..."
            />
          </div>
        </div>
      </div>
      
      <div class="table-wrapper shadow-sm">
        <table class="table table-striped table-hover mb-0">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre Completo</th>
              <th>Cédula</th>
              <th class="text-center">Edad</th>
              <th>Fecha de Salida</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleadosFiltrados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img 
                  *ngIf="empleado.foto" 
                  [src]="'data:image/jpeg;base64,' + empleado.foto" 
                  class="employee-photo clickable-photo" 
                  (click)="verFotoGrande(empleado)"
                />
                <div *ngIf="!empleado.foto" class="no-photo clickable-photo" (click)="verFotoGrande(empleado)">
                  <span>Sin foto</span>
                </div>
              </td>
              <td class="align-middle"><strong>{{ empleado.nombre }}</strong></td>
              <td class="align-middle"><span class="badge-cedula">{{ empleado.cedula }}</span></td>
              <td class="text-center align-middle">
                <span class="edad-badge">{{ calcularEdad(empleado.fecha_cumpleanos) }}</span>
              </td>
              <td class="align-middle">{{ formatDate(empleado.updated_at) }}</td>
              <td class="text-center align-middle">
                <button class="btn btn-primary btn-sm action-btn" (click)="abrirModalIncorporar(empleado)">
                   <i class="fas fa-user-plus me-1"></i> Incorporar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-overlay">
        <div class="modal-content-large shadow-lg" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3><i class="fas fa-user-edit me-2"></i>Ficha de Reincorporación</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          
          <div class="modal-body p-4">
            <form #reincForm="ngForm" (ngSubmit)="confirmarIncorporacion()">
              <div class="row">
                <div class="col-md-4 border-end">
                  <div class="text-center mb-3 p-2 bg-light rounded border">
                    <img 
                      *ngIf="selectedEmpleado?.foto" 
                      [src]="'data:image/jpeg;base64,' + selectedEmpleado.foto" 
                      class="photo-preview-large clickable-photo mb-2" 
                      (click)="verFotoGrande(selectedEmpleado)"
                    />
                    <div *ngIf="!selectedEmpleado?.foto" class="no-photo-large mb-2">
                      <i class="fas fa-user fa-4x text-secondary"></i>
                    </div>
                  </div>
                  
                  <div class="info-box-read-only p-3 bg-light rounded border-start border-4 border-primary">
                    <div class="mb-3">
                      <label class="label-muted">NOMBRE COMPLETO</label>
                      <div class="fw-bold fs-6">{{ selectedEmpleado?.nombre }}</div>
                    </div>
                    <div class="mb-3">
                      <label class="label-muted">CÉDULA DE IDENTIDAD</label>
                      <div class="fw-bold fs-6">{{ selectedEmpleado?.cedula }}</div>
                    </div>
                    <div class="mb-3">
                      <label class="label-muted">FECHA DE NACIMIENTO</label>
                      <div class="fw-bold fs-6">{{ formatDate(selectedEmpleado?.fecha_cumpleanos) }}</div>
                    </div>
                    <div>
                      <label class="label-muted">EDAD / SEXO</label>
                      <div class="fw-bold fs-6">
                        {{ calcularEdad(selectedEmpleado?.fecha_cumpleanos) }} | {{ selectedEmpleado?.sexo }}
                      </div>
                    </div>
                  </div>
                </div>

                <div class="col-md-8 ps-4">
                  <h5 class="border-bottom pb-2 mb-4 text-secondary">
                    <i class="fas fa-briefcase me-2"></i>Asignación de Nueva Sede y Cargo
                  </h5>
                  
                  <div class="form-group mb-4">
                    <label class="fw-bold mb-2">Seleccione Cargo:</label>
                    <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-select form-select-lg shadow-sm" required>
                      <option [ngValue]="null">--- Seleccione el cargo ---</option>
                      <option *ngFor="let c of todosLosCargos" [value]="c.id">
                        {{ c.nombre }} | {{ c.Departamento?.Area?.Sala?.nombre || 'General' }}
                      </option>
                    </select>
                    <small class="text-muted d-block mt-2">
                      <i class="fas fa-info-circle me-1"></i>El cargo determinará la sala a la que se integrará el empleado.
                    </small>
                  </div>

                  <div class="form-group mb-4">
                    <label class="fw-bold mb-2">Nueva Fecha de Ingreso:</label>
                    <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control form-control-lg shadow-sm" required />
                  </div>

                  <div class="alert alert-warning mt-5 shadow-sm border-0 border-start border-4 border-warning">
                    <div class="d-flex align-items-center">
                      <i class="fas fa-exclamation-triangle fa-2x me-3 text-warning"></i>
                      <div>
                        <strong>Confirmación Requerida:</strong> Al finalizar, el empleado pasará a estar activo en el sistema.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="modal-footer-custom d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
                <button type="button" class="btn btn-secondary px-4" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success btn-lg px-5 shadow" [disabled]="!reincForm.form.valid">
                   Finalizar Reincorporación
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div *ngIf="showPhotoModal" class="modal-overlay" (click)="closePhotoModal()">
        <div class="modal-content-photo" (click)="$event.stopPropagation()">
          <div class="photo-header d-flex justify-content-between align-items-center px-3 py-2">
            <div class="text-white">
              <h4 class="mb-0">{{ selectedEmpleadoParaFoto?.nombre }}</h4>
              <small class="opacity-75">{{ selectedEmpleadoParaFoto?.cedula }}</small>
            </div>
            <button class="btn-close-photo" (click)="closePhotoModal()">&times;</button>
          </div>
          <div class="photo-viewer-body bg-dark text-center">
            <img [src]="'data:image/jpeg;base64,' + selectedEmpleadoParaFoto?.foto" class="img-zoom-large" />
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    /* Réplica de Estilos de empleados-list.component.ts */
    .horarios-container { padding: 20px; max-width: 1400px; margin: 0 auto; background: #f4f6f9; min-height: 100vh; }
    .table-wrapper { background: white; border-radius: 8px; overflow: hidden; }
    .employee-photo { width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 2px solid #3498db; }
    .no-photo { width: 45px; height: 45px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #6c757d; border: 2px solid #dee2e6; }
    .edad-badge { background-color: #e8f4fd; color: #2b6cb0; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: 0.85rem; }
    .badge-cedula { font-family: monospace; font-weight: bold; background: #f8f9fa; border: 1px solid #dee2e6; padding: 4px 8px; border-radius: 4px; color: #333; }
    .clickable-photo { cursor: pointer; transition: transform 0.2s; }
    .clickable-photo:hover { transform: scale(1.05); }

    /* Buscador */
    .search-box { width: 380px; }
    .input-group-text { border-right: none; }
    .form-control:focus { box-shadow: none; border-color: #dee2e6; }

    /* Modales Estilo Profesional */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1050; }
    .modal-content-large { background: white; border-radius: 12px; width: 900px; max-width: 95%; max-height: 90vh; overflow-y: auto; }
    .modal-header { background: #343a40; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
    .close-btn { background: none; border: none; color: white; font-size: 32px; cursor: pointer; }
    
    .photo-preview-large { width: 100%; height: 260px; object-fit: cover; border-radius: 8px; border: 4px solid #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
    .no-photo-large { height: 260px; background: #f1f3f5; display: flex; align-items: center; justify-content: center; border-radius: 8px; border: 2px dashed #ccc; }
    .label-muted { font-size: 0.7rem; font-weight: 800; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
    
    /* Visor de Fotos */
    .modal-content-photo { background: #000; border-radius: 8px; overflow: hidden; }
    .photo-header { background: #1a1a1a; border-bottom: 1px solid #333; }
    .btn-close-photo { background: none; border: none; color: white; font-size: 35px; cursor: pointer; }
    .img-zoom-large { max-height: 80vh; max-width: 95vw; object-fit: contain; }
    .modal-footer-custom { border-top: 1px solid #eee; padding: 20px; }
  `]
})
export class EmpleadosBorradosComponent implements OnInit {
  empleados: any[] = [];
  empleadosFiltrados: any[] = [];
  todosLosCargos: any[] = [];
  filtroTexto: string = '';
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
  ) { }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Carga global (ajustado según server.js)
    this.empleadosService.getEmpleadosBorrados().subscribe(res => {
      this.empleados = res;
      this.aplicarFiltro();
    });

    // Carga de cargos para el selector
    this.cargosService.getCargos().subscribe(res => {
      this.todosLosCargos = res.sort((a, b) => {
        const salaA = a.Departamento?.Area?.Sala?.nombre || '';
        const salaB = b.Departamento?.Area?.Sala?.nombre || '';
        return salaA.localeCompare(salaB);
      });
    });
  }

  aplicarFiltro() {
    if (!this.filtroTexto) {
      this.empleadosFiltrados = [...this.empleados];
    } else {
      const texto = this.filtroTexto.toLowerCase().trim();
      this.empleadosFiltrados = this.empleados.filter(e =>
        e.nombre.toLowerCase().includes(texto) || e.cedula.includes(texto)
      );
    }
  }

  abrirModalIncorporar(empleado: any) {
    this.selectedEmpleado = empleado;
    // Sugerimos fecha actual por defecto
    this.form = { cargo_id: null, fecha_ingreso: new Date().toISOString().split('T')[0] };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    //this.selectedEmpleado = null; 
  }

  verFotoGrande(empleado: any) {
    this.selectedEmpleadoParaFoto = empleado;
    this.showPhotoModal = true;
  }

  closePhotoModal() { this.showPhotoModal = false; this.selectedEmpleadoParaFoto = null; }

  confirmarIncorporacion() {
    this.showModal = false;
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Reincorporación',
      message: `¿Deseas activar formalmente a "${this.selectedEmpleado.nombre}"?`,
      onConfirm: () => {
        // Objeto completo para el backend
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
            this.aplicarFiltro();
            this.closeModal();
          },
          error: (err) => {
            this.errorModalService.showErrorModal({
              title: 'Error de Incorporación',
              message: err.error?.message || 'No se pudo activar el registro.',
            });
          }
        });
      }
    });
  }

  // Método de cálculo copiado de tu empleados-list.component.ts
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

  canEdit() { return this.permissionsService.canEditByName('Empleados'); }
}