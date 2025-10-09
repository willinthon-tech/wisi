const { Sequelize } = require('sequelize');
const path = require('path');

// Configuración de Sequelize con SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: false, // Cambiar a console.log para ver las consultas SQL
});

// Importar modelos
const User = require('./User')(sequelize);
const Sala = require('./Sala')(sequelize);
const Module = require('./Module')(sequelize);
const Permission = require('./Permission')(sequelize);
const Page = require('./Page')(sequelize);
const UserSala = require('./UserSala')(sequelize);
const UserModule = require('./UserModule')(sequelize);
const UserPermission = require('./UserPermission')(sequelize);
const UserModulePermission = require('./UserModulePermission')(sequelize);
const PageModule = require('./PageModule')(sequelize);
const SalaModule = require('./SalaModule')(sequelize);
const Libro = require('./Libro')(sequelize);
const Rango = require('./Rango')(sequelize);
const Mesa = require('./Mesa')(sequelize);
const Juego = require('./Juego')(sequelize);
const Maquina = require('./Maquina')(sequelize);
const Drop = require('./Drop')(sequelize);
const Attlog = require('./Attlog')(sequelize);

// Definir asociaciones
User.belongsToMany(Sala, { through: UserSala, foreignKey: 'user_id' });
Sala.belongsToMany(User, { through: UserSala, foreignKey: 'sala_id' });

// Asociaciones para UserSala
UserSala.belongsTo(User, { foreignKey: 'user_id' });
UserSala.belongsTo(Sala, { foreignKey: 'sala_id' });
User.hasMany(UserSala, { foreignKey: 'user_id' });
Sala.hasMany(UserSala, { foreignKey: 'sala_id' });

User.belongsToMany(Module, { through: UserModule, foreignKey: 'user_id' });
Module.belongsToMany(User, { through: UserModule, foreignKey: 'module_id' });

// Asociaciones para UserModule
UserModule.belongsTo(User, { foreignKey: 'user_id' });
UserModule.belongsTo(Module, { foreignKey: 'module_id' });
User.hasMany(UserModule, { foreignKey: 'user_id' });
Module.hasMany(UserModule, { foreignKey: 'module_id' });

User.belongsToMany(Permission, { through: UserPermission, foreignKey: 'user_id' });
Permission.belongsToMany(User, { through: UserPermission, foreignKey: 'permission_id' });

// Asociaciones para UserPermission
UserPermission.belongsTo(User, { foreignKey: 'user_id' });
UserPermission.belongsTo(Permission, { foreignKey: 'permission_id' });
User.hasMany(UserPermission, { foreignKey: 'user_id' });
Permission.hasMany(UserPermission, { foreignKey: 'permission_id' });

// Nuevas relaciones para permisos por módulo
UserModulePermission.belongsTo(User, { foreignKey: 'user_id' });
UserModulePermission.belongsTo(Module, { foreignKey: 'module_id' });
UserModulePermission.belongsTo(Permission, { foreignKey: 'permission_id' });

User.hasMany(UserModulePermission, { foreignKey: 'user_id' });
Module.hasMany(UserModulePermission, { foreignKey: 'module_id' });
Permission.hasMany(UserModulePermission, { foreignKey: 'permission_id' });

// Asociaciones para Page y Module (relación uno a muchos)
Page.hasMany(Module, { foreignKey: 'page_id' });
Module.belongsTo(Page, { foreignKey: 'page_id' });

Sala.belongsToMany(Module, { through: SalaModule, foreignKey: 'sala_id' });
Module.belongsToMany(Sala, { through: SalaModule, foreignKey: 'module_id' });

// Asociaciones para Libro
Libro.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Libro, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Rango
Rango.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Rango, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Mesa
Mesa.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Mesa, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Mesa.belongsTo(Juego, { foreignKey: 'juego_id', onDelete: 'RESTRICT' });
Juego.hasMany(Mesa, { foreignKey: 'juego_id', onDelete: 'RESTRICT' });

// Asociaciones para Juego
Juego.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Juego, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Maquina
Maquina.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Maquina, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Maquina.belongsTo(Rango, { foreignKey: 'rango_id', onDelete: 'RESTRICT' });
Rango.hasMany(Maquina, { foreignKey: 'rango_id', onDelete: 'RESTRICT' });



