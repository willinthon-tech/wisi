import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExcepcionesHorariosService {
  private baseUrl = `${environment.apiUrl}/horarios/excepciones`;

  constructor(private http: HttpClient) {}

  listar(empleadoId?: number, desde?: string, hasta?: string) {
    let params = new HttpParams();
    if (empleadoId) params = params.set('empleado_id', empleadoId.toString());
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<any[]>(this.baseUrl, { params });
  }

  crear(payload: { empleado_id: number; fecha: string; plantilla_horario_id: number; motivo?: string; }) {
    return this.http.post<any>(this.baseUrl, payload);
  }

  actualizar(id: number, payload: { plantilla_horario_id?: number; motivo?: string; }) {
    return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}













