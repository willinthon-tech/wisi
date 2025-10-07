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
  primer_dia_horario?: string;
  horario_id?: number;
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

  getUserHorarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/horarios`);
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
}