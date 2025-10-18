import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class JuegosService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // Obtener todos los juegos
  getJuegos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/juegos`);
  }

  // Obtener un juego por ID
  getJuego(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/juegos/${id}`);
  }

  // Crear un nuevo juego
  createJuego(juego: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/juegos`, juego);
  }

  // Actualizar un juego
  updateJuego(id: number, juego: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/juegos/${id}`, juego);
  }

  // Eliminar un juego
  deleteJuego(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/juegos/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}

