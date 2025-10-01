import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { AuthService } from './services/auth.service';
import { UserService } from './services/user.service';
import { LibroService } from './services/libro.service';
import { RangosService } from './services/rangos.service';
import { MesasService } from './services/mesas.service';
import { JuegosService } from './services/juegos.service';
import { MaquinasService } from './services/maquinas.service';
import { TecnicosService } from './services/tecnicos.service';
import { NovedadesMaquinasService } from './services/novedades-maquinas.service';
import { NovedadesMaquinasRegistrosService } from './services/novedades-maquinas-registros.service';
import { IncidenciasGeneralesService } from './services/incidencias-generales.service';
import { DropsService } from './services/drops.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    importProvidersFrom(FormsModule),
    AuthService,
    UserService,
    LibroService,
    RangosService,
    MesasService,
    JuegosService,
    MaquinasService,
    TecnicosService,
    NovedadesMaquinasService,
    NovedadesMaquinasRegistrosService,
    IncidenciasGeneralesService,
    DropsService
  ]
};
