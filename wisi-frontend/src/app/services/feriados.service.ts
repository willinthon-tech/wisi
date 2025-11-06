import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FeriadosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // CRUD Feriados
  getFeriados(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/feriados`);
  }

  getFeriado(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/feriados/${id}`);
  }

  createFeriado(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/feriados`, payload);
  }

  updateFeriado(id: number, payload: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/feriados/${id}`, payload);
  }

  deleteFeriado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/feriados/${id}`);
  }
}


