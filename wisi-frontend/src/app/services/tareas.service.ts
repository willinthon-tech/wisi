import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TareasService {
  private baseUrl = '/api/tareas-dispositivo-usuarios';

  constructor(private http: HttpClient) {}

  // Obtener tareas por usuario
  getTareasByUser(userId: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/user/${userId}`);
  }

  // Obtener todas las tareas
  getTareas(): Observable<any> {
    return this.http.get(this.baseUrl);
  }

  // Crear nueva tarea
  createTarea(tarea: any): Observable<any> {
    return this.http.post(this.baseUrl, tarea);
  }

  // Actualizar tarea
  updateTarea(id: number, tarea: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}`, tarea);
  }

  // Eliminar tarea
  deleteTarea(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${id}`);
  }
}
