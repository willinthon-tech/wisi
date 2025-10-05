import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class HikConnectService {
  private baseUrl = 'https://api.hik-connect.com/api/v1';
  private accessToken: string = '';

  constructor(private http: HttpClient) {}

  // Autenticación con Hik-Connect
  authenticate(clientId: string, clientSecret: string): Observable<any> {
    const body = {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'device:read user:read event:read photo:read'
    };

    return this.http.post(`${this.baseUrl}/oauth/token`, body).pipe(
      map((response: any) => {
        this.accessToken = response.access_token;
        return response;
      }),
      catchError(error => {
        console.error('Error authenticating with Hik-Connect:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener lista de dispositivos
  getDevices(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/devices`, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error getting devices:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener usuarios de un dispositivo específico
  getDeviceUsers(deviceId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/devices/${deviceId}/users`, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error getting device users:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener eventos de un dispositivo
  getDeviceEvents(deviceId: string, startTime?: string, endTime?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    let url = `${this.baseUrl}/devices/${deviceId}/events`;
    
    if (startTime && endTime) {
      url += `?startTime=${startTime}&endTime=${endTime}`;
    }

    return this.http.get(url, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error getting device events:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener fotos de usuarios
  getUserPhotos(deviceId: string, userId?: string): Observable<any> {
    const headers = this.getAuthHeaders();
    let url = `${this.baseUrl}/devices/${deviceId}/photos`;
    
    if (userId) {
      url += `?userId=${userId}`;
    }

    return this.http.get(url, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error getting user photos:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Sincronizar datos de un dispositivo
  syncDeviceData(deviceId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.post(`${this.baseUrl}/devices/${deviceId}/sync`, {}, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error syncing device data:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener información del dispositivo
  getDeviceInfo(deviceId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/devices/${deviceId}`, { headers }).pipe(
      map((response: any) => ({
        success: true,
        data: response.data || response
      })),
      catchError(error => {
        console.error('Error getting device info:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  // Headers de autenticación
  private getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // Verificar si está autenticado
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  // Cerrar sesión
  logout(): void {
    this.accessToken = '';
  }
}



