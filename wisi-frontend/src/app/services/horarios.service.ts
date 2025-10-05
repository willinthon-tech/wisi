import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HorariosService {
  private apiUrl = 'http://localhost:3000/api/horarios';

  constructor(private http: HttpClient) { }

  // Obtener todos los horarios con sus bloques
  getHorarios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener un horario específico con sus bloques
  getHorario(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear un nuevo horario con bloques
  createHorario(horarioData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, horarioData);
  }

  // Actualizar un horario con sus bloques
  updateHorario(id: number, horarioData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, horarioData);
  }

  // Eliminar un horario (soft delete)
  deleteHorario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}