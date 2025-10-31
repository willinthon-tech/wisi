import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PlantillasHorariosService {
  private apiUrl = `${environment.apiUrl}/plantillas-horarios`;

  constructor(private http: HttpClient) { }

  // Obtener todas las plantillas horarios
  getPlantillasHorarios(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Obtener una plantilla horario específica
  getPlantillaHorario(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  // Crear una nueva plantilla horario
  createPlantillaHorario(plantillaData: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, plantillaData);
  }

  // Actualizar una plantilla horario
  updatePlantillaHorario(id: number, plantillaData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, plantillaData);
  }

  // Eliminar una plantilla horario
  deletePlantillaHorario(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Obtener plantillas horarios por sala
  getPlantillasHorariosBySala(salaId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sala/${salaId}`);
  }
}

