import { Component } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { NavbarComponent } from './components/shared/navbar/navbar.component';
import { ErrorModalComponent } from './components/shared/error-modal/error-modal.component';
import { ConfirmModalComponent } from './components/shared/confirm-modal/confirm-modal.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, ErrorModalComponent, ConfirmModalComponent, CommonModule],
  template: `
    <app-navbar *ngIf="!isLoginPage"></app-navbar>
    <router-outlet></router-outlet>
    <app-error-modal></app-error-modal>
    <app-confirm-modal></app-confirm-modal>
  `,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
  `]
})
export class AppComponent {
  title = 'Sistema WISI';
  
  constructor(private router: Router) {}
  
  get isLoginPage(): boolean {
    return this.router.url === '/login' || this.router.url.startsWith('/reporte-cecom/');
  }
}
