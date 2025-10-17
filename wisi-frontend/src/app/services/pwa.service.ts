import { Injectable } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PwaService {
  private promptEvent: any;

  constructor(private swUpdate: SwUpdate) {
    this.checkForUpdates();
  }

  // Verificar actualizaciones
  private checkForUpdates() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
          map(evt => ({
            type: 'UPDATE_AVAILABLE',
            current: evt.currentVersion,
            available: evt.latestVersion,
          }))
        )
        .subscribe(() => {
          this.showUpdateNotification();
        });
    }
  }

  // Mostrar notificación de actualización
  private showUpdateNotification() {
    if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar?')) {
      this.doAppUpdate();
    }
  }

  // Actualizar la aplicación
  public doAppUpdate() {
    this.swUpdate.activateUpdate().then(() => {
      document.location.reload();
    });
  }

  // Instalar PWA
  public async installPwa(): Promise<boolean> {
    if (this.promptEvent) {
      this.promptEvent.prompt();
      const result = await this.promptEvent.userChoice;
      this.promptEvent = null;
      return result.outcome === 'accepted';
    }
    return false;
  }

  // Verificar si se puede instalar
  public canInstall(): boolean {
    return !!this.promptEvent;
  }

  // Configurar el evento de instalación
  public setPromptEvent(event: any) {
    this.promptEvent = event;
  }

  // Verificar si está en modo offline
  public isOnline(): boolean {
    return navigator.onLine;
  }

  // Manejar cambios de conectividad
  public onNetworkChange(callback: (isOnline: boolean) => void) {
    window.addEventListener('online', () => callback(true));
    window.addEventListener('offline', () => callback(false));
  }
}
