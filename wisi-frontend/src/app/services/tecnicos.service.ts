import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TecnicosService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todos los técnicos
  getTecnicos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tecnicos`);
  }

  // Obtener un técnico por ID
  getTecnico(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tecnicos/${id}`);
  }

  // Crear un nuevo técnico
  createTecnico(tecnico: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tecnicos`, tecnico);
  }

  // Actualizar un técnico
  updateTecnico(id: number, tecnico: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tecnicos/${id}`, tecnico);
  }

  // Eliminar un técnico
  deleteTecnico(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tecnicos/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}

