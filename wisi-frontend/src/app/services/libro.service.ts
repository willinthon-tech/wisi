import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LibroService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  // Obtener todos los libros
  getLibros(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/libros`);
  }

  // Obtener un libro por ID
  getLibro(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/libros/${id}`);
  }

  // Crear un nuevo libro
  createLibro(libro: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/libros`, libro);
  }

  // Actualizar un libro
  updateLibro(id: number, libro: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/libros/${id}`, libro);
  }

  // Eliminar un libro
  deleteLibro(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/libros/${id}`);
  }

  // Obtener salas del usuario
  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}
