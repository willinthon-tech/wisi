import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CargosService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todos los cargos
  getCargos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cargos`);
  }

  // Obtener un cargo por ID
  getCargo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cargos/${id}`);
  }

  // Crear un nuevo cargo
  createCargo(cargo: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cargos`, cargo);
  }

  // Actualizar un cargo
  updateCargo(id: number, cargo: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/cargos/${id}`, cargo);
  }

  // Eliminar un cargo
  deleteCargo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cargos/${id}`);
  }

  // Obtener departamentos del usuario
  getUserDepartamentos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/departamentos`);
  }
}




