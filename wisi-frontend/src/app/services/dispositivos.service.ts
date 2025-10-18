import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DispositivosService {
  private apiUrl = `${environment.apiUrl}/dispositivos`;

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

  // Métodos para CRON global
  getCronConfig(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/cron/config`);
  }

  updateCronConfig(value: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/cron/config`, { value });
  }

  getQueueStatus(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/cron/queue-status`);
  }

  clearQueue(): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/cron/clear-queue`, {});
  }

  getSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/salas`);
  }

}





