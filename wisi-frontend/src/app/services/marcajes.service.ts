import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Marcaje {
  id: number;
  dispositivo_id: number;
  employee_no: string;
  event_time: string;
  nombre: string;
  created_at: string;
  updated_at: string;
  Dispositivo?: {
    id: number;
    nombre: string;
    ip_remota: string;
  };
}

export interface MarcajesResponse {
  attlogs: Marcaje[];
  total: number;
  page: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class MarcajesService {
  private apiUrl = `${environment.apiUrl}/attlogs`;

  constructor(private http: HttpClient) {}

  getMarcajes(filtros?: {
    dispositivo_id?: string;
    employee_no?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    limit?: number;
  }): Observable<MarcajesResponse> {
    let params: any = {};
    
    if (filtros) {
      if (filtros.dispositivo_id) params.dispositivo_id = filtros.dispositivo_id;
      if (filtros.employee_no) params.employee_no = filtros.employee_no;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
      if (filtros.page) params.page = filtros.page;
      if (filtros.limit) params.limit = filtros.limit;
    }

    return this.http.get<MarcajesResponse>(this.apiUrl, { params });
  }

  getMarcaje(id: number): Observable<Marcaje> {
    return this.http.get<Marcaje>(`${this.apiUrl}/${id}`);
  }

  getMarcajeImage(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/image`, { 
      responseType: 'blob',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
}
