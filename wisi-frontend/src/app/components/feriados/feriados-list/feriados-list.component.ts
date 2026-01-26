import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeriadosService } from '../../../services/feriados.service';
import { UserService } from '../../../services/user.service';
import { PermissionsService } from '../../../services/permissions.service';
import { ModulesService } from '../../../services/modules.service';
import { ConfirmModalService } from '../../../services/confirm-modal.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-feriados-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="feriados-container">
      <div class="header">
        <button 
          class="btn btn-success" 
          [disabled]="!canAdd()"
          (click)="canAdd() ? openModal() : null">
          Agregar
        </button>
      </div>
      
      <div class="table-wrapper">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>N°</th>
              <th>Nombre</th>
              <th>Sala</th>
              <th>Fecha (Día/Mes)</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let f of feriados; let i = index">
              <td>{{ i + 1 }}</td>
              <td>{{ f?.nombre }}</td>
              <td>
                <span *ngIf="!f?.sala_id" class="badge badge-nacional">NACIONAL</span>
                <span *ngIf="f?.sala_id">{{ f?.Sala?.nombre || 'Sin asignar' }}</span>
              </td>
              <td>
                <span class="fecha-texto">
                  <strong>{{ f?.dia ? (f.dia < 10 ? '0'+f.dia : f.dia) : '00' }}</strong> / {{ getNombreMes(f?.mes) }}
                </span>
              </td>
              <td>
                <button 
                  class="btn btn-info btn-sm me-1" 
                  [class.disabled]="!canEdit() || !f?.sala_id"
                  [disabled]="!canEdit() || !f?.sala_id"
                  (click)="canEdit() && f?.sala_id ? editFeriado(f) : null">
                  Editar
                </button>
                <button 
                  class="btn btn-danger btn-sm" 
                  [class.disabled]="!canDelete() || !f?.sala_id"
                  [disabled]="!canDelete() || !f?.sala_id"
                  (click)="canDelete() && f?.sala_id ? deleteFeriado(f?.id) : null">
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div *ngIf="feriados.length === 0" class="no-data">
        <p>No hay feriados registrados</p>
      </div>

      <div *ngIf="showModal" class="modal-overlay" (click)="closeModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ selectedFeriado ? 'Editar Feriado' : 'Crear Nuevo Feriado' }}</h3>
            <button class="close-btn" (click)="closeModal()">&times;</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveFeriado()" #fForm="ngForm">
              <div class="form-group">
                <label for="nombreFeriado">Nombre del Feriado:</label>
                <input 
                  type="text" 
                  id="nombreFeriado" 
                  name="n"
                  [(ngModel)]="form.nombre"
                  class="form-control"
                  placeholder="Ingrese el nombre del feriado"
                  required
                />
              </div>
              
              <div class="form-group">
                <label for="salaSelect">Sala:</label>
                <select 
                  id="salaSelect" 
                  name="s"
                  [(ngModel)]="form.sala_id"
                  class="form-control"
                  required
                >
                  <option [ngValue]="null">Seleccione una sala</option>
                  <option *ngFor="let s of userSalas" [ngValue]="s.id">
                    {{ s.nombre }}
                  </option>
                </select>
              </div>

              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Mes:</label>
                    <select name="m" [(ngModel)]="form.mes" class="form-control" required>
                      <option [ngValue]="null">Seleccione mes</option>
                      <option *ngFor="let m of meses" [ngValue]="m.id">{{ m.nombre }}</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Día:</label>
                    <input 
                      type="number" 
                      name="d"
                      [(ngModel)]="form.dia"
                      class="form-control"
                      min="1"
                      max="31"
                      required
                    />
                  </div>
                </div>
              </div>
              
              <div class="form-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">
                  Cancelar
                </button>
                <button type="submit" class="btn btn-success" [disabled]="!fForm.form.valid">
                  {{ selectedFeriado ? 'Actualizar Feriado' : 'Guardar Feriado' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .feriados-container {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: calc(100vh - 120px);
    }

    .header { margin-bottom: 20px; }

    .header .btn {
      padding: 12px 24px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .header .btn-success { background: #28a745; color: white; }

    .header .btn-success:hover {
      background: #218838;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
    }

    .table-wrapper {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      max-height: calc(100vh - 200px);
      overflow-y: auto;
      scrollbar-width: none;
    }

    .table-wrapper::-webkit-scrollbar { display: none; }

    .table { margin: 0; border: none; width: 100%; background: white; }

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

    .table tbody tr:hover { background-color: #f8f9fa; }

    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
      margin: 2px;
      transition: all 0.2s ease;
    }

    .btn-info { background: #17a2b8; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-danger { background: #dc3545; color: white; }

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

    .badge-nacional {
      background-color: #0d6efd;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: #666;
    }

    .modal-body { padding: 20px; }

    .form-group { margin-bottom: 20px; }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 12px;
      border: 2px solid #e9ecef;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s ease;
    }

    .form-control:focus {
      outline: none;
      border-color: #28a745;
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn:disabled, .btn.disabled {
      opacity: 0.4;
      cursor: not-allowed !important;
      pointer-events: none;
    }

    .me-1 { margin-right: 0.25rem; }
    .row { display: flex; flex-wrap: wrap; margin-right: -15px; margin-left: -15px; }
    .col-md-6 { flex: 0 0 50%; max-width: 50%; padding-right: 15px; padding-left: 15px; }
  `]
})
export class FeriadosListComponent implements OnInit, OnDestroy {
  feriados: any[] = [];
  userSalas: any[] = [];
  showModal = false;
  selectedFeriado: any = null;

  meses = [
    { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
    { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
    { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
    { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
  ];

  form = { nombre: '', sala_id: null as any, dia: null as any, mes: null as any };
  private sub?: Subscription;

  constructor(
    private feriadosService: FeriadosService,
    private userService: UserService,
    private permissionsService: PermissionsService,
    private modulesService: ModulesService,
    private confirmModalService: ConfirmModalService
  ) {}

  ngOnInit() {
    this.modulesService.loadModules();
    this.loadFeriados();
    this.sub = this.permissionsService.userPermissions$.subscribe();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  canAdd() { return this.permissionsService.canAddByName('Feriados'); }
  canEdit() { return this.permissionsService.canEditByName('Feriados'); }
  canDelete() { return this.permissionsService.canDeleteByName('Feriados'); }

  getNombreMes(id: any) { return this.meses.find(m => m.id === id)?.nombre || 'N/A'; }

  loadFeriados() {
    this.feriadosService.getFeriados().subscribe(res => this.feriados = res);
  }

  openModal() {
    this.form = { nombre: '', sala_id: null, dia: null, mes: null };
    this.selectedFeriado = null;
    this.userService.getUserSalas().subscribe(res => this.userSalas = res);
    this.showModal = true;
  }

  closeModal() { this.showModal = false; }

  editFeriado(f: any) {
    this.selectedFeriado = f;
    this.form = { nombre: f.nombre, sala_id: f.sala_id, dia: f.dia, mes: f.mes };
    this.userService.getUserSalas().subscribe(res => this.userSalas = res);
    this.showModal = true;
  }

  saveFeriado() {
    const payload: any = {
      nombre: this.form.nombre,
      sala_id: this.form.sala_id ? Number(this.form.sala_id) : null,
      dia: Number(this.form.dia),
      mes: Number(this.form.mes)
    };

    const action = this.selectedFeriado 
      ? this.feriadosService.updateFeriado(this.selectedFeriado.id, payload)
      : this.feriadosService.createFeriado(payload);

    action.subscribe(() => { this.loadFeriados(); this.closeModal(); });
  }

  deleteFeriado(id: any) {
    const f = this.feriados.find(x => x.id === id);
    this.confirmModalService.showConfirmModal({
      title: 'Eliminar Feriado',
      message: `¿Está seguro de que desea eliminar el feriado "${f?.nombre}"?`,
      entity: { id, nombre: f?.nombre, tipo: 'Feriado' },
      onConfirm: () => this.feriadosService.deleteFeriado(id).subscribe(() => this.loadFeriados())
    });
  }
}