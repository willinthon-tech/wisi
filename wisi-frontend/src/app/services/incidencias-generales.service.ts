import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface IncidenciaGeneral {
  id?: number;
  libro_id: number;
  descripcion: string;
  hora: string;
  }

@Injectable({
  providedIn: 'root'
})
export class IncidenciasGeneralesService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getIncidenciasGenerales(libroId: number): Observable<IncidenciaGeneral[]> {
    return this.http.get<IncidenciaGeneral[]>(`${this.apiUrl}/incidencias-generales/${libroId}`);
  }

  createIncidenciaGeneral(incidencia: Partial<IncidenciaGeneral>): Observable<IncidenciaGeneral> {
    return this.http.post<IncidenciaGeneral>(`${this.apiUrl}/incidencias-generales`, incidencia);
  }

  updateIncidenciaGeneral(id: number, incidencia: Partial<IncidenciaGeneral>): Observable<IncidenciaGeneral> {
    return this.http.put<IncidenciaGeneral>(`${this.apiUrl}/incidencias-generales/${id}`, incidencia);
  }

  deleteIncidenciaGeneral(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/incidencias-generales/${id}`);
  }
}

