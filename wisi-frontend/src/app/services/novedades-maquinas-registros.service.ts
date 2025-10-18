import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface NovedadMaquinaRegistro {
  id: number;
  libro_id: number;
  maquina_id: number;
  descripcion: string;
  empleado_id: number;
  hora: string;
  Maquina?: {
    id: number;
    nombre: string;
    Sala?: {
      id: number;
      nombre: string;
    };
  };
  Empleado?: {
    id: number;
    nombre: string;
    cargo_id: number;
    Cargo?: {
      id: number;
      nombre: string;
      Departamento?: {
        id: number;
        nombre: string;
        Area?: {
          id: number;
          nombre: string;
          Sala?: {
            id: number;
            nombre: string;
          };
        };
      };
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class NovedadesMaquinasRegistrosService {
  private apiUrl = environment.apiUrl;

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

