import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MaquinasService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todas las máquinas
  getMaquinas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/maquinas`);
  }

  // Obtener una máquina por ID
  getMaquina(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/maquinas/${id}`);
  }

  // Crear una nueva máquina
  createMaquina(maquina: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/maquinas`, maquina);
  }

  // Actualizar una máquina
  updateMaquina(id: number, maquina: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/maquinas/${id}`, maquina);
  }

  // Eliminar una máquina
  deleteMaquina(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/maquinas/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }

  // Obtener rangos del usuario
  getUserRangos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/rangos`);
  }
}
