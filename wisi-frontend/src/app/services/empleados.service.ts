import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpleadosService {
  private apiUrl = 'http://localhost:3000/api/empleados';

  constructor(private http: HttpClient) { }

  getEmpleados(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getEmpleado(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createEmpleado(empleado: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, empleado);
  }

  updateEmpleado(id: number, empleado: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, empleado);
  }

  deleteEmpleado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getUserCargos(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/cargos');
  }

  getUserHorarios(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/horarios');
  }

  getUserDispositivos(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/dispositivos');
  }

  getTareasByUser(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3000/api/tareas-dispositivo-usuarios/user/${userId}`);
  }

  getCurrentUser(): Observable<any> {
    return this.http.get<any>('http://localhost:3000/api/verify');
  }

  verificarCedula(cedula: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/verificar-cedula/${cedula}`);
  }
}
