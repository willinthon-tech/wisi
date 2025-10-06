import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { DispositivosService } from '../../../services/dispositivos.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-dispositivos-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dispositivo-form-container">
      <div class="form-header">
        <button class="btn-back" (click)="goBack()">
          ← Volver
        </button>
      </div>

      <div class="form-content">
        <form (ngSubmit)="saveDispositivo()" class="dispositivo-form">
          <div class="form-group">
            <label for="nombre">Nombre:</label>
            <input 
              type="text" 
              id="nombre" 
              [(ngModel)]="dispositivo.nombre"
              name="nombre"
              class="form-control"
              required
              placeholder="Ej: Terminal Principal"
            />
          </div>

          <div class="form-group">
            <label for="sala">Sala:</label>
            <select 
              id="sala" 
              [(ngModel)]="dispositivo.sala_id"
              name="sala_id"
              class="form-control"
              required
            >
              <option value="">Seleccione una sala</option>
              <option *ngFor="let sala of salas" [value]="sala.id">
                {{ sala.nombre }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label for="ip_local">IP Local:</label>
            <input 
              type="text" 
              id="ip_local" 
              [(ngModel)]="dispositivo.ip_local"
              name="ip_local"
              class="form-control"
              required
              placeholder="192.168.1.100"
            />
          </div>

          <div class="form-group">
            <label for="ip_remota">IP Remota (Opcional):</label>
            <input 
              type="text" 
              id="ip_remota" 
              [(ngModel)]="dispositivo.ip_remota"
              name="ip_remota"
              class="form-control"
              placeholder="10.0.0.100"
            />
          </div>

          <div class="form-group">
            <label for="usuario">Usuario (Opcional):</label>
            <input 
              type="text" 
              id="usuario" 
              [(ngModel)]="dispositivo.usuario"
              name="usuario"
              class="form-control"
              placeholder="admin"
            />
          </div>

          <div class="form-group">
            <label for="clave">Clave (Opcional):</label>
            <input 
              type="text" 
              id="clave" 
              [(ngModel)]="dispositivo.clave"
              name="clave"
              class="form-control"
              placeholder="password123"
            />
          </div>

          <div class="form-group" *ngIf="isEdit">
            <label for="marcaje_inicio">Marcaje Inicio:</label>
            <input 
              type="text" 
              id="marcaje_inicio" 
              [(ngModel)]="dispositivo.marcaje_inicio"
              name="marcaje_inicio"
              class="form-control"
              readonly
              (click)="openDatePicker('marcaje_inicio')"
              placeholder="Haga clic para seleccionar fecha de inicio"
            />
          </div>

          <div class="form-group" *ngIf="isEdit">
            <label for="marcaje_fin">Marcaje Fin:</label>
            <input 
              type="text" 
              id="marcaje_fin" 
              [(ngModel)]="dispositivo.marcaje_fin"
              name="marcaje_fin"
              class="form-control"
              readonly
              (click)="openDatePicker('marcaje_fin')"
              placeholder="Haga clic para seleccionar fecha de fin"
            />
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="goBack()">
              Cancelar
            </button>
            <button type="submit" class="btn btn-primary" [disabled]="loading">
              {{ loading ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .dispositivo-form-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e9ecef;
    }

    .form-header h2 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }

    .btn-back {
      background: #6c757d;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      transition: all 0.3s;
    }

    .btn-back:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .form-content {
      background: white;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      border: 1px solid #e9ecef;
    }

    .dispositivo-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
      font-size: 14px;
    }

    .form-control {
      padding: 12px 16px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      font-size: 16px;
      transition: all 0.3s;
    }

    .form-control:focus {
      outline: none;
      border-color: #4CAF50;
      box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }

    .form-actions {
      display: flex;
      gap: 15px;
      justify-content: flex-end;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e9ecef;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
      font-size: 14px;
      transition: all 0.3s;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
      transform: translateY(-2px);
    }

    .btn-primary {
      background: #4CAF50;
      color: white;
    }

    .btn-primary:hover {
      background: #45a049;
      transform: translateY(-2px);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }

    .btn-primary:disabled:hover {
      background: #4CAF50;
      transform: none;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .form-header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class DispositivosFormComponent implements OnInit {
  dispositivo = {
    id: null,
    nombre: '',
    sala_id: null,
    ip_local: '',
    ip_remota: '',
    usuario: '',
    clave: '',
    marcaje_inicio: '',
    marcaje_fin: ''
  };
  
  salas: any[] = [];
  loading = false;
  isEdit = false;
  dispositivoId: number | null = null;
  

  constructor(
    private dispositivosService: DispositivosService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEdit = true;
        this.dispositivoId = +params['id'];
        this.loadDispositivo();
      }
    });
    
    this.loadSalas();
  }

  loadDispositivo(): void {
    if (this.dispositivoId) {
      this.loading = true;
      this.dispositivosService.getDispositivo(this.dispositivoId).subscribe({
        next: (dispositivo: any) => {
          this.dispositivo = dispositivo;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error cargando dispositivo:', error);
          alert('Error cargando dispositivo: ' + (error.error?.message || error.message || 'Error desconocido'));
          this.loading = false;
          this.goBack();
        }
      });
    }
  }

  loadSalas(): void {
    this.dispositivosService.getSalas().subscribe({
      next: (salas: any[]) => {
        this.salas = salas;
      },
      error: (error: any) => {
        console.error('Error cargando salas:', error);
        alert('Error cargando salas: ' + (error.error?.message || error.message || 'Error desconocido'));
      }
    });
  }

  saveDispositivo(): void {
    if (!this.dispositivo.nombre || !this.dispositivo.sala_id || !this.dispositivo.ip_local) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    this.loading = true;

    // Establecer valores automáticos de marcaje solo al crear (no al editar)
    if (!this.isEdit) {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setFullYear(today.getFullYear() + 5);
      
      // Formatear fechas en el formato requerido
      this.dispositivo.marcaje_inicio = today.toISOString().split('T')[0] + 'T00:00:00';
      this.dispositivo.marcaje_fin = futureDate.toISOString().split('T')[0] + 'T23:59:59';
      
      console.log('📅 Valores automáticos de marcaje establecidos:');
      console.log('📅 Marcaje inicio:', this.dispositivo.marcaje_inicio);
      console.log('📅 Marcaje fin:', this.dispositivo.marcaje_fin);
    }

    if (this.isEdit && this.dispositivoId) {
      this.dispositivosService.updateDispositivo(this.dispositivoId, this.dispositivo).subscribe({
        next: (response: any) => {
          alert('Dispositivo actualizado exitosamente');
          this.goBack();
        },
        error: (error: any) => {
          console.error('Error actualizando dispositivo:', error);
          alert('Error actualizando dispositivo: ' + (error.error?.message || error.message || 'Error desconocido'));
          this.loading = false;
        }
      });
    } else {
      this.dispositivosService.createDispositivo(this.dispositivo).subscribe({
        next: (response: any) => {
          alert('Dispositivo creado exitosamente');
          this.goBack();
        },
        error: (error: any) => {
          console.error('Error creando dispositivo:', error);
          alert('Error creando dispositivo: ' + (error.error?.message || error.message || 'Error desconocido'));
          this.loading = false;
        }
      });
    }
  }

  openDatePicker(field: string): void {
    console.log('🗓️ Abriendo date picker para:', field);
    
    // Crear un input temporal de tipo date
    const input = document.createElement('input');
    input.type = 'date';
    input.style.position = 'fixed';
    input.style.top = '50%';
    input.style.left = '50%';
    input.style.transform = 'translate(-50%, -50%)';
    input.style.zIndex = '9999';
    input.style.opacity = '0';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.border = 'none';
    input.style.outline = 'none';
    
    // Establecer valor actual si existe
    if (field === 'marcaje_inicio' && this.dispositivo.marcaje_inicio) {
      const currentDate = this.dispositivo.marcaje_inicio.split('T')[0];
      input.value = currentDate;
    } else if (field === 'marcaje_fin' && this.dispositivo.marcaje_fin) {
      const currentDate = this.dispositivo.marcaje_fin.split('T')[0];
      input.value = currentDate;
    }
    
    document.body.appendChild(input);
    
    // Función para limpiar el input
    const cleanup = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    };
    
    // Manejar la selección de fecha
    input.addEventListener('change', (event: any) => {
      const selectedDate = event.target.value;
      console.log('🗓️ Fecha seleccionada:', selectedDate);
      
      if (selectedDate) {
        if (field === 'marcaje_inicio') {
          this.dispositivo.marcaje_inicio = selectedDate + 'T00:00:00';
          console.log('🗓️ Marcaje inicio actualizado:', this.dispositivo.marcaje_inicio);
        } else if (field === 'marcaje_fin') {
          this.dispositivo.marcaje_fin = selectedDate + 'T23:59:59';
          console.log('🗓️ Marcaje fin actualizado:', this.dispositivo.marcaje_fin);
        }
      }
      
      // Limpiar después de un pequeño delay para evitar conflictos
      setTimeout(cleanup, 100);
    });
    
    // Limpiar el input temporal si se cancela
    input.addEventListener('blur', () => {
      setTimeout(cleanup, 100);
    });
    input.addEventListener('cancel', () => {
      setTimeout(cleanup, 100);
    });
    
    // Forzar el foco y abrir el date picker inmediatamente
    input.focus();
    input.click();
    
    // También intentar con showPicker si está disponible
    if (input.showPicker) {
      try {
        input.showPicker();
      } catch (error) {
        console.log('showPicker no disponible:', error);
      }
    }
  }

  goBack(): void {
    this.router.navigate(['/super-config/dispositivos']);
  }
}
