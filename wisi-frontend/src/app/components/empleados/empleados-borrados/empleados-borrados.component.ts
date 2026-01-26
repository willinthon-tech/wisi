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
    <div class="feriados-container">
      <div class="header">
        <h2>Empleados Desincorporados</h2>
        <span class="badge badge-nacional">REINCORPORACIÓN</span>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Foto</th>
              <th>Nombre</th>
              <th>Cédula</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let empleado of empleados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>
                <img *ngIf="empleado.foto" [src]="'data:image/jpeg;base64,' + empleado.foto" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;" />
                <span *ngIf="!empleado.foto" class="text-muted">Sin foto</span>
              </td>
              <td><strong>{{ empleado.nombre }}</strong></td>
              <td>{{ empleado.cedula }}</td>
              <td class="text-center">
                <button class="btn btn-primary btn-sm" [disabled]="!canEdit()" (click)="abrirModalIncorporar(empleado)">
                  <i class="fas fa-user-plus"></i> Incorporar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Incorporar a Sala</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form #reincForm="ngForm" (ngSubmit)="confirmarIncorporacion()">
              
              <div class="row mb-3">
                <div class="col-md-4 text-center">
                   <img *ngIf="selectedEmpleado?.foto" [src]="'data:image/jpeg;base64,' + selectedEmpleado.foto" style="width: 100px; height: 100px; border-radius: 8px; object-fit: cover; border: 1px solid #ddd;" />
                </div>
                <div class="col-md-8">
                  <label class="small text-muted">Empleado:</label>
                  <input type="text" [value]="selectedEmpleado?.nombre" class="form-control" disabled />
                  <label class="small text-muted mt-2">Cédula:</label>
                  <input type="text" [value]="selectedEmpleado?.cedula" class="form-control" disabled />
                </div>
              </div>

              <hr>

              <div class="form-group mb-3">
                <label>Sala Destino:</label>
                <select name="sala_id" [(ngModel)]="form.sala_id" (change)="onSalaChange()" class="form-control" required>
                  <option [ngValue]="null">--- Seleccione Sala ---</option>
                  <option *ngFor="let s of userSalas" [value]="s.id">{{ s.nombre }}</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label>Cargo Asignado:</label>
                <select name="cargo_id" [(ngModel)]="form.cargo_id" class="form-control" [disabled]="!form.sala_id" required>
                  <option [ngValue]="null">--- Seleccione Cargo ---</option>
                  <option *ngFor="let c of cargosFiltrados" [value]="c.id">{{ c.nombre }}</option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label>Fecha de Ingreso:</label>
                <input type="date" name="fecha_ingreso" [(ngModel)]="form.fecha_ingreso" class="form-control" required />
              </div>

              <div class="form-actions mt-4">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success" [disabled]="!reincForm.form.valid">
                  Finalizar e Incorporar
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feriados-container { padding: 20px; max-width: 1200px; margin: 0 auto; background: #f8f9fa; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 500px; overflow: hidden; }
    .modal-header { padding: 15px 20px; background: #343a40; color: white; display: flex; justify-content: space-between; }
    .close-btn { background: none; border: none; color: white; font-size: 24px; cursor: pointer; }
    .modal-body { padding: 20px; }
    .form-actions { display: flex; justify-content: flex-end; gap: 10px; }
  `]
})
export class EmpleadosBorradosComponent implements OnInit {
  empleados: any[] = [];
  userSalas: any[] = [];
  todosLosCargos: any[] = []; // Guardamos todos los cargos aquí
  cargosFiltrados: any[] = []; // Los que mostraremos según la sala
  showModal = false;
  selectedEmpleado: any = null;

  form = {
    sala_id: null as any,
    cargo_id: null as any,
    fecha_ingreso: ''
  };

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
    // 1. Cargamos empleados borrados
    this.empleadosService.getEmpleadosBorrados().subscribe(res => this.empleados = res);
    
    // 2. Cargamos las salas disponibles para el usuario
    this.areasService.getUserSalas().subscribe(res => this.userSalas = res);
    
    // 3. Cargamos TODOS los cargos una sola vez (Usando el método que SÍ existe)
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

  // FILTRO LOCAL: Aquí está el truco para no necesitar la función en el servicio
  onSalaChange() {
    this.cargosFiltrados = [];
    this.form.cargo_id = null;
    
    if (this.form.sala_id) {
      const sId = Number(this.form.sala_id);
      // Filtramos en el array local buscando la sala en la jerarquía del cargo
      this.cargosFiltrados = this.todosLosCargos.filter(c => 
        c.Departamento?.Area?.Sala?.id === sId || 
        c.Departamento?.Area?.sala_id === sId
      );
    }
  }

  confirmarIncorporacion() {
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Incorporación',
      message: `¿Deseas activar a ${this.selectedEmpleado.nombre}?`,
      onConfirm: () => {
        // MERGE DE DATOS: Mandamos el objeto completo para evitar errores 400
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
              message: err.error?.message || 'No se pudo procesar la incorporación.',
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