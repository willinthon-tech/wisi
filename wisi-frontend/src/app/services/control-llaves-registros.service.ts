import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ControlLlavesRegistrosService {
  private apiUrl = `${environment.apiUrl}/control-llaves-registros`;

  constructor(private http: HttpClient) { }

  getControlLlaveRegistros(libroId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${libroId}`);
  }

  createControlLlaveRegistro(controlData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, controlData);
  }

  updateControlLlaveRegistro(id: number, controlData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, controlData);
  }

  deleteControlLlaveRegistro(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
