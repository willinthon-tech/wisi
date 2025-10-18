import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TareasAutomaticasService {
  private baseUrl = `${environment.apiUrl}/tareas-dispositivo-usuarios`;

  constructor(private http: HttpClient) {}

  // Crear tarea individual
  createTarea(tarea: any): Observable<any> {
    return this.http.post(this.baseUrl, tarea);
  }

  // Crear múltiples tareas
  createMultipleTareas(tareas: any[]): Observable<any> {
    const promises = tareas.map(tarea => this.createTarea(tarea).toPromise());
    return new Observable(observer => {
      Promise.all(promises)
        .then(results => {
          observer.next(results);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  // Obtener dispositivos por IDs
  getDispositivosByIds(dispositivoIds: number[]): Observable<any[]> {
    return this.http.post<any[]>(`${environment.apiUrl}/dispositivos/by-ids`, { ids: dispositivoIds });
  }

  // Obtener empleado por ID
  getEmpleadoById(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/empleados/${id}`);
  }
}
