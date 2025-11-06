import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeriadosService } from '../../../services/feriados.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { ErrorModalService } from '../../../services/error-modal.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-feriados-list',
  imports: [CommonModule, FormsModule],
  standalone: true,
  template: `
    <div class="container-feriados">
      <div class="header">
        <button class="btn btn-success" [disabled]="!canAdd()" (click)="canAdd() ? openModal() : null">Agregar</button>
      </div>

      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let feriado of feriados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ feriado.nombre }}</td>
              <td>{{ feriado.Sala?.nombre || 'Sin sala' }}</td>
              <td>{{ feriado.fecha }}</td>
              <td>
                <button class="btn btn-info btn-sm me-1" [disabled]="!canEdit()" (click)="canEdit() ? editFeriado(feriado) : null">Editar</button>
                <button class="btn btn-danger btn-sm" [disabled]="!canDelete()" (click)="canDelete() ? deleteFeriado(feriado.id) : null">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="feriados.length === 0" class="no-data">
        <p>No hay feriados registrados</p>
      </div>

      <!-- Modal Crear/Editar Feriado -->
      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedFeriado ? 'Editar Feriado' : 'Crear Nuevo Feriado' }}</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveFeriado()" #feriadoForm="ngForm">
              <div class="form-group">
                <label for="nombreFeriado">Nombre:</label>
                <input type="text" id="nombreFeriado" name="nombreFeriado" [(ngModel)]="form.nombre" class="form-control" placeholder="Nombre del feriado" required />
              </div>

              <div class="form-group">
                <label for="salaSelect">Sala:</label>
                <select id="salaSelect" name="salaSelect" [(ngModel)]="form.sala_id" class="form-control" required>
                  <option value="">Seleccione una sala</option>
                  <option *ngFor="let sala of userSalas" [value]="sala.id">{{ sala.nombre }}</option>
                </select>
              </div>

              <div class="form-group">
                <label for="fecha">Fecha:</label>
                <input id="fecha" name="fecha" type="date" [(ngModel)]="form.fecha" class="form-control" required />
              </div>

              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-success" [disabled]="!feriadoForm.form.valid">{{ selectedFeriado ? 'Actualizar' : 'Guardar' }}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container-feriados { padding: 20px; max-width: 1200px; margin: 0 auto; background: #f8f9fa; min-height: calc(100vh - 120px); }
    .header { margin-bottom: 20px; }
    .table-wrapper { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,.1); overflow: hidden; }
    .table { margin: 0; }
    .btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 4px; border: none; cursor: pointer; margin: 2px; }
    .btn-info { background:#17a2b8; color:white; }
    .btn-danger { background:#dc3545; color:white; }
    .btn-success { background:#28a745; color:white; }
    .no-data { text-align:center; padding: 24px; background:white; border-radius:8px; margin-top:12px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; }
    .modal-content { background:white; border-radius:12px; width: 90%; max-width: 500px; box-shadow: 0 20px 40px rgba(0,0,0,.3); }
    .modal-header { display:flex; justify-content:space-between; align-items:center; padding:20px; border-bottom:1px solid #e9ecef; }
    .modal-body { padding:20px; }
    .close-btn { background:none; border:none; font-size:24px; cursor:pointer; color:#666; }
    .form-group { margin-bottom: 16px; }
    .form-actions { display:flex; gap:12px; justify-content:flex-end; margin-top: 12px; }
  `]
})
export class FeriadosListComponent implements OnInit, OnDestroy {
  feriados: any[] = [];
  userSalas: any[] = [];
  showModal = false;
  selectedFeriado: any = null;
  form = {
    nombre: '',
    sala_id: null as any,
    fecha: ''
  };

  private permissionsSubscription?: Subscription;

  constructor(
    private feriadosService: FeriadosService,
    private userService: UserService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private errorModalService: ErrorModalService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit(): void {
    this.modulesService.loadModules();
    this.loadFeriados();
    this.permissionsSubscription = this.permissionsService.userPermissions$.subscribe(() => {});
  }

  ngOnDestroy(): void {
    this.permissionsSubscription?.unsubscribe();
  }

  canAdd(): boolean { return this.permissionsService.canAddByName('Feriados'); }
  canEdit(): boolean { return this.permissionsService.canEditByName('Feriados'); }
  canDelete(): boolean { return this.permissionsService.canDeleteByName('Feriados'); }

  loadFeriados(): void {
    this.feriadosService.getFeriados().subscribe({
      next: (rows) => { this.feriados = rows; },
      error: () => {}
    });
  }

  loadUserSalas(): void {
    this.userService.getUserSalas().subscribe({
      next: (salas) => { this.userSalas = salas; },
      error: () => {}
    });
  }

  openModal(): void {
    this.resetForm();
    this.loadUserSalas();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedFeriado = null;
    this.resetForm();
  }

  resetForm(): void {
    this.form = { nombre: '', sala_id: null as any, fecha: '' };
  }

  editFeriado(feriado: any): void {
    this.selectedFeriado = feriado;
    this.form = { nombre: feriado.nombre, sala_id: feriado.sala_id, fecha: feriado.fecha };
    this.loadUserSalas();
    this.showModal = true;
  }

  saveFeriado(): void {
    if (this.selectedFeriado) {
      this.feriadosService.updateFeriado(this.selectedFeriado.id, this.form).subscribe({
        next: (row) => {
          const idx = this.feriados.findIndex(f => f.id === row.id);
          if (idx !== -1) { this.feriados[idx] = row; }
          this.closeModal();
        },
        error: () => {}
      });
    } else {
      this.feriadosService.createFeriado(this.form).subscribe({
        next: (row) => { this.feriados.unshift(row); this.closeModal(); },
        error: () => {}
      });
    }
  }

  deleteFeriado(id: number): void {
    const feriado = this.feriados.find(f => f.id === id);
    this.confirmModalService.showConfirmModal({
      title: 'Confirmar Eliminación',
      message: '¿Está seguro de que desea eliminar este feriado?',
      entity: { id, nombre: feriado?.nombre || 'Feriado', tipo: 'Feriado' },
      warningText: 'Esta acción eliminará permanentemente el feriado.',
      onConfirm: () => this.ejecutarEliminacionFeriado(id)
    });
  }

  private ejecutarEliminacionFeriado(id: number): void {
    this.feriadosService.deleteFeriado(id).subscribe({
      next: () => { this.feriados = this.feriados.filter(f => f.id !== id); },
      error: (error) => {
        if (error.status === 400 && error.error?.relations) {
          this.errorModalService.showErrorModal({
            title: 'No se puede eliminar el feriado',
            message: error.error.message,
            entity: { id: error.error.feriado?.id || id, nombre: error.error.feriado?.nombre || 'Feriado', tipo: 'Feriado' },
            relations: error.error.relations,
            helpText: 'Para eliminar este feriado, primero debe eliminar elementos asociados.'
          });
        }
      }
    });
  }
}


