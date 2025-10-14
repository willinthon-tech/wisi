import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Empleado {
  id: number;
  nombre: string;
  cargo_id: number;
  foto?: string;
  cedula?: string;
  fecha_ingreso?: string;
  fecha_cumpleanos?: string;
  sexo?: string;
  dispositivos?: number[];
  Cargo?: {
    id: number;
    nombre: string;
    Departamento?: {
      id: number;
      nombre: string;
      Area?: {
        id: number;
        nombre: string;
        Sala?: {
          id: number;
          nombre: string;
          nombre_comercial?: string;
          rif?: string;
          ubicacion?: string;
          correo?: string;
          telefono?: string;
          logo?: string;
        };
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private apiUrl = `${environment.apiUrl}/empleados`;

  constructor(private http: HttpClient) { }

  getEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(this.apiUrl);
  }

  getEmpleadosBySala(salaId: number): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/sala/${salaId}`);
  }

  getEmpleado(id: number): Observable<Empleado> {
    return this.http.get<Empleado>(`${this.apiUrl}/${id}`);
  }

  createEmpleado(empleado: Partial<Empleado>): Observable<Empleado> {
    return this.http.post<Empleado>(this.apiUrl, empleado);
  }

  updateEmpleado(id: number, empleado: Partial<Empleado>): Observable<Empleado> {
    return this.http.put<Empleado>(`${this.apiUrl}/${id}`, empleado);
  }

  deleteEmpleado(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  // Métodos adicionales necesarios para el componente empleados-list
  getUserCargos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cargos`);
  }

  getUserHorarios(cargoId?: number): Observable<any[]> {
    if (!cargoId) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }
    return this.http.get<any[]>(`${this.apiUrl}/horarios?cargoId=${cargoId}`);
  }

  getUserDispositivos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/dispositivos`);
  }

  getTareasByUser(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tareas/${userId}`);
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/current-user`);
  }

  verificarCedula(cedula: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verificar-cedula/${cedula}`);
  }

  // Obtener horarios asignados a un empleado
  getHorariosEmpleado(empleadoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${empleadoId}/horarios`);
  }

  // Asignar horario a un empleado
  asignarHorarioEmpleado(empleadoId: number, horarioData: { primer_dia: string, horario_id: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${empleadoId}/horarios`, horarioData);
  }

  // Eliminar horario asignado a un empleado
  eliminarHorarioEmpleado(empleadoId: number, horarioEmpleadoId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${empleadoId}/horarios/${horarioEmpleadoId}`);
  }

  // Obtener empleados borrados (activo = 0)
  getEmpleadosBorrados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${this.apiUrl}/borrados`);
  }

  // Activar empleado (cambiar activo de 0 a 1)
  activarEmpleado(empleadoId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${empleadoId}/activar`, {});
  }

  // Borrar empleado (cambiar activo de 1 a 0 - soft delete)
  borrarEmpleado(empleadoId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${empleadoId}/borrar`, {});
  }
}