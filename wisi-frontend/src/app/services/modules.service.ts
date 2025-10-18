import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Module {
  id: number;
  nombre: string;
  icono: string;
  ruta: string;
  page_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ModulesService {
  private apiUrl = environment.apiUrl;
  private modulesSubject = new BehaviorSubject<Module[]>([]);
  public modules$ = this.modulesSubject.asObservable();

  constructor(private http: HttpClient) { }

  // Obtener todos los módulos
  getModules(): Observable<Module[]> {
    return this.http.get<Module[]>(`${this.apiUrl}/modules`);
  }

  // Cargar módulos y almacenarlos en el BehaviorSubject
  loadModules(): void {
    this.getModules().subscribe({
      next: (modules) => {
        this.modulesSubject.next(modules);
      },
      error: (error) => {
        console.error('Error al cargar módulos:', error);
      }
    });
  }

  // Obtener ID de módulo por nombre
  getModuleIdByName(moduleName: string): number | null {
    const modules = this.modulesSubject.value;
    const module = modules.find(m => m.nombre.toLowerCase() === moduleName.toLowerCase());
    return module ? module.id : null;
  }

  // Obtener ID de módulo por ruta
  getModuleIdByRoute(route: string): number | null {
    const modules = this.modulesSubject.value;
    const module = modules.find(m => m.ruta === route);
    return module ? module.id : null;
  }

  // Métodos específicos para cada módulo
  getLibrosModuleId(): number | null {
    return this.getModuleIdByName('Libro');
  }

  getLlavesModuleId(): number | null {
    return this.getModuleIdByName('Llaves');
  }

  getLlavesBorradasModuleId(): number | null {
    return this.getModuleIdByName('Llaves Borradas');
  }

  getMesasModuleId(): number | null {
    return this.getModuleIdByName('Mesas');
  }

  getJuegosModuleId(): number | null {
    return this.getModuleIdByName('Juegos');
  }

  getMaquinasModuleId(): number | null {
    return this.getModuleIdByName('Maquinas');
  }

  getRangosModuleId(): number | null {
    return this.getModuleIdByName('Rangos');
  }
}
