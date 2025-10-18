import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RangosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener todos los rangos
  getRangos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/rangos`);
  }

  // Obtener un rango por ID
  getRango(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rangos/${id}`);
  }

  // Crear un nuevo rango
  createRango(rango: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rangos`, rango);
  }

  // Actualizar un rango
  updateRango(id: number, rango: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/rangos/${id}`, rango);
  }

  // Eliminar un rango
  deleteRango(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/rangos/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}

