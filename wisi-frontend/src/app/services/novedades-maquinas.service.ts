import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NovedadMaquina {
  id: number;
  nombre: string;
  activo: boolean;
  sala_id: number;
  created_at: string;
  updated_at: string;
  Sala?: {
    id: number;
    nombre: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class NovedadesMaquinasService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getNovedadesMaquinas(): Observable<NovedadMaquina[]> {
    return this.http.get<NovedadMaquina[]>(`${this.apiUrl}/novedades-maquinas`);
  }

  createNovedadMaquina(novedadData: any): Observable<NovedadMaquina> {
    return this.http.post<NovedadMaquina>(`${this.apiUrl}/novedades-maquinas`, novedadData);
  }

  updateNovedadMaquina(id: number, novedadData: any): Observable<NovedadMaquina> {
    return this.http.put<NovedadMaquina>(`${this.apiUrl}/novedades-maquinas/${id}`, novedadData);
  }

  deleteNovedadMaquina(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/novedades-maquinas/${id}`);
  }
}
