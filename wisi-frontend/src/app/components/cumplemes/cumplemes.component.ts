import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmpleadosService } from '../../services/empleados.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-cumplemes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cumplemes-container">
      <!-- Selección de sala (mismo estilo de Carnets) -->
      <div class="sala-selector-section">
        <div class="sala-selector-container">
          <label class="sala-selector-label">Seleccionar Sala:</label>
          <div class="radio-buttons-group">
            <label class="radio-option" *ngFor="let sala of userSalas">
              <input
                type="radio"
                name="salaSelector"
                [value]="sala.id"
                [checked]="selectedSalaId === sala.id"
                (change)="onSalaChange(sala.id)"
                class="radio-input">
              <span class="radio-label">{{ sala.nombre }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Calendario de cumpleaños -->
      <div class="calendar-wrapper" *ngIf="selectedSalaId">
        <!-- Logo para impresión (arriba izquierda) -->
        <div class="print-logo print-only">
          <ng-container *ngIf="getSelectedSala()?.logo; else salaLogoText">
            <img [src]="getSalaLogo(getSelectedSala()?.logo)" alt="Logo sala" />
          </ng-container>
          <ng-template #salaLogoText>
            <div class="sala-logo placeholder">{{ getSelectedSala()?.nombre || 'Sala' }}</div>
          </ng-template>
        </div>
        <div class="calendar-header">
          <button class="btn-nav no-print" (click)="prevMonth()">◀</button>
          <h3 class="screen-title">{{ monthName }} {{ currentYear }}</h3>
          <h3 class="print-title print-only">Cumpleañeros del mes de {{ monthName }}</h3>
          <button class="btn-nav no-print" (click)="nextMonth()">▶</button>
          <button class="print-btn no-print" (click)="printCalendar()" title="Imprimir cumpleañeros del mes">
            🖨️ Imprimir
          </button>
        </div>

        <div class="print-spacer print-only"></div>

        <div class="calendar-grid">
          <div class="weekday" *ngFor="let d of weekDays">{{ d }}</div>
          <div class="day-cell" *ngFor="let day of calendarDays" [class.today]="day.isToday" [class.other-month]="!day.inCurrentMonth">
            <div class="day-number">{{ day.date.getDate() }}</div>
            <div class="birthdays" *ngIf="day.birthdays.length">
              <div class="birthday-item" *ngFor="let b of day.birthdays" [ngClass]="{ hidden: !includeInSearch(b) }">
                <span class="avatar clickable" (click)="openEmpleadoModal(b)">
                  <img *ngIf="b.foto" [src]="getEmployeePhoto(b.foto)" alt="{{ b.nombre }}" />
                  <span class="initials" *ngIf="!b.foto">{{ getEmployeeInitials(b.nombre) }}</span>
                </span>
                <span class="name" [title]="b.nombre">{{ b.nombre }} <span class="age" *ngIf="getAgeThisYear(b.fecha_cumpleanos) as age">( {{ age }} )</span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Listado de cumpleañeros (solo impresión) -->
        <div class="print-list print-only" *ngIf="birthdaysList.length">
          <h3>Listado de Cumpleañeros <span class="count-red">( {{ birthdaysList.length }} )</span></h3>
          <div class="print-columns">
            <div class="print-item" *ngFor="let p of birthdaysList">
              - ( {{ p.day }}/{{ viewMonth + 1 }} ) {{ p.nombre }}, {{ p.cargo }} ( <span class="age">{{ p.age }}</span> años )
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de detalles del empleado -->
      <div class="modal-overlay" *ngIf="showEmpleadoModal" (click)="closeEmpleadoModal()">
        <div class="modal-content detalle-modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Detalles del Empleado</h3>
            <button class="close-btn" (click)="closeEmpleadoModal()">&times;</button>
          </div>
          <div class="modal-body detalle-body" *ngIf="empleadoDetalle">
            <div class="detalle-container">
              <div class="detalle-foto-section">
                <img *ngIf="empleadoDetalle.foto" [src]="getEmployeePhoto(empleadoDetalle.foto)" alt="Foto del empleado" class="detalle-foto" />
                <div *ngIf="!empleadoDetalle.foto" class="detalle-foto-placeholder">
                  <i class="fas fa-user"></i>
                  <span>Sin foto</span>
                </div>
              </div>
              <div class="detalle-info">
                <div class="info-row"><span class="info-label">Nombre:</span><span class="info-value">{{ empleadoDetalle.nombre }}</span></div>
                <div class="info-row"><span class="info-label">Cédula:</span><span class="info-value">{{ empleadoDetalle.cedula }}</span></div>
                <div class="info-row"><span class="info-label">Cargo:</span><span class="info-value">{{ empleadoDetalle.Cargo?.nombre || 'Sin asignar' }}</span></div>
                <div class="info-row"><span class="info-label">Área:</span><span class="info-value">{{ empleadoDetalle.Cargo?.Area?.nombre || 'Sin asignar' }}</span></div>
                <div class="info-row"><span class="info-label">Departamento:</span><span class="info-value">{{ empleadoDetalle.Cargo?.Area?.Departamento?.nombre || 'Sin asignar' }}</span></div>
                <div class="info-row"><span class="info-label">Sala:</span><span class="info-value">{{ empleadoDetalle.Cargo?.Area?.Departamento?.Sala?.nombre || 'Sin asignar' }}</span></div>
                <div class="info-row"><span class="info-label">Cumpleaños:</span><span class="info-value">{{ empleadoDetalle.fecha_cumpleanos }}</span></div>
                <div class="info-row"><span class="info-label">Ingreso:</span><span class="info-value">{{ empleadoDetalle.fecha_ingreso }}</span></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="closeEmpleadoModal()">Cerrar</button>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!selectedSalaId && userSalas.length === 0">
        No tienes salas asignadas.
      </div>
    </div>
  `,
  styles: [`
    .cumplemes-container { padding: 20px; background: #f8f9fa; min-height: calc(100vh - 120px); }
    .sala-selector-section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .sala-selector-container { display: flex; flex-direction: column; gap: 15px; }
    .sala-selector-label { font-weight: 600; color: #333; font-size: 16px; margin-bottom: 10px; }
    .radio-buttons-group { display: flex; flex-wrap: wrap; gap: 15px; }
    .radio-option { display: flex; align-items: center; cursor: pointer; padding: 8px 16px; border: 2px solid #ddd; border-radius: 8px; transition: all 0.3s; background: white; }
    .radio-option:hover { border-color: #4CAF50; background: #f0f9f0; }
    .radio-input { margin-right: 8px; cursor: pointer; }
    .radio-option input[type="radio"]:checked ~ * { border-color: #4CAF50; }
    .radio-option input[type="radio"]:checked + .radio-label { font-weight: 600; color: #4CAF50; }

    .calendar-wrapper { background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .calendar-header { display: flex; align-items: center; justify-content: center; gap: 15px; margin-bottom: 10px; position: relative; }
    .calendar-header h3 { margin: 0; color: #333; }
    .btn-nav { border: none; background: #4CAF50; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; transition: 0.2s; }
    .btn-nav:hover { background: #43a047; transform: translateY(-1px); }
    .print-btn { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: #6c757d; color: white; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; }
    .print-btn:hover { background: #5a6268; }

    .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .weekday { text-align: center; font-weight: 700; color: #495057; padding: 8px 0; }
    .day-cell { min-height: 110px; border: 1px solid #e9ecef; border-radius: 8px; padding: 8px; background: #fff; display: flex; flex-direction: column; gap: 6px; }
    .day-cell.other-month { background: #f8f9fa; color: #adb5bd; }
      .day-cell.today { outline: none !important; }
    .day-number { font-weight: 700; color: #333; }
    .birthdays { display: flex; flex-direction: column; gap: 6px; }
    .birthday-item { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .birthday-item.hidden { display: none; }
    .avatar { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #4CAF50; overflow: hidden; }
    .avatar.clickable { cursor: pointer; }
    .avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .avatar .initials { color: white; font-weight: 700; font-size: 12px; }
    .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #212529; }
    .age { color: #28a745; font-weight: 700; }
    .empty-state { text-align: center; padding: 40px; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }

    /* Ocultar controles en impresión */
    @media print {
      /* Mantener colores en impresión */
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      /* Ocultar elementos marcados como no imprimibles */
      .no-print { display: none !important; }
      /* Ocultar todo excepto el calendario */
      body * { visibility: hidden; }
      .calendar-wrapper, .calendar-wrapper * { visibility: visible; }
      .calendar-wrapper { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border-radius: 0 !important; padding-top: 12px !important; }
      .cumplemes-container { padding: 0 !important; background: #fff !important; }
      app-navbar, .navbar, .modal-overlay, .no-print { display: none !important; }
      .print-only { display: block !important; }
      .screen-title { display: none !important; }
      .calendar-header { margin-top: 24px !important; margin-bottom: 28px !important; }
      .print-title { text-align: center; margin: 0 0 18px 0; font-size: 34px; color: #333; font-weight: 700; }
      .print-spacer { height: 28px; }
      .calendar-grid { margin-top: 12px !important; }
      .print-header-inner { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
      .print-logo { position: absolute; left: 16px; top: 16px; }
      .print-logo img { max-height: 110px; display: block; }
      .sala-logo.placeholder { font-weight: 700; border: 2px solid #e9ecef; padding: 12px 16px; border-radius: 6px; color: #666; font-size: 18px; }
    }

    /* Configuración de página para impresión */
    @page {
      size: Letter landscape;
      margin: 10mm;
    }

    /* Modal styles (inspirado en Empleados) */
    .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal-content { background: white; border-radius: 12px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #e9ecef; }
    .close-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: #666; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; }
    .close-btn:hover { color: #dc3545; }
    .modal-body { padding: 20px; }
    .modal-footer { padding: 15px 20px; border-top: 1px solid #e9ecef; display: flex; justify-content: flex-end; gap: 10px; }
    .detalle-container { display: flex; flex-direction: row; gap: 30px; align-items: center; }
    .detalle-foto-section { width: 300px; display: flex; justify-content: center; align-items: center; }
    .detalle-foto { width: 280px; height: 280px; border-radius: 50%; object-fit: cover; border: 6px solid #28a745; box-shadow: 0 8px 25px rgba(0,0,0,0.3); }
    .detalle-foto-placeholder { width: 280px; height: 280px; border-radius: 50%; background: #e9ecef; display: flex; flex-direction: column; justify-content: center; align-items: center; border: 6px solid #6c757d; color: #6c757d; font-size: 64px; }
    .detalle-info { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; }
    .info-row { display: flex; padding: 8px 0; border-bottom: 1px solid #e9ecef; align-items: flex-start; }
    .info-row:last-child { border-bottom: none; }
    .info-label { font-weight: 600; color: #495057; min-width: 160px; margin-right: 15px; font-size: 14px; }
    .info-value { color: #212529; font-size: 14px; flex: 1; word-break: break-word; }

    /* Sección de listado para impresión (dos columnas) */
    .print-only { display: none; }
    .print-list { margin-top: 24px; }
    .print-list h3 { margin: 0 0 8px 0; color: #d9534f; }
    .count-red { color: #d9534f; }
    .print-columns { column-count: 1; column-gap: 0; }
    .print-item { font-size: 14px; color: #333; break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 4px; }
    .print-item .age { color: #28a745; font-weight: 700; }
  `]
})
export class CumpleMesComponent implements OnInit {
  userSalas: any[] = [];
  selectedSalaId: number | null = null;
  empleados: any[] = [];
  searchText: string = '';
  showEmpleadoModal = false;
  empleadoDetalle: any = null;

  currentDate = new Date();
  viewMonth = this.currentDate.getMonth(); // 0-11
  viewYear = this.currentDate.getFullYear();

  weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  calendarDays: Array<{ date: Date; inCurrentMonth: boolean; isToday: boolean; birthdays: any[] }> = [];
  birthdaysList: any[] = [];

  constructor(private empleadosService: EmpleadosService, private userService: UserService) {}

  ngOnInit(): void {
    this.loadUserSalas();
    this.ensureGlobalPrintStyles();
  }

  get currentYear(): number { return this.viewYear; }
  get monthName(): string {
    return new Date(this.viewYear, this.viewMonth, 1).toLocaleString('es-ES', { month: 'long' }).replace(/^\w/, c => c.toUpperCase());
  }

  onSalaChange(salaId: number) {
    this.selectedSalaId = salaId;
    this.loadEmpleados();
  }

  prevMonth() {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else { this.viewMonth--; }
    this.buildCalendar();
  }

  nextMonth() {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else { this.viewMonth++; }
    this.buildCalendar();
  }

  private loadUserSalas() {
    this.userService.getUserSalas().subscribe({
      next: (salas: any[]) => {
        this.userSalas = salas || [];
        if (this.userSalas.length) {
          this.selectedSalaId = this.userSalas[0].id;
          this.loadEmpleados();
        }
      },
      error: () => { this.userSalas = []; }
    });
  }

  private loadEmpleados() {
    if (!this.selectedSalaId) { this.empleados = []; this.buildCalendar(); return; }
    this.empleadosService.getEmpleados().subscribe({
      next: (emps: any[]) => {
        // Filtrar por sala y solo activos
        this.empleados = (emps || []).filter(e => {
          const sala = e?.Cargo?.Area?.Departamento?.Sala;
          return e.activo === 1 && sala?.id === this.selectedSalaId;
        });
        this.buildCalendar();
      },
      error: () => { this.empleados = []; this.buildCalendar(); }
    });
  }

  private buildCalendar() {
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    const lastDay = new Date(this.viewYear, this.viewMonth + 1, 0);

    // En JS, getDay(): 0=Dom..6=Sáb. Queremos semana comenzando en Lunes.
    const jsFirstDay = firstDay.getDay();
    const startOffset = (jsFirstDay + 6) % 7; // Lunes=0

    const daysInMonth = lastDay.getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const cells: Array<{ date: Date; inCurrentMonth: boolean; isToday: boolean; birthdays: any[] }> = [];

    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - startOffset + 1; // 1..daysInMonth (o fuera de mes)
      const inCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
      const date = new Date(this.viewYear, this.viewMonth, inCurrentMonth ? dayNum : (dayNum < 1 ? dayNum : dayNum));
      const isToday = this.isSameDate(date, new Date());
      const birthdays = inCurrentMonth ? this.getBirthdaysForDay(dayNum) : [];
      cells.push({ date, inCurrentMonth, isToday, birthdays });
    }

    this.calendarDays = cells;
    this.buildBirthdaysList();
  }

  private getBirthdaysForDay(day: number): any[] {
    return this.empleados.filter(e => {
      const fecha = e?.fecha_cumpleanos as string;
      if (!fecha) return false;
      const [y, m, d] = fecha.split('-').map(Number);
      if (!m || !d) return false;
      return m - 1 === this.viewMonth && d === day;
    });
  }

  getEmployeeInitials(nombre: string): string {
    if (!nombre) return '?';
    const parts = nombre.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  }

  includeInSearch(emp: any): boolean {
    if (!this.searchText || this.searchText.trim() === '') return true;
    const term = this.searchText.toLowerCase().trim();
    return (emp?.nombre || '').toLowerCase().includes(term);
  }

  getEmployeePhoto(foto: string): string {
    if (!foto) return '';
    if (foto.startsWith('data:')) return foto;
    return `data:image/png;base64,${foto}`;
  }

  getAgeThisYear(fecha: string): number | null {
    if (!fecha) return null;
    const parts = fecha.split('-').map(Number);
    if (parts.length < 3 || !parts[0]) return null;
    const birthYear = parts[0];
    return this.viewYear - birthYear;
  }

  private buildBirthdaysList() {
    const list: any[] = [];
    this.empleados.forEach(e => {
      const fecha = e?.fecha_cumpleanos as string;
      if (!fecha) return;
      const [y, m, d] = fecha.split('-').map(Number);
      if (!m || !d) return;
      if (m - 1 !== this.viewMonth) return;
      list.push({
        nombre: e.nombre,
        cargo: e?.Cargo?.nombre || 'Sin cargo',
        age: this.viewYear - (y || this.viewYear),
        day: d
      });
    });
    list.sort((a, b) => (a.day - b.day) || a.nombre.localeCompare(b.nombre));
    this.birthdaysList = list;
  }

  getSelectedSala(): any {
    if (!this.selectedSalaId) return null;
    return this.userSalas.find(s => s.id === this.selectedSalaId) || null;
  }

  getSalaLogo(logo: string): string {
    if (!logo) return '';
    if (logo.startsWith('data:')) return logo;
    return `data:image/png;base64,${logo}`;
  }

  openEmpleadoModal(emp: any) {
    this.empleadoDetalle = emp;
    this.showEmpleadoModal = true;
  }

  closeEmpleadoModal() {
    this.showEmpleadoModal = false;
    this.empleadoDetalle = null;
  }

  printCalendar() {
    window.print();
  }

  private ensureGlobalPrintStyles(): void {
    const styleId = 'cumplemes-global-print-styles';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @media print {
        app-navbar, header, .navbar, .topbar, .toolbar, .sidebar, .breadcrumb, .page-title, .btn, .button, .no-print, [data-no-print], .modal, .modal-overlay, .close-btn { display: none !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .calendar-wrapper { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; box-shadow: none !important; border-radius: 0 !important; }
        .cumplemes-container { padding: 0 !important; background: #fff !important; }
      }
      @page { size: Letter landscape; margin: 10mm; }
    `;
    document.head.appendChild(style);
  }

  private isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
}


