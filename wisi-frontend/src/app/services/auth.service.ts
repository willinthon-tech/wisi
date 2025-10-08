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
    // Verificar si hay un token guardado al inicializar
    this.initializeAuth();
  }

  private initializeAuth(): void {
    const token = this.tokenService.getToken();
    if (token) {
      this.verifyToken();
    } else {
      this.currentUserSubject.next(null);
    }
  }

  login(usuario: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      usuario,
      password
    }).pipe(
      tap(response => {
        if (response.token) {
          this.tokenService.setToken(response.token);
          this.currentUserSubject.next(response.user);
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
      this.http.get(`${this.apiUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (response) => {
        },
        error: (error) => {
        }
      });
    } else {
    }
  }

  private verifyToken(): void {
    const token = this.getToken();
    if (!token) {
      this.currentUserSubject.next(null);
      return;
    }

    
    this.http.get(`${this.apiUrl}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: (response: any) => {
        if (response && response.valid && response.user) {
          this.currentUserSubject.next(response.user);
        } else {
          this.logout();
        }
      },
      error: (error) => {
        this.logout();
      }
    });
  }
}

