import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class NovedadesMesasRegistrosService {
  private apiUrl = `${environment.apiUrl}/novedades-mesas-registros`;

  constructor(private http: HttpClient) { }

  getNovedadesMesaRegistros(libroId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/libro/${libroId}`);
  }

  createNovedadMesaRegistro(novedadData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, novedadData);
  }

  updateNovedadMesaRegistro(id: number, novedadData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, novedadData);
  }

  deleteNovedadMesaRegistro(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
