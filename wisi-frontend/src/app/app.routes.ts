import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'menu',
    loadComponent: () => import('./components/user-menu/user-menu.component').then(m => m.UserMenuComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'rrhh',
    loadComponent: () => import('./components/rrhh/rrhh.component').then(m => m.RrhhComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'areas',
    loadComponent: () => import('./components/areas/areas-list/areas-list.component').then(m => m.AreasListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'departamentos',
    loadComponent: () => import('./components/departamentos/departamentos-list/departamentos-list.component').then(m => m.DepartamentosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cargos',
    loadComponent: () => import('./components/cargos/cargos-list/cargos-list.component').then(m => m.CargosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'empleados',
    loadComponent: () => import('./components/empleados/empleados-list/empleados-list.component').then(m => m.EmpleadosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'empleados/user/:id/tareas',
    loadComponent: () => import('./components/tareas/tareas-list/tareas-list.component').then(m => m.TareasListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'marcajes',
    loadComponent: () => import('./components/marcajes/marcajes-list/marcajes-list.component').then(m => m.MarcajesListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'horarios',
    loadComponent: () => import('./components/horarios/horarios-list/horarios-list.component').then(m => m.HorariosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'maquinas',
    loadComponent: () => import('./components/maquinas/maquinas.component').then(m => m.MaquinasComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'cecom',
    loadComponent: () => import('./components/cecom/cecom.component').then(m => m.CecomComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'libros',
    loadComponent: () => import('./components/libros/libros-list/libros-list.component').then(m => m.LibrosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'drop-mesas/:libroId/:salaId',
    loadComponent: () => import('./components/libros/drop-mesas/drop-mesas.component').then(m => m.DropMesasComponent),
    canActivate: [AuthGuard]
  },
    {
      path: 'novedades-maquinas/:libroId/:salaId',
      loadComponent: () => import('./components/libros/novedades-maquinas/novedades-maquinas.component').then(m => m.NovedadesMaquinasComponent),
      canActivate: [AuthGuard]
    },
    {
      path: 'incidencias-generales/:libroId/:salaId',
      loadComponent: () => import('./components/libros/incidencias-generales/incidencias-generales.component').then(m => m.IncidenciasGeneralesComponent),
      canActivate: [AuthGuard]
    },
  {
    path: 'reporte-cecom/:libroId',
    loadComponent: () => import('./components/libros/reporte-cecom/reporte-cecom.component').then(m => m.ReporteCecomComponent)
  },
  {
    path: 'gestion-de-rangos',
    loadComponent: () => import('./components/rangos/rangos-list/rangos-list.component').then(m => m.RangosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-de-mesas',
    loadComponent: () => import('./components/mesas/mesas-list/mesas-list.component').then(m => m.MesasListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-de-juegos',
    loadComponent: () => import('./components/juegos/juegos-list/juegos-list.component').then(m => m.JuegosListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'gestion-de-maquinas',
    loadComponent: () => import('./components/maquinas/maquinas-list/maquinas-list.component').then(m => m.MaquinasListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'page/:id',
    loadComponent: () => import('./components/page-view/page-view.component').then(m => m.PageViewComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'super-config',
    loadComponent: () => import('./components/super-config/super-config.component').then(m => m.SuperConfigComponent),
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'salas',
        pathMatch: 'full'
      },
      {
        path: 'salas',
        loadComponent: () => import('./components/super-config/salas/salas-list/salas-list.component').then(m => m.SalasListComponent)
      },
      {
        path: 'salas/crear',
        loadComponent: () => import('./components/super-config/salas/sala-create/sala-create.component').then(m => m.SalaCreateComponent)
      },
      {
        path: 'salas/editar/:id',
        loadComponent: () => import('./components/super-config/salas/sala-edit/sala-edit.component').then(m => m.SalaEditComponent)
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./components/super-config/usuarios/usuarios-list/usuarios-list.component').then(m => m.UsuariosListComponent)
      },
      {
        path: 'usuarios/crear',
        loadComponent: () => import('./components/super-config/usuarios/usuario-create/usuario-create.component').then(m => m.UsuarioCreateComponent)
      },
      {
        path: 'usuarios/editar/:id',
        loadComponent: () => import('./components/super-config/usuarios/usuario-edit/usuario-edit.component').then(m => m.UsuarioEditComponent)
      },
      {
        path: 'modulos',
        loadComponent: () => import('./components/super-config/modulos/modulos-list/modulos-list.component').then(m => m.ModulosListComponent)
      },
      {
        path: 'modulos/crear',
        loadComponent: () => import('./components/super-config/modulos/modulo-create/modulo-create.component').then(m => m.ModuloCreateComponent)
      },
      {
        path: 'modulos/editar/:id',
        loadComponent: () => import('./components/super-config/modulos/modulo-edit/modulo-edit.component').then(m => m.ModuloEditComponent)
      },
      {
        path: 'permisos',
        loadComponent: () => import('./components/super-config/permisos/permisos-list/permisos-list.component').then(m => m.PermisosListComponent)
      },
      {
        path: 'permisos/crear',
        loadComponent: () => import('./components/super-config/permisos/permiso-create/permiso-create.component').then(m => m.PermisoCreateComponent)
      },
      {
        path: 'permisos/editar/:id',
        loadComponent: () => import('./components/super-config/permisos/permiso-edit/permiso-edit.component').then(m => m.PermisoEditComponent)
      },
      {
        path: 'paginas',
        loadComponent: () => import('./components/super-config/paginas/paginas-list/paginas-list.component').then(m => m.PaginasListComponent)
      },
      {
        path: 'paginas/crear',
        loadComponent: () => import('./components/super-config/paginas/pagina-create/pagina-create.component').then(m => m.PaginaCreateComponent)
      },
      {
        path: 'paginas/editar/:id',
        loadComponent: () => import('./components/super-config/paginas/pagina-edit/pagina-edit.component').then(m => m.PaginaEditComponent)
      },
      {
        path: 'dispositivos',
        loadComponent: () => import('./components/dispositivos/dispositivos-list/dispositivos-list.component').then(m => m.DispositivosListComponent)
      },
      {
        path: 'dispositivos/crear',
        loadComponent: () => import('./components/dispositivos/dispositivos-form/dispositivos-form.component').then(m => m.DispositivosFormComponent)
      },
      {
        path: 'dispositivos/editar/:id',
        loadComponent: () => import('./components/dispositivos/dispositivos-form/dispositivos-form.component').then(m => m.DispositivosFormComponent)
      }]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
