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

    <div class="cargos-container">

      <div class="header" style="margin-bottom: 20px;">

        <button class="btn btn-success" [disabled]="!canAdd()" (click)="openModal()">

          Agregar Feriado

        </button>

      </div>



      <div class="table-wrapper" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">

        <table class="table" style="width: 100%; border-collapse: collapse;">

          <thead style="background: #343a40; color: white;">

            <tr>

              <th style="padding: 12px;">N°</th>

              <th style="padding: 12px;">Nombre</th>

              <th style="padding: 12px;">Sala</th>

              <th style="padding: 12px;">Fecha</th>

              <th style="padding: 12px;">Acciones</th>

            </tr>

          </thead>

          <tbody>

            <tr *ngFor="let f of feriados; let i = index" style="border-bottom: 1px solid #eee;">

              <td style="padding: 12px;">{{ i + 1 }}</td>

              <td style="padding: 12px;">{{ f?.nombre }}</td>

              <td style="padding: 12px;">

                <span *ngIf="!f?.sala_id" class="badge-nacional">NACIONAL</span>

                <span *ngIf="f?.sala_id">{{ f?.Sala?.nombre || 'Sala' }}</span>

              </td>

              <td style="padding: 12px;">

                <strong>{{ f?.dia ? (f.dia < 10 ? '0'+f.dia : f.dia) : '00' }}</strong> / {{ getNombreMes(f?.mes) }}

              </td>

              <td style="padding: 12px;">

                <button class="btn btn-info btn-sm" [disabled]="!canEdit() || !f?.sala_id" (click)="editFeriado(f)" style="margin-right: 5px;">Editar</button>

                <button class="btn btn-danger btn-sm" [disabled]="!canDelete() || !f?.sala_id" (click)="deleteFeriado(f?.id)">Eliminar</button>

              </td>

            </tr>

          </tbody>

        </table>

      </div>



      <div *ngIf="showModal" class="modal-overlay">

        <div class="modal-content">

          <div class="modal-header">

            <h3>{{ selectedFeriado ? 'Editar' : 'Nuevo' }} Feriado</h3>

            <button (click)="closeModal()" style="border:none; background:none; font-size: 20px; cursor:pointer;">&times;</button>

          </div>

          <div class="modal-body">

            <form (ngSubmit)="saveFeriado()" #fForm="ngForm">

              <div style="margin-bottom: 15px;">

                <label style="display:block;">Nombre:</label>

                <input type="text" name="n" [(ngModel)]="form.nombre" class="form-control" required style="width: 100%; padding: 8px;">

              </div>

              <div style="margin-bottom: 15px;">

                <label style="display:block;">Sala:</label>

                <select name="s" [(ngModel)]="form.sala_id" class="form-control" required style="width: 100%; padding: 8px;">

                  <option [ngValue]="null">Seleccione Sala</option>

                  <option *ngFor="let s of userSalas" [ngValue]="s.id">{{ s.nombre }}</option>

                </select>

              </div>

              <div style="display: flex; gap: 10px; margin-bottom: 15px;">

                <div style="flex: 1;">

                  <label>Mes:</label>

                  <select name="m" [(ngModel)]="form.mes" class="form-control" required style="width: 100%; padding: 8px;">

                    <option [ngValue]="null">Mes...</option>

                    <option *ngFor="let m of meses" [ngValue]="m.id">{{ m.nombre }}</option>

                  </select>

                </div>

                <div style="flex: 1;">

                  <label>Día:</label>

                  <input type="number" name="d" [(ngModel)]="form.dia" class="form-control" min="1" max="31" required style="width: 100%; padding: 8px;">

                </div>

              </div>

              <div style="text-align: right; margin-top: 20px;">

                <button type="button" (click)="closeModal()" class="btn" style="background:#6c757d; color:white; margin-right: 5px;">Cancelar</button>

                <button type="submit" [disabled]="!fForm.form.valid" class="btn btn-success">Guardar</button>

              </div>

            </form>

          </div>

        </div>

      </div>

    </div>

  `,

  styles: [`

    .badge-nacional { background: #007bff; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }

    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }

    .modal-content { background: white; padding: 20px; border-radius: 8px; width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }

    .btn { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; }

    .btn-success { background: #28a745; color: white; }

    .btn-info { background: #17a2b8; color: white; }

    .btn-danger { background: #dc3545; color: white; }

    .btn:disabled { opacity: 0.5; cursor: not-allowed; }

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

    const payload = {

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

      title: 'Eliminar',

      message: `¿Eliminar ${f?.nombre}?`,

      onConfirm: () => this.feriadosService.deleteFeriado(id).subscribe(() => this.loadFeriados())

    });

  }

}