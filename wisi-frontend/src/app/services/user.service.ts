import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  nombre_apellido: string;
  usuario: string;
  password?: string;
  password_plain?: string;
  nivel: string;
  Salas?: any[];
  Modules?: any[];
  Permissions?: any[];
  UserModulePermissions?: any[];
}

export interface ModulePermission {
  moduleId: number;
  permissions: number[];
}

export interface CreateUserRequest {
  nombre_apellido: string;
  usuario: string;
  password: string;
  nivel: string;
  salas: number[];
  modulePermissions: ModulePermission[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(userData: CreateUserRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/users`, userData);
  }

  updateUserSalas(userId: number, salas: number[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/salas`, { salas });
  }

  updateUserAssignments(userId: number, assignments: { salas: number[], modulePermissions: ModulePermission[] }): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/assignments`, assignments);
  }

  updateUser(userId: number, userData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}`, userData);
  }

  deleteUser(userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}`);
  }

  getSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salas`);
  }

  createSala(salaData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/salas`, salaData);
  }

  updateSala(salaId: number, salaData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/salas/${salaId}`, salaData);
  }

  deleteSala(salaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/salas/${salaId}`);
  }

  getModules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/modules`);
  }

  getAllModules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/modules/all`);
  }

  createModule(moduleData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/modules`, moduleData);
  }

  updateModule(moduleId: number, moduleData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/modules/${moduleId}`, moduleData);
  }

  deleteModule(moduleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/modules/${moduleId}`);
  }

  // Métodos de páginas
  getPages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pages`);
  }

  getAllPages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/pages/all`);
  }

  createPage(pageData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/pages`, pageData);
  }

  updatePage(pageId: number, pageData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/pages/${pageId}`, pageData);
  }

  deletePage(pageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/pages/${pageId}`);
  }

  getUserMenu(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/menu`);
  }

  getPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/permissions`);
  }

  createPermission(permissionData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/permissions`, permissionData);
  }

  updatePermission(permissionId: number, permissionData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/permissions/${permissionId}`, permissionData);
  }

  deletePermission(permissionId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/permissions/${permissionId}`);
  }

  getUserModules(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/modules`);
  }

  getUserSalas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user/salas`);
  }
}
