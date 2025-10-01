import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TokenService } from './token.service';

export interface User {
  id: number;
  nombre_apellido: string;
  usuario: string;
  nivel: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
  salas: any[];
  modules: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private tokenService: TokenService
  ) {
    console.log('AuthService inicializado');
    // Verificar si hay un token guardado al inicializar
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.tokenService.getToken();
    console.log('🔍 Inicializando autenticación...');
    console.log('Token encontrado en localStorage:', !!token);
    if (token) {
      console.log('✅ Token encontrado, verificando...');
      this.verifyToken();
    } else {
      console.log('❌ No hay token, usuario no autenticado');
      this.currentUserSubject.next(null);
    }
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    console.log('Intentando login para usuario:', usuario);
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      usuario,
      password
    }).pipe(
      tap(response => {
        console.log('Respuesta de login:', response);
        if (response.token) {
          this.tokenService.setToken(response.token);
          this.currentUserSubject.next(response.user);
          console.log('Usuario autenticado:', response.user);
        }
      })
    );
  }

  logout(): void {
    this.tokenService.removeToken();
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return this.tokenService.getToken();
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Método de prueba para verificar el endpoint
  testVerifyEndpoint(): void {
    const token = this.getToken();
    if (token) {
      console.log('Probando endpoint de verificación...');
      this.http.get(`${this.apiUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
          console.log('✅ Endpoint funciona:', response);
        },
        error: (error) => {
          console.error('❌ Error en endpoint:', error);
        }
      });
    } else {
      console.log('No hay token para probar');
    }
  }

  private verifyToken(): void {
    const token = this.getToken();
    if (!token) {
      console.log('❌ No hay token para verificar');
      this.currentUserSubject.next(null);
      return;
    }

    console.log('🔍 Verificando token existente...');
    console.log('🔍 Token:', token);
    console.log('🔍 URL de verificación:', `${this.apiUrl}/auth/verify`);
    
    this.http.get(`${this.apiUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        console.log('🔍 Respuesta de verificación:', response);
        if (response && response.valid && response.user) {
          console.log('✅ Token válido, restaurando usuario:', response.user);
          console.log('👤 Nombre del usuario:', response.user.nombre_apellido);
          this.currentUserSubject.next(response.user);
        } else {
          console.log('❌ Token inválido o respuesta incorrecta, cerrando sesión');
          console.log('❌ Response:', response);
          this.logout();
        }
      },
      error: (error) => {
        console.error('❌ Error verificando token:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.log('❌ Error en verificación, cerrando sesión');
        this.logout();
      }
    });
  }
}

