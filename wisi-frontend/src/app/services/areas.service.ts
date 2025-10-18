import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AreasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener todas las áreas
  getAreas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/areas`);
  }

  // Obtener un área por ID
  getArea(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/${id}`);
  }

  // Crear una nueva área
  createArea(area: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/areas`, area);
  }

  // Actualizar un área
  updateArea(id: number, area: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/areas/${id}`, area);
  }

  // Eliminar un área
  deleteArea(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/areas/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}








