import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Definimos la estructura del feriado para que TypeScript nos ayude
export interface Feriado {
  id?: number;
  nombre: string;
  sala_id: number | null;
  dia: number; // Nuevo campo
  mes: number; // Nuevo campo
  created_at?: Date;
  updated_at?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FeriadosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getFeriados(): Observable<Feriado[]> {
    return this.http.get<Feriado[]>(`${this.apiUrl}/feriados`);
  }

  getFeriado(id: number): Observable<Feriado> {
    return this.http.get<Feriado>(`${this.apiUrl}/feriados/${id}`);
  }

  // El payload ahora debe ser { nombre, sala_id, dia, mes }
  createFeriado(payload: Feriado): Observable<Feriado> {
    return this.http.post<Feriado>(`${this.apiUrl}/feriados`, payload);
  }

  updateFeriado(id: number, payload: Partial<Feriado>): Observable<Feriado> {
    return this.http.put<Feriado>(`${this.apiUrl}/feriados/${id}`, payload);
  }

  deleteFeriado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/feriados/${id}`);
  }
}