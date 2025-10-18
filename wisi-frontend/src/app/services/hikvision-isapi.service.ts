import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HikvisionIsapiService {
  private baseUrl = `${environment.apiUrl}/hikvision`;

  constructor(private http: HttpClient) { }

  // Probar conexión con el biométrico
  testConnection(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/test-connection`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener información del dispositivo
  getDeviceInfo(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/device-info`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener usuarios registrados
  getUsers(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/users`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener eventos de acceso
  getEvents(ip: string, usuario: string, clave: string, startTime?: string, endTime?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/events`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      startTime: startTime,
      endTime: endTime
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener fotos registradas
  getPhotos(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/photos`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Sincronizar datos
  syncData(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/sync`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener foto del usuario
  getUserPhoto(ip: string, usuario: string, clave: string, fpid: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user-photo`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      fpid: fpid
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Descubrir endpoints disponibles
  discoverEndpoints(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/discover`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener capacidades de usuarios
  getUserCapabilities(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/user-capabilities`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener capacidades del dispositivo
  getDeviceCapabilities(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/device-capabilities`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener stream de cámara
  getCameraStream(ip: string, usuario: string, clave: string, streamType: string = 'preview'): Observable<any> {
    return this.http.post(`${this.baseUrl}/camera-stream`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      streamType: streamType
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Descubrir canales de streaming
  discoverStreamingChannels(ip: string, usuario: string, clave: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/discover-channels`, {
      ip: ip,
      usuario: usuario,
      clave: clave
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Obtener información específica de un usuario
  getUserInfo(ip: string, usuario: string, clave: string, employeeNo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/get-user-info`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Eliminar rostro de usuario
  deleteUserFace(ip: string, usuario: string, clave: string, employeeNo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete-user-face`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }


  // Eliminar usuario completo
  deleteUser(ip: string, usuario: string, clave: string, employeeNo: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete-user`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Registrar rostro de usuario
  registerUserFace(ip: string, usuario: string, clave: string, employeeNo: string, name: string, gender: string, faceDataBase64: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register-user-face`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo,
      name: name,
      gender: gender,
      faceDataBase64: faceDataBase64
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Registrar rostro de usuario con payload completo
  registerUserFaceWithPayload(ip: string, usuario: string, clave: string, facePayload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/register-user-face-payload`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      facePayload: facePayload
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }


  // Registrar rostro de usuario con base64 comprimido
  registerUserFaceWithCompressedBase64(ip: string, usuario: string, clave: string, employeeNo: string, name: string, gender: string, compressedBase64: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register-user-face-compressed`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo,
      name: name,
      gender: gender,
      compressedBase64: compressedBase64
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Registrar rostro de usuario con URL externa (recomendado)
  registerUserFaceWithURL(ip: string, usuario: string, clave: string, employeeNo: string, name: string, gender: string, imageBase64: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register-user-face-url`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo,
      name: name,
      gender: gender,
      imageBase64: imageBase64
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Registrar rostro de usuario con ImgBB (URL pública gratuita)
  registerUserFaceWithImgBB(ip: string, usuario: string, clave: string, employeeNo: string, name: string, gender: string, imageBase64: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/register-user-face-imgbb`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      employeeNo: employeeNo,
      name: name,
      gender: gender,
      imageBase64: imageBase64
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Actualizar usuario
  updateUser(ip: string, usuario: string, clave: string, userData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/update-user`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      userData: userData
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }

  // Eliminar solo la foto del usuario
  deleteUserPhotoOnly(ip: string, usuario: string, clave: string, deletePhotoPayload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/delete-user-photo-only`, {
      ip: ip,
      usuario: usuario,
      clave: clave,
      deletePhotoPayload: deletePhotoPayload
    }).pipe(
      catchError(error => {
        return of({ success: false, error: error.message });
      })
    );
  }
}

