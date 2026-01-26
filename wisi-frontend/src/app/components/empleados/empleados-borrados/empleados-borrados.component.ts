import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../../services/empleados.service';
import { AreasService } from '../../../services/areas.service';
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
        <h2 class="mb-2">Empleados desincorporados</h2>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre Completo</th>
              <th>Cédula</th>
              <th>Fecha de Salida</th>
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
              <td>{{ empleado.cedula }}</td>
              <td>{{ formatDate(empleado.updated_at) }}</td>
              <td class="text-center">
                <button class="btn btn-primary btn-sm"  (click)="abrirModalIncorporar(empleado)">
                  Incorporar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Ficha de Incorporación</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form #incForm="ngForm" (ngSubmit)="confirmarIncorporacion()">
              
              <div class="row mb-4">
                <div class="col-md-4 text-center">
                   <img *ngIf="selectedEmpleado?.foto" [src]="'data:image/jpeg;base64,' + selectedEmpleado.foto" class="photo-preview-modal" />
                </div>
                <div class="col-md-8">
                  <div class="form-group mb-2">
                    <label class="small text-muted">Nombre:</label>
                    <input type="text" [value]="selectedEmpleado?.nombre" class="form-control" disabled />
                  </div>
                  <div class="form-group">
                    <label class="small text-muted">Cédula:</label>
                    <input type="text" [value]="selectedEmpleado?.cedula" class="form-control" disabled />
                  </div>
                </div>
              </div>

              <hr>

              <div class="form-group mb-3">
                <label>Sala de Reingreso:</label>
                <select name="sala_id" [(ngModel)]="form.sala_id" (change)="onSalaChange()" class="form-control" required>
                  <option [ngValue]="null">--- Seleccione Sala ---</option>
                  <option *ngFor="let s of userSalas" [value]="s.id">{{ s.nombre }}</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label>Cargo a Ocupar:</label>
                <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-control" [disabled]="!form.sala_id" required>
                  <option [ngValue]="null">--- Seleccione Cargo ---</option>
                  <option *ngFor="let c of cargosFiltrados" [value]="c.id">{{ c.nombre }}</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label>Fecha de Nuevo Ingreso:</label>
                <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control" required />
              </div>

              <div class="form-actions mt-4">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success" [disabled]="!incForm.form.valid">
                  Activar e Incorporar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .horarios-container { padding: 20px; max-width: 1400px; margin: 0 auto; background: #f8f9fa; min-height: calc(100vh - 120px); }
    .table-wrapper { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
    .table th { background-color: #343a40; color: white; padding: 15px; font-weight: 600; }
    .employee-photo-circle { width: 35px; height: 35px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
    
    /* Modal idéntico a Horarios */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); overflow: hidden; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #343a40; color: white; }
    .close-btn { background: none; border: none; font-size: 24px; color: white; cursor: pointer; }
    .modal-body { padding: 20px; }
    .photo-preview-modal { width: 100%; height: 110px; border-radius: 8px; object-fit: cover; border: 1px solid #ddd; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; padding-top: 20px; border-top: 1px solid #eee; }
    .no-data { text-align: center; padding: 40px; background: white; border-radius: 8px; margin-top: 20px; }
  `]
})
export class EmpleadosBorradosComponent implements OnInit {
  empleados: any[] = [];
  userSalas: any[] = [];
  todosLosCargos: any[] = [];
  cargosFiltrados: any[] = [];
  showModal = false;
  selectedEmpleado: any = null;

  // Formulario con campos obligatorios
  form = { sala_id: null as any, cargo_id: null as any, fecha_ingreso: '' };

  constructor(
    private empleadosService: EmpleadosService,
    private areasService: AreasService,
    private cargosService: CargosService,
    private permissionsService: PermissionsService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.loadInitialData();
  }

  loadInitialData() {
    this.empleadosService.getEmpleadosBorrados().subscribe(res => this.empleados = res);
    this.areasService.getUserSalas().subscribe(res => this.userSalas = res);
    // Cargamos todos los cargos para filtrar localmente después
    this.cargosService.getCargos().subscribe(res => this.todosLosCargos = res);
  }

  canEdit() { return this.permissionsService.canEditByName('Empleados'); }

  abrirModalIncorporar(empleado: any) {
    this.selectedEmpleado = empleado;
    this.form = { sala_id: null, cargo_id: null, fecha_ingreso: '' };
    this.cargosFiltrados = [];
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  // FILTRO LOCAL: Como tu servicio no tiene getCargosBySala, filtramos el array completo
  onSalaChange() {
    this.cargosFiltrados = [];
    this.form.cargo_id = null;
    if (this.form.sala_id) {
      const sId = Number(this.form.sala_id);
      this.cargosFiltrados = this.todosLosCargos.filter(c => 
        c.Departamento?.Area?.Sala?.id === sId || c.Departamento?.Area?.sala_id === sId
      );
    }
  }

  confirmarIncorporacion() {
    // MERGE: Mandamos el empleado completo + los nuevos datos obligatorios
    const payload = {
      ...this.selectedEmpleado,
      activo: 1, // Activamos
      cargo_id: Number(this.form.cargo_id),
      fecha_ingreso: this.form.fecha_ingreso,
      dispositivos: [] // Entra limpio de equipos
    };

    this.empleadosService.updateEmpleado(this.selectedEmpleado.id, payload).subscribe({
      next: () => {
        // Remover del pool y cerrar
        this.empleados = this.empleados.filter(e => e.id !== this.selectedEmpleado.id);
        this.closeModal();
      },
      error: (err) => {
        this.errorModalService.showErrorModal({
          title: 'Error de Incorporación',
          message: err.error?.message || 'Error al procesar el reingreso.'
        });
      }
    });
  }

  formatDate(dateStr: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('es-ES');
  }
}