// Importar NovedadMaquinaRegistro
const NovedadMaquinaRegistro = require('./NovedadMaquinaRegistro')(sequelize);
const IncidenciaGeneral = require('./IncidenciaGeneral')(sequelize);
const Area = require('./Area')(sequelize);
const Departamento = require('./Departamento')(sequelize);
const Cargo = require('./Cargo')(sequelize);
const Empleado = require('./Empleado')(sequelize);
const Horario = require('./Horario')(sequelize);
const Bloque = require('./Bloque')(sequelize);
const Dispositivo = require('./Dispositivo')(sequelize);
const Cron = require('./Cron')(sequelize);

// Asociaciones para NovedadMaquinaRegistro
NovedadMaquinaRegistro.belongsTo(Libro, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });
Libro.hasMany(NovedadMaquinaRegistro, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });

NovedadMaquinaRegistro.belongsTo(Maquina, { foreignKey: 'maquina_id', onDelete: 'RESTRICT' });
Maquina.hasMany(NovedadMaquinaRegistro, { foreignKey: 'maquina_id', onDelete: 'RESTRICT' });


NovedadMaquinaRegistro.belongsTo(Empleado, { foreignKey: 'empleado_id', onDelete: 'RESTRICT' });
Empleado.hasMany(NovedadMaquinaRegistro, { foreignKey: 'empleado_id', onDelete: 'RESTRICT' });



// Asociaciones para IncidenciaGeneral
IncidenciaGeneral.belongsTo(Libro, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });
Libro.hasMany(IncidenciaGeneral, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });

// Asociaciones para Drop
Drop.belongsTo(Libro, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });
Libro.hasMany(Drop, { foreignKey: 'libro_id', onDelete: 'RESTRICT' });
Drop.belongsTo(Mesa, { foreignKey: 'mesa_id', onDelete: 'RESTRICT' });
Mesa.hasMany(Drop, { foreignKey: 'mesa_id', onDelete: 'RESTRICT' });

// Asociaciones para Area
Area.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Area, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Departamento
Departamento.belongsTo(Area, { foreignKey: 'area_id', onDelete: 'RESTRICT' });
Area.hasMany(Departamento, { foreignKey: 'area_id', onDelete: 'RESTRICT' });

// Asociaciones para Cargo
Cargo.belongsTo(Departamento, { foreignKey: 'departamento_id', onDelete: 'RESTRICT' });
Departamento.hasMany(Cargo, { foreignKey: 'departamento_id', onDelete: 'RESTRICT' });

// Asociaciones para Empleado
Empleado.belongsTo(Cargo, { foreignKey: 'cargo_id', onDelete: 'RESTRICT' });
Cargo.hasMany(Empleado, { foreignKey: 'cargo_id', onDelete: 'RESTRICT' });

Empleado.belongsTo(Horario, { foreignKey: 'horario_id', onDelete: 'RESTRICT' });
Horario.hasMany(Empleado, { foreignKey: 'horario_id', onDelete: 'RESTRICT' });

// Asociaciones para Horario
Horario.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Horario, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Dispositivo
Dispositivo.belongsTo(Sala, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });
Sala.hasMany(Dispositivo, { foreignKey: 'sala_id', onDelete: 'RESTRICT' });

// Asociaciones para Attlog
Attlog.belongsTo(Dispositivo, { foreignKey: 'dispositivo_id', onDelete: 'RESTRICT' });
Dispositivo.hasMany(Attlog, { foreignKey: 'dispositivo_id', onDelete: 'RESTRICT' });

// Asociaciones para Bloque
Bloque.belongsTo(Horario, { foreignKey: 'horario_id', onDelete: 'RESTRICT' });
Horario.hasMany(Bloque, { foreignKey: 'horario_id', as: 'bloques', onDelete: 'RESTRICT' });


// Sincronizar base de datos
const syncDatabase = async () => {
  try {
    await sequelize.sync({ force: false }); // Cambiar a true para recrear tablas
    console.log('✅ Base de datos SQLite sincronizada correctamente');
    
    // Insertar datos iniciales si no existen
    await insertInitialData();
  } catch (error) {
    console.error('❌ Error sincronizando base de datos:', error);
  }
};

