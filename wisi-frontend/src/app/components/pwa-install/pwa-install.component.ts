import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaService } from '../../services/pwa.service';

@Component({
  selector: 'app-pwa-install',
  imports: [CommonModule],
  standalone: true,
  template: `
    <div *ngIf="showInstallBanner" class="pwa-install-banner">
      <div class="banner-content">
        <div class="banner-icon">
          <i class="fas fa-download"></i>
        </div>
        <div class="banner-text">
          <h6>Instalar WISI System</h6>
          <p>Instala la aplicación para un acceso más rápido y funcionalidad offline</p>
        </div>
        <div class="banner-actions">
          <button class="btn btn-primary btn-sm" (click)="installApp()">
            Instalar
          </button>
          <button class="btn btn-outline-secondary btn-sm" (click)="dismissBanner()">
            Ahora no
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pwa-install-banner {
      position: fixed;
      bottom: 20px;
      left: 20px;
      right: 20px;
      background: linear-gradient(135deg, #007bff, #0056b3);
      color: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 123, 255, 0.3);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    }

    .banner-content {
      display: flex;
      align-items: center;
      padding: 16px;
      gap: 12px;
    }

    .banner-icon {
      font-size: 24px;
      color: #fff;
    }

    .banner-text {
      flex: 1;
    }

    .banner-text h6 {
      margin: 0 0 4px 0;
      font-weight: 600;
      font-size: 14px;
    }

    .banner-text p {
      margin: 0;
      font-size: 12px;
      opacity: 0.9;
    }

    .banner-actions {
      display: flex;
      gap: 8px;
    }

    .banner-actions .btn {
      font-size: 12px;
      padding: 6px 12px;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .pwa-install-banner {
        left: 10px;
        right: 10px;
        bottom: 10px;
      }
      
      .banner-content {
        flex-direction: column;
        text-align: center;
      }
      
      .banner-actions {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class PwaInstallComponent implements OnInit, OnDestroy {
  showInstallBanner = false;
  private deferredPrompt: any;

  constructor(private pwaService: PwaService) {}

  ngOnInit() {
    // Escuchar el evento beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.pwaService.setPromptEvent(e);
      this.showInstallBanner = true;
    });

    // Escuchar cambios de conectividad
    this.pwaService.onNetworkChange((isOnline) => {
      if (!isOnline) {
        this.showOfflineMessage();
      }
    });
  }

  ngOnDestroy() {
    window.removeEventListener('beforeinstallprompt', () => {});
  }

  async installApp() {
    const installed = await this.pwaService.installPwa();
    if (installed) {
      this.showInstallBanner = false;
    }
  }

  dismissBanner() {
    this.showInstallBanner = false;
    // No mostrar el banner por 7 días
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  }

  private showOfflineMessage() {
    // Mostrar mensaje de modo offline
    console.log('Aplicación en modo offline');
  }
}
