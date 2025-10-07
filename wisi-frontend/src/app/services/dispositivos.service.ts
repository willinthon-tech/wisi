import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DispositivosService {
  private apiUrl = 'http://localhost:3000/api/dispositivos';

  constructor(private http: HttpClient) { }

  getDispositivos(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getDispositivo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createDispositivo(dispositivo: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, dispositivo);
  }

  updateDispositivo(id: number, dispositivo: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, dispositivo);
  }

  deleteDispositivo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getSalas(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3000/api/salas');
  }
}





