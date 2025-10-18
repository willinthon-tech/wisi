import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MesasService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener todas las mesas
  getMesas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesas`);
  }

  // Obtener una mesa por ID
  getMesa(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mesas/${id}`);
  }

  // Crear una nueva mesa
  createMesa(mesa: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/mesas`, mesa);
  }

  // Actualizar una mesa
  updateMesa(id: number, mesa: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/mesas/${id}`, mesa);
  }

  // Eliminar una mesa
  deleteMesa(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/mesas/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }

  // Obtener juegos del usuario
  getUserJuegos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/juegos`);
  }

  // Obtener mesas borradas (activo = 0)
  getMesasBorradas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/mesas/borradas`);
  }

  // Borrar mesa (cambiar activo de 1 a 0 - soft delete)
  borrarMesa(mesaId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/mesas/${mesaId}/borrar`, {});
  }

  // Activar mesa (cambiar activo de 0 a 1)
  activarMesa(mesaId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/mesas/${mesaId}/activar`, {});
  }
}