// Función para insertar datos iniciales
const insertInitialData = async () => {
  try {
    // Verificar si ya existen datos
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('📊 Datos iniciales ya existen');
      return;
    }

    // Crear usuario creador
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('12345678', 10);
    
    const creator = await User.create({
      nombre_apellido: 'Willinthon Carriedo',
      usuario: 'willinthon',
      password: hashedPassword,
      nivel: 'TODO',
    });

    // Crear salas
    const sala1 = await Sala.create({
      nombre: 'Monagas Royal',
    });

    const sala2 = await Sala.create({
      nombre: 'Roraima'
    });

    // Crear módulos
    const moduleRRHH = await Module.create({
      nombre: 'MODULO RRHH',
      icono: 'users',
      ruta: '/rrhh',
    });

    const moduleMaquinas = await Module.create({
      nombre: 'MODULO MAQUINAS',
      icono: 'gamepad2',
      ruta: '/maquinas',
    });

    const moduleCecom = await Module.create({
      nombre: 'MODULO CECOM',
      icono: 'building',
      ruta: '/cecom',
    });

    const moduleSuperConfig = await Module.create({
      nombre: 'SUPER MODULO CONFIGURACION',
      icono: 'settings',
      ruta: '/super-config',
    });

    // Crear permisos base (5 permisos)
    const permissions = await Permission.bulkCreate([
      { nombre: 'AGREGAR' },
      { nombre: 'EDITAR' },
      { nombre: 'BORRAR' },
      { nombre: 'REPORTE' },
      { nombre: 'VER' } // Permiso oculto para acceso a módulos
    ]);

    // Actualizar permisos existentes si ya existen
    await Permission.update({ nombre: 'EDITAR' }, { where: { nombre: 'ACTUALIZAR' } });
    await Permission.update({ nombre: 'REPORTE' }, { where: { nombre: 'VER' } });

    // Crear páginas base
    const pages = await Page.bulkCreate([
      { 
        nombre: 'ADMINISTRACIÓN', 
        icono: 'settings',
        orden: 1
      },
      { 
        nombre: 'OPERACIONES', 
        icono: 'activity',
        orden: 2
      },
      { 
        nombre: 'REPORTES', 
        icono: 'chart',
        orden: 3
      }
    ]);

    // Asignar todas las salas al usuario creador
    await creator.addSalas([sala1, sala2]);

    // Asignar todos los módulos al usuario creador
    await creator.addModules([moduleRRHH, moduleMaquinas, moduleCecom, moduleSuperConfig]);

    // Asignar todos los permisos al usuario creador
    await creator.addPermissions(permissions);

    // Asignar módulos a páginas (relación uno a muchos)
    await moduleSuperConfig.update({ page_id: pages[0].id }); // ADMINISTRACIÓN -> SUPER CONFIG
    await moduleRRHH.update({ page_id: pages[1].id }); // OPERACIONES -> RRHH
    await moduleMaquinas.update({ page_id: pages[1].id }); // OPERACIONES -> MÁQUINAS
    await moduleCecom.update({ page_id: pages[1].id }); // OPERACIONES -> CECOM

    // Asignar módulos a las salas (excepto SUPER CONFIGURACION)
    await sala1.addModules([moduleRRHH, moduleMaquinas, moduleCecom]);
    await sala2.addModules([moduleRRHH, moduleMaquinas, moduleCecom]);

    console.log('✅ Datos iniciales insertados correctamente');
  } catch (error) {
    console.error('❌ Error insertando datos iniciales:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Sala,
  Module,
  Permission,
  Page,
  UserSala,
  UserModule,
  UserPermission,
  UserModulePermission,
  PageModule,
  SalaModule,
  Libro,
  Rango,
  Mesa,
  Juego,
  Maquina,
  NovedadMaquinaRegistro,
  IncidenciaGeneral,
  Drop,
  Area,
  Departamento,
  Cargo,
  Empleado,
  Horario,
  Bloque,
  Dispositivo,
  Attlog,
  Cron,
  syncDatabase
};

