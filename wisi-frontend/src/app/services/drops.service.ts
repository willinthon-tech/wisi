import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Drop {
  id: number;
  mesa_id: number;
  denominacion_100: number;
  denominacion_50: number;
  denominacion_20: number;
  denominacion_10: number;
  denominacion_5: number;
  denominacion_1: number;
  total: number;
  Mesa?: {
    id: number;
    nombre: string;
  };
}

export interface Mesa {
  id: number;
  nombre: string;
  Juego?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class DropsService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getDrops(libroId: number): Observable<Drop[]> {
    return this.http.get<Drop[]>(`${this.apiUrl}/drops/${libroId}`);
  }

  getUserMesas(): Observable<Mesa[]> {
    return this.http.get<Mesa[]>(`${this.apiUrl}/user/mesas`);
  }

  createOrUpdateDrop(dropData: any): Observable<Drop> {
    return this.http.post<Drop>(`${this.apiUrl}/drops`, dropData);
  }

  deleteDrop(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/drops/${id}`);
  }
}
