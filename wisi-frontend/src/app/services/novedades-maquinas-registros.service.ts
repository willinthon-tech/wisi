import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface NovedadMaquinaRegistro {
  id: number;
  libro_id: number;
  maquina_id: number;
  novedad_maquina_id: number;
  tecnico_id: number;
  hora: string;
  Maquina?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
  NovedadMaquina?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
  Tecnico?: {
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
export class NovedadesMaquinasRegistrosService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  getNovedadesMaquinasRegistros(libroId: number): Observable<NovedadMaquinaRegistro[]> {
    return this.http.get<NovedadMaquinaRegistro[]>(`${this.apiUrl}/novedades-maquinas-registros/${libroId}`);
  }

  createNovedadMaquinaRegistro(registroData: any): Observable<NovedadMaquinaRegistro> {
    return this.http.post<NovedadMaquinaRegistro>(`${this.apiUrl}/novedades-maquinas-registros`, registroData);
  }

  deleteNovedadMaquinaRegistro(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/novedades-maquinas-registros/${id}`);
  }
}

