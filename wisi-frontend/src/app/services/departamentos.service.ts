import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DepartamentosService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todos los departamentos
  getDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departamentos`);
  }

  // Obtener un departamento por ID
  getDepartamento(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/departamentos/${id}`);
  }

  // Crear un nuevo departamento
  createDepartamento(departamento: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/departamentos`, departamento);
  }

  // Actualizar un departamento
  updateDepartamento(id: number, departamento: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/departamentos/${id}`, departamento);
  }

  // Eliminar un departamento
  deleteDepartamento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/departamentos/${id}`);
  }

  // Obtener áreas del usuario
  getUserAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/areas`);
  }
}




