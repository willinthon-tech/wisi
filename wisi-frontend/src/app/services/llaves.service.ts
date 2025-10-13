import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LlavesService {
  private apiUrl = `${environment.apiUrl}/llaves`;

  constructor(private http: HttpClient) { }

  getLlaves(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getLlave(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  createLlave(llave: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, llave);
  }

  updateLlave(id: number, llave: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, llave);
  }

  deleteLlave(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getLlavesBorradas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/borradas`);
  }

  borrarLlave(llaveId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${llaveId}/borrar`, {});
  }

  activarLlave(llaveId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${llaveId}/activar`, {});
  }
}
