const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const hikConnectRoutes = require('./hik-connect-api');
const hybridRoutes = require('./wisi-hikvision-hybrid');
const TPPHikvisionAPI = require('./tpp-hikvision-api');
const { 
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
  Tecnico,
  NovedadMaquina,
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
  syncDatabase 
} = require('./models');
const { Op } = require('sequelize');
require('dotenv').config();

// Función para asignar automáticamente elementos al usuario creador
async function assignToCreator(element, elementType) {
  try {
    // Buscar el usuario creador
    const creator = await User.findOne({ where: { nivel: 'TODO' } });
    
    if (!creator) {
      return;
    }


    switch (elementType) {
      case 'sala':
        await creator.addSala(element);
        break;
        
      case 'module':
        await creator.addModule(element);
        break;
        
      case 'permission':
        await creator.addPermission(element);
        break;
        
      case 'page':
        // Las páginas no se asignan directamente a usuarios, pero registramos la creación
        break;
        
      default:
    }
  } catch (error) {
    console.error(`❌ Error asignando ${elementType} al creador:`, error);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


// Rate limiting - Configuración más permisiva para desarrollo
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (aumentado para desarrollo)
  message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
  standardHeaders: true,
  legacyHeaders: false});
app.use(limiter);

// Inicializar base de datos SQLite
syncDatabase();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'wisi_secret_key_2024';

// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acceso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
};

// Middleware de autorización por nivel
const authorizeLevel = (requiredLevel) => {
  return (req, res, next) => {
    const userLevel = req.user.nivel;
    
    
    // El nivel TODO tiene acceso a todo
    if (userLevel === 'TODO') {
      return next();
    }
    
    // Verificar nivel específico
    if (requiredLevel === 'TODO' && userLevel !== 'TODO') {
      return res.status(403).json({ message: 'Solo el creador puede realizar esta acción' });
    }
    
    if (requiredLevel === 'ADMINISTRADOR' && userLevel !== 'ADMINISTRADOR' && userLevel !== 'TODO') {
      return res.status(403).json({ message: 'Acceso denegado - Se requiere nivel de administrador' });
    }
    
    if (requiredLevel === 'USUARIO_ACCESO') {
      return next(); // Todos los usuarios autenticados pueden acceder
    }
    
    next();
  };
};

// =============================================
// RUTAS DE AUTENTICACIÓN
// =============================================

app.post('/api/auth/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ message: 'Usuario y contraseña son requeridos' });
    }

    const user = await User.findOne({
      where: { usuario},
      include: [
        { model: Sala, through: UserSala, where: {}, required: false },
        { model: Module, through: UserModule, where: {}, required: false }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        usuario: user.usuario, 
        nivel: user.nivel,
        nombre: user.nombre_apellido
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre_apellido: user.nombre_apellido,
        usuario: user.usuario,
        nivel: user.nivel
      },
      salas: user.Salas || [],
      modules: user.Modules || []
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE USUARIOS
// =============================================

app.get('/api/users', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const users = await User.findAll({
      where: {nivel: { [Op.ne]: 'TODO' } // Excluir al creador
      },
      include: [
        { model: Sala, through: UserSala },
        { model: Module, through: UserModule },
        { model: Permission, through: UserPermission },
        { 
          model: UserModulePermission,
          include: [
            { model: Module },
            { model: Permission }
          ]
        }
      ],
      attributes: { include: ['password'] } // Incluir contraseña para administración
    });
    
    res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/users', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { nombre_apellido, usuario, password, nivel, salas, modulePermissions } = req.body;

    if (!nombre_apellido || !usuario || !password || !nivel) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar que el usuario no exista
    const existingUser = await User.findOne({ where: { usuario } });
    if (existingUser) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      nombre_apellido,
      usuario,
      password: hashedPassword,
      password_plain: password, // Guardar contraseña en texto plano para administración
      nivel
    });

    // Asignar salas
    if (salas && salas.length > 0) {
      const salasToAssign = await Sala.findAll({ where: { id: salas} });
      await user.addSalas(salasToAssign);
    }

    // Asignar módulos con permisos específicos
    if (modulePermissions && modulePermissions.length > 0) {
      for (const modulePermission of modulePermissions) {
        const { moduleId, permissions } = modulePermission;
        
        // Verificar que el módulo exista y esté const module = await Module.findOne({ where: { id: moduleId} });
        if (!module) continue;

        // Asignar el módulo al usuario
        await user.addModule(module);

        // Buscar el permiso VER
        const verPermission = await Permission.findOne({ where: { nombre: 'VER' } });
        
        // Asignar permisos específicos para este módulo
        if (permissions && permissions.length > 0) {
          for (const permissionId of permissions) {
            await UserModulePermission.create({
              user_id: user.id,
              module_id: moduleId,
              permission_id: permissionId
            });
          }
          
          // Agregar automáticamente el permiso VER si no está ya incluido
          if (verPermission && !permissions.includes(verPermission.id)) {
            await UserModulePermission.create({
              user_id: user.id,
              module_id: moduleId,
              permission_id: verPermission.id
            });
          }
        }
      }
    }

    res.status(201).json({ message: 'Usuario creado exitosamente', id: user.id });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar asignaciones de salas de un usuario
app.put('/api/users/:id/salas', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { salas } = req.body;

    const user = await User.findOne({
      where: { 
        id: id,
        nivel: { [Op.ne]: 'TODO' } // Excluir al creador
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar salas
    if (salas && salas.length > 0) {
      const salasToAssign = await Sala.findAll({ where: { id: salas } });
      await user.setSalas(salasToAssign);
    } else {
      await user.setSalas([]);
    }

    res.json({ message: 'Salas actualizadas exitosamente' });
  } catch (error) {
    console.error('Error actualizando salas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar asignaciones completas de un usuario
app.put('/api/users/:id/assignments', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { salas, modulePermissions, nombre_apellido, usuario, password } = req.body;

    const user = await User.findOne({
      where: { 
        id: id,
        nivel: { [Op.ne]: 'TODO' } // Excluir al creador
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Actualizar información básica del usuario
    const updateData = {
      nombre_apellido,
      usuario
    };

    // Si se proporciona una nueva contraseña, actualizarla
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      updateData.password_plain = password; // Guardar también en texto plano
    }

    await user.update(updateData);

    // Actualizar salas
    if (salas && salas.length > 0) {
      const salasToAssign = await Sala.findAll({ where: { id: salas} });
      await user.setSalas(salasToAssign);
    } else {
      await user.setSalas([]);
    }

    // Limpiar módulos y permisos anteriores
    await user.setModules([]);
    await UserModulePermission.destroy({ where: { user_id: id } });

    // Asignar nuevos módulos con permisos específicos
    if (modulePermissions && modulePermissions.length > 0) {
      
      for (const modulePermission of modulePermissions) {
        const { moduleId, permissions } = modulePermission;
        
        // Verificar que el módulo exista y esté const module = await Module.findOne({ where: { id: moduleId} });
        if (!module) {
          continue;
        }

        // Verificar que el módulo tenga al menos un permiso
        if (!permissions || permissions.length === 0) {
          continue;
        }

        // Asignar el módulo al usuario
        await user.addModule(module);

        // Buscar el permiso VER
        const verPermission = await Permission.findOne({ where: { nombre: 'VER' } });
        
        // Asignar permisos específicos para este módulo
        for (const permissionId of permissions) {
          const permission = await Permission.findByPk(permissionId);
          if (permission) {
            
            await UserModulePermission.create({
              user_id: id,
              module_id: moduleId,
              permission_id: permissionId
            });
          } else {
          }
        }
        
        // Agregar automáticamente el permiso VER si no está ya incluido
        if (verPermission && !permissions.includes(verPermission.id)) {
          await UserModulePermission.create({
            user_id: id,
            module_id: moduleId,
            permission_id: verPermission.id
          });
        }
      }
    }

    res.json({ message: 'Asignaciones actualizadas exitosamente' });
  } catch (error) {
    console.error('Error actualizando asignaciones:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para obtener usuarios con sus salas
app.get('/api/users/:id', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOne({
      where: { 
        id: id,
        nivel: { [Op.ne]: 'TODO' } // Excluir al creador
      },
      include: [
        { model: Sala, through: UserSala },
        { model: Module, through: UserModule },
        { model: Permission, through: UserPermission },
        { 
          model: UserModulePermission,
          include: [
            { model: Module },
            { model: Permission }
          ]
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar usuario
app.put('/api/users/:id', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre_apellido, usuario, nivel} = req.body;

    const user = await User.findOne({
      where: { 
        id: id,
        nivel: { [Op.ne]: 'TODO' } // Excluir al creador
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    await user.update({
      nombre_apellido,
      usuario,
      nivel});

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para eliminar usuario
app.delete('/api/users/:id', authenticateToken, authorizeLevel('ADMINISTRADOR'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // No permitir eliminar al usuario creador
    if (user.nivel === 'TODO') {
      return res.status(403).json({ message: 'No se puede eliminar al usuario creador' });
    }

    // Eliminar todas las relaciones primero
    await UserSala.destroy({ where: { user_id: id } });
    await UserModule.destroy({ where: { user_id: id } });
    await UserPermission.destroy({ where: { user_id: id } });
    await UserModulePermission.destroy({ where: { user_id: id } });

    // Ahora eliminar el usuario
    await user.destroy();

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE SALAS
// =============================================

app.get('/api/salas', authenticateToken, async (req, res) => {
  try {
    const salas = await Sala.findAll({ where: {} });
    res.json(salas);
  } catch (error) {
    console.error('Error obteniendo salas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/salas', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { nombre } = req.body;
    

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Verificar que la sala no exista
    const existingSala = await Sala.findOne({ where: { nombre } });
    if (existingSala) {
      return res.status(400).json({ message: 'Ya existe una sala con ese nombre' });
    }

    const sala = await Sala.create({ nombre });
    

    // Asignar automáticamente al usuario creador
    await assignToCreator(sala, 'sala');

    res.status(201).json({ message: 'Sala creada exitosamente', id: sala.id });
  } catch (error) {
    console.error('Error creando sala:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar sala
app.put('/api/salas/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre} = req.body;

    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    await sala.update({ nombre});

    res.json({ message: 'Sala actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando sala:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para eliminar sala
app.delete('/api/salas/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;

    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    // Verificar si la sala tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para sala:', {
      id: id,
      nombre: sala.nombre
    });
    
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Usuarios' as table_name, COUNT(*) as count FROM user_salas WHERE sala_id = ?
        UNION ALL
        SELECT 'Libros' as table_name, COUNT(*) as count FROM libros WHERE sala_id = ?
        UNION ALL
        SELECT 'Rangos' as table_name, COUNT(*) as count FROM rangos WHERE sala_id = ?
        UNION ALL
        SELECT 'Mesas' as table_name, COUNT(*) as count FROM mesas WHERE sala_id = ?
        UNION ALL
        SELECT 'Juegos' as table_name, COUNT(*) as count FROM juegos WHERE sala_id = ?
        UNION ALL
        SELECT 'Máquinas' as table_name, COUNT(*) as count FROM maquinas WHERE sala_id = ?
        UNION ALL
        SELECT 'Técnicos' as table_name, COUNT(*) as count FROM tecnicos WHERE sala_id = ?
        UNION ALL
        SELECT 'Novedades de Máquinas' as table_name, COUNT(*) as count FROM novedades_maquinas WHERE sala_id = ?
        UNION ALL
        SELECT 'Áreas' as table_name, COUNT(*) as count FROM areas WHERE sala_id = ?
        UNION ALL
        SELECT 'Horarios' as table_name, COUNT(*) as count FROM horarios WHERE sala_id = ?
        UNION ALL
        SELECT 'Dispositivos' as table_name, COUNT(*) as count FROM dispositivos WHERE sala_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id, id, id, id, id, id, id, id, id, id, id],
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('🔍 Resultado de verificación de relaciones para sala:', relations);

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar la sala porque tiene elementos asociados.',
        relations: relations,
        sala: {
          id: sala.id,
          nombre: sala.nombre
        }
      });
    }

    await sala.destroy();

    res.json({ message: 'Sala eliminada exitosamente' });
  } catch (error) {
    console.error('❌ Error eliminando sala:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE MÓDULOS
// =============================================

app.get('/api/modules', authenticateToken, async (req, res) => {
  try {
    const modules = await Module.findAll({ 
      where: {},
      include: [{
        model: Page,
        required: false
      }]
    });
    res.json(modules);
  } catch (error) {
    console.error('Error obteniendo módulos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todos los módulos (incluyendo ins) - solo para administradores
app.get('/api/modules/all', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const modules = await Module.findAll({
      include: [{
        model: Page,
        required: false
      }]
    });
    res.json(modules);
  } catch (error) {
    console.error('Error obteniendo todos los módulos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/modules', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { nombre, icono, ruta, page_id } = req.body;
    

    if (!nombre) {
      return res.status(400).json({ message: 'Nombre es requerido' });
    }

    // Verificar que el módulo no exista
    const existingModule = await Module.findOne({ where: { nombre } });
    if (existingModule) {
      return res.status(400).json({ message: 'Ya existe un módulo con ese nombre' });
    }

    const module = await Module.create({ 
      nombre, 
      icono: icono || 'settings', 
      ruta: ruta || `/${nombre.toLowerCase().replace(/\s+/g, '-')}`, 
      page_id: page_id || null});
    

    // Asignar automáticamente al usuario creador
    await assignToCreator(module, 'module');

    res.status(201).json({ message: 'Módulo creado exitosamente', id: module.id });
  } catch (error) {
    console.error('Error creando módulo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.put('/api/modules/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, icono, ruta, page_id } = req.body;

    const module = await Module.findByPk(id);
    if (!module) {
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }

    await module.update({ nombre, icono, ruta, page_id });

    res.json({ message: 'Módulo actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando módulo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.delete('/api/modules/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;

    const module = await Module.findByPk(id);
    if (!module) {
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }

    // Eliminar el módulo
    await module.destroy();

    res.json({ message: 'Módulo eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando módulo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE PÁGINAS
// =============================================

app.get('/api/pages', authenticateToken, async (req, res) => {
  try {
    const pages = await Page.findAll({ 
      where: {},
      include: [{
        model: Module,
        where: {},
        required: false
      }],
      order: [['orden', 'ASC']]
    });
    res.json(pages);
  } catch (error) {
    console.error('Error obteniendo páginas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todas las páginas (incluyendo inactivas) - solo para administradores
app.get('/api/pages/all', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const pages = await Page.findAll({
      include: [{
        model: Module,
        required: false
      }],
      order: [['orden', 'ASC']]
    });
    res.json(pages);
  } catch (error) {
    console.error('Error obteniendo todas las páginas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/pages', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { nombre, icono, orden } = req.body;
    

    if (!nombre) {
      return res.status(400).json({ message: 'Nombre es requerido' });
    }

    // Verificar que la página no exista
    const existingPage = await Page.findOne({ where: { nombre } });
    if (existingPage) {
      return res.status(400).json({ message: 'Ya existe una página con ese nombre' });
    }

    const page = await Page.create({ 
      nombre, 
      icono: icono || 'file', 
      orden: orden || 0});
    

    // Asignar automáticamente al usuario creador (las páginas no se asignan directamente, pero el creador tiene acceso)
    await assignToCreator(page, 'page');

    res.status(201).json({ message: 'Página creada exitosamente', id: page.id });
  } catch (error) {
    console.error('Error creando página:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.put('/api/pages/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, icono, orden} = req.body;

    const page = await Page.findByPk(id);
    if (!page) {
      return res.status(404).json({ message: 'Página no encontrada' });
    }

    await page.update({ nombre, icono, orden});

    res.json({ message: 'Página actualizada exitosamente' });
  } catch (error) {
    console.error('Error actualizando página:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.delete('/api/pages/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;

    const page = await Page.findByPk(id);
    if (!page) {
      return res.status(404).json({ message: 'Página no encontrada' });
    }

    // Eliminar la página
    await page.destroy();

    res.json({ message: 'Página eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando página:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener permisos del usuario
app.get('/api/user/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    // Si es el usuario creador (TODO), devolver todos los permisos de todos los módulos
    if (userLevel === 'TODO') {
      
      const allModules = await Module.findAll({ where: {} });
      const allPermissions = await Permission.findAll({ where: {} });
      
      const creatorPermissions = [];
      for (const module of allModules) {
        for (const permission of allPermissions) {
          creatorPermissions.push({
            module_id: module.id,
            permission_id: permission.id,
            Permission: {
              nombre: permission.nombre
            }
          });
        }
      }
      
      return res.json(creatorPermissions);
    }
    
    // Para usuarios normales, obtener permisos específicos
    const userPermissions = await UserModulePermission.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Module,
          where: {}
        },
        {
          model: Permission,
          where: {}
        }
      ]
    });

    
    const permissions = userPermissions.map(up => ({
      module_id: up.Module.id,
      permission_id: up.Permission.id,
      Permission: {
        nombre: up.Permission.nombre
      }
    }));

    res.json(permissions);
  } catch (error) {
    console.error('❌ Error obteniendo permisos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para asignar permisos de prueba (TEMPORAL)
app.post('/api/admin/assign-permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener todos los módulos y permisos
    const modules = await Module.findAll({ where: {} });
    const permissions = await Permission.findAll({ where: {} });
    
    
    // Asignar todos los permisos a todos los módulos para este usuario
    const userPermissions = [];
    for (const module of modules) {
      for (const permission of permissions) {
        userPermissions.push({
          user_id: userId,
          module_id: module.id,
          permission_id: permission.id
        });
      }
    }
    
    // Eliminar permisos existentes del usuario
    await UserModulePermission.destroy({ where: { user_id: userId } });
    
    // Crear nuevos permisos
    await UserModulePermission.bulkCreate(userPermissions);
    
    res.json({ message: 'Permisos asignados correctamente', count: userPermissions.length });
  } catch (error) {
    console.error('❌ Error asignando permisos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para obtener menú del usuario organizado por páginas
app.get('/api/user/menu', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Primero, obtener el usuario básico
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }


    // Si es el creador, devolver todas las páginas
    if (user.nivel === 'TODO') {
      const allPages = await Page.findAll({
        where: {},
        order: [['orden', 'ASC']]
      });
      return res.json(allPages);
    }

    // Obtener módulos del usuario de forma separada
    const userModules = await UserModule.findAll({
      where: { user_id: userId },
      include: [{
        model: Module,
        where: {}
      }]
    });

    userModules.forEach(um => {
    });

    if (userModules.length === 0) {
      return res.json([]);
    }

    // Obtener IDs de módulos
    const moduleIds = userModules.map(um => um.Module.id);

    // Obtener páginas que contienen estos módulos
    const pages = await Page.findAll({
      where: {},
      include: [{
        model: Module,
        where: {id: moduleIds
        },
        required: true
      }],
      order: [['orden', 'ASC']]
    });

    pages.forEach(page => {
    });

    res.json(pages);
  } catch (error) {
    console.error('❌ Error obteniendo menú del usuario:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener módulos asignados al usuario
app.get('/api/user/modules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener módulos asignados al usuario
    const userModules = await UserModule.findAll({
      where: { user_id: userId },
      include: [{
        model: Module,
        where: {}
      }]
    });

    
    // Extraer solo los módulos
    const modules = userModules.map(um => um.Module);
    
    res.json(modules);
  } catch (error) {
    console.error('❌ Error obteniendo módulos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener salas asignadas al usuario
app.get('/api/user/salas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Obtener salas asignadas al usuario
    const userSalas = await UserSala.findAll({
      where: { user_id: userId },
      include: [{
        model: Sala,
        where: {}
      }]
    });

    
    // Extraer solo las salas
    const salas = userSalas.map(us => us.Sala);
    
    res.json(salas);
  } catch (error) {
    console.error('❌ Error obteniendo salas del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener juegos asignados al usuario
app.get('/api/user/juegos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let juegos;
    
    if (userLevel === 'TODO') {
      // El creador tiene acceso a todos los juegos
      juegos = await Juego.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Obtener juegos de las salas asignadas al usuario
      const userSalas = await UserSala.findAll({
        where: { user_id: userId },
        include: [{
          model: Sala,
          where: {}
        }]
      });

      const userSalaIds = userSalas.map(us => us.Sala.id);
      
      juegos = await Juego.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(juegos);
  } catch (error) {
    console.error('❌ Error obteniendo juegos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener rangos asignados al usuario
app.get('/api/user/rangos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let rangos;
    
    if (userLevel === 'TODO') {
      // El creador tiene acceso a todos los rangos
      rangos = await Rango.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Obtener rangos de las salas asignadas al usuario
      const userSalas = await UserSala.findAll({
        where: { user_id: userId },
        include: [{
          model: Sala,
          where: {}
        }]
      });

      const userSalaIds = userSalas.map(us => us.Sala.id);
      
      rangos = await Rango.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(rangos);
  } catch (error) {
    console.error('❌ Error obteniendo rangos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE PERMISOS
// =============================================

app.get('/api/permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    res.json(permissions);
  } catch (error) {
    console.error('Error obteniendo permisos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/permissions', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { nombre } = req.body;
    

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Verificar que el permiso no exista
    const existingPermission = await Permission.findOne({ 
      where: { nombre } 
    });
    
    if (existingPermission) {
      return res.status(400).json({ message: 'Ya existe un permiso con ese nombre' });
    }

    const permission = await Permission.create({ nombre});
    

    // Asignar automáticamente al usuario creador
    await assignToCreator(permission, 'permission');

    res.status(201).json({ message: 'Permiso creado exitosamente', id: permission.id });
  } catch (error) {
    console.error('Error creando permiso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.put('/api/permissions/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre} = req.body;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: 'Permiso no encontrado' });
    }

    await permission.update({ nombre});

    res.json({ message: 'Permiso actualizado exitosamente' });
  } catch (error) {
    console.error('Error actualizando permiso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.delete('/api/permissions/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: 'Permiso no encontrado' });
    }

    await permission.destroy();

    res.json({ message: 'Permiso eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando permiso:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE LIBROS
// =============================================

// Obtener salas del usuario para crear libros
app.get('/api/user/salas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let salas;
    
    if (userLevel === 'TODO') {
      // El creador tiene acceso a todas las salas
      salas = await Sala.findAll({
        where: {}
      });
    } else {
      // Otros usuarios solo ven sus salas asignadas
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      salas = user.Salas;
    }

    res.json(salas);
  } catch (error) {
    console.error('❌ Error obteniendo salas del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todos los libros
app.get('/api/libros', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let libros;
    
    if (userLevel === 'TODO') {
      // El creador ve todos los libros
      libros = await Libro.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      // Otros usuarios solo ven libros de sus salas asignadas
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);

      libros = await Libro.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(libros);
  } catch (error) {
    console.error('❌ Error obteniendo libros:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener un libro por ID
app.get('/api/libros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await Libro.findByPk(id);
    
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    
    res.json(libro);
  } catch (error) {
    console.error('Error obteniendo libro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo libro
app.post('/api/libros', authenticateToken, async (req, res) => {
  try {
    const { sala_id } = req.body;
    
    if (!sala_id) {
      return res.status(400).json({ message: 'La sala es requerida' });
    }

    // Verificar que la sala existe
    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    // Obtener el último libro creado para esta sala específica
    const ultimoLibroSala = await Libro.findOne({
      where: { sala_id: sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    
    if (ultimoLibroSala) {
      // Si existe un libro anterior en esta sala, agregar 1 día a su fecha
      const ultimaFecha = new Date(ultimoLibroSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    } else {
    }

    const libro = await Libro.create({
      sala_id: sala_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    // Obtener el libro con la información de la sala
    const libroConSala = await Libro.findByPk(libro.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(libroConSala);
  } catch (error) {
    console.error('Error creando libro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un libro
app.put('/api/libros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    // No se requieren campos para actualizar libros

    const libro = await Libro.findByPk(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    await libro.update({
      });

    res.json({ message: 'Libro actualizado exitosamente', libro });
  } catch (error) {
    console.error('Error actualizando libro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un libro
app.delete('/api/libros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const libro = await Libro.findByPk(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Eliminar primero todos los registros relacionados
    await NovedadMaquinaRegistro.destroy({ where: { libro_id: id } });
    await IncidenciaGeneral.destroy({ where: { libro_id: id } });
    await Drop.destroy({ where: { libro_id: id } });

    // Ahora eliminar el libro
    await libro.destroy();

    res.json({ message: 'Libro eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando libro:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA RANGOS
// =============================================

// Obtener todos los rangos
app.get('/api/rangos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let rangos;
    
    if (userLevel === 'TODO') {
      rangos = await Rango.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      rangos = await Rango.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(rangos);
  } catch (error) {
    console.error('❌ Error obteniendo rangos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo rango
app.post('/api/rangos', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'El nombre y la sala son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const ultimoRangoSala = await Rango.findOne({
      where: { sala_id: sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimoRangoSala) {
      const ultimaFecha = new Date(ultimoRangoSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const rango = await Rango.create({
      nombre: nombre,
      sala_id: sala_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const rangoConSala = await Rango.findByPk(rango.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(rangoConSala);
  } catch (error) {
    console.error('Error creando rango:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un rango
app.delete('/api/rangos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const rango = await Rango.findByPk(id);
    
    if (!rango) {
      return res.status(404).json({ message: 'Rango no encontrado' });
    }
    
    // Eliminar primero todas las máquinas relacionadas
    await Maquina.destroy({ where: { rango_id: id } });
    
    // Ahora eliminar el rango
    await rango.destroy();
    res.json({ message: 'Rango eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando rango:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA ÁREAS
// =============================================

// Obtener todas las áreas
app.get('/api/areas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let areas;
    
    if (userLevel === 'TODO') {
      areas = await Area.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      areas = await Area.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(areas);
  } catch (error) {
    console.error('❌ Error obteniendo áreas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear una nueva área
app.post('/api/areas', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'El nombre y la sala son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const ultimaAreaSala = await Area.findOne({
      where: { sala_id: sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimaAreaSala) {
      const ultimaFecha = new Date(ultimaAreaSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const area = await Area.create({
      nombre: nombre,
      sala_id: sala_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const areaConSala = await Area.findByPk(area.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(areaConSala);
  } catch (error) {
    console.error('Error creando área:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un área
app.put('/api/areas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id } = req.body;
    
    const area = await Area.findByPk(id);
    if (!area) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }

    if (sala_id) {
      const sala = await Sala.findByPk(sala_id);
      if (!sala) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }
    }

    await area.update({
      nombre: nombre || area.nombre,
      sala_id: sala_id || area.sala_id
    });

    const areaActualizada = await Area.findByPk(area.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.json(areaActualizada);
  } catch (error) {
    console.error('Error actualizando área:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un área
app.delete('/api/areas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const area = await Area.findByPk(id);
    
    if (!area) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }
    
    // Verificar si el área tiene relaciones que impidan su eliminación
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Departamentos' as table_name, COUNT(*) as count FROM departamentos WHERE area_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el área porque tiene elementos asociados.',
        relations: relations,
        area: {
          id: area.id,
          nombre: area.nombre
        }
      });
    }
    
    // Eliminar el área
    await area.destroy();
    res.json({ message: 'Área eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando área:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA DEPARTAMENTOS
// =============================================

// Obtener todas las áreas del usuario (para el selector de departamentos)
app.get('/api/user/areas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let areas;
    
    if (userLevel === 'TODO') {
      areas = await Area.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      areas = await Area.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(areas);
  } catch (error) {
    console.error('❌ Error obteniendo áreas del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todos los departamentos
app.get('/api/departamentos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let departamentos;
    
    if (userLevel === 'TODO') {
      departamentos = await Departamento.findAll({
        where: {},
        include: [{
          model: Area,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      departamentos = await Departamento.findAll({
        where: {},
        include: [{
          model: Area,
          where: {sala_id: userSalaIds
          },
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(departamentos);
  } catch (error) {
    console.error('❌ Error obteniendo departamentos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo departamento
app.post('/api/departamentos', authenticateToken, async (req, res) => {
  try {
    const { nombre, area_id } = req.body;
    
    if (!nombre || !area_id) {
      return res.status(400).json({ message: 'El nombre y el área son requeridos' });
    }

    const area = await Area.findByPk(area_id);
    if (!area) {
      return res.status(404).json({ message: 'Área no encontrada' });
    }

    const ultimoDepartamentoArea = await Departamento.findOne({
      where: { area_id: area_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimoDepartamentoArea) {
      const ultimaFecha = new Date(ultimoDepartamentoArea.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const departamento = await Departamento.create({
      nombre: nombre,
      area_id: area_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const departamentoConArea = await Departamento.findByPk(departamento.id, {
      include: [{
        model: Area,
        attributes: ['id', 'nombre'],
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }]
      }]
    });

    res.status(201).json(departamentoConArea);
  } catch (error) {
    console.error('Error creando departamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un departamento
app.put('/api/departamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, area_id } = req.body;
    
    const departamento = await Departamento.findByPk(id);
    if (!departamento) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }

    if (area_id) {
      const area = await Area.findByPk(area_id);
      if (!area) {
        return res.status(404).json({ message: 'Área no encontrada' });
      }
    }

    await departamento.update({
      nombre: nombre || departamento.nombre,
      area_id: area_id || departamento.area_id
    });

    const departamentoActualizado = await Departamento.findByPk(departamento.id, {
      include: [{
        model: Area,
        attributes: ['id', 'nombre'],
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }]
      }]
    });

    res.json(departamentoActualizado);
  } catch (error) {
    console.error('Error actualizando departamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un departamento
app.delete('/api/departamentos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const departamento = await Departamento.findByPk(id);
    
    if (!departamento) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }
    
    // Verificar si el departamento tiene relaciones que impidan su eliminación
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Cargos' as table_name, COUNT(*) as count FROM cargos WHERE departamento_id = ?
        UNION ALL
        SELECT 'Empleados' as table_name, COUNT(*) as count FROM empleados WHERE cargo_id IN (SELECT id FROM cargos WHERE departamento_id = ?)
      ) as relations WHERE count > 0
    `, {
      replacements: [id, id],
      type: sequelize.QueryTypes.SELECT
    });

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el departamento porque tiene elementos asociados.',
        relations: relations,
        departamento: {
          id: departamento.id,
          nombre: departamento.nombre
        }
      });
    }
    
    // Eliminar el departamento
    await departamento.destroy();
    res.json({ message: 'Departamento eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando departamento:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA CARGOS
// =============================================

// Obtener todos los departamentos del usuario (para el selector de cargos)
app.get('/api/user/departamentos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let departamentos;
    
    if (userLevel === 'TODO') {
      departamentos = await Departamento.findAll({
        where: {},
        include: [{
          model: Area,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      departamentos = await Departamento.findAll({
        where: {},
        include: [{
          model: Area,
          where: {sala_id: userSalaIds
          },
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(departamentos);
  } catch (error) {
    console.error('❌ Error obteniendo departamentos del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener todos los cargos
app.get('/api/cargos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let cargos;
    
    if (userLevel === 'TODO') {
      cargos = await Cargo.findAll({
        where: {},
        include: [{
          model: Departamento,
          attributes: ['id', 'nombre'],
          include: [{
            model: Area,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      cargos = await Cargo.findAll({
        where: {},
        include: [{
          model: Departamento,
          where: {},
          attributes: ['id', 'nombre'],
          include: [{
            model: Area,
            where: {sala_id: userSalaIds
            },
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(cargos);
  } catch (error) {
    console.error('❌ Error obteniendo cargos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo cargo
app.post('/api/cargos', authenticateToken, async (req, res) => {
  try {
    const { nombre, departamento_id } = req.body;
    
    if (!nombre || !departamento_id) {
      return res.status(400).json({ message: 'El nombre y el departamento son requeridos' });
    }

    const departamento = await Departamento.findByPk(departamento_id);
    if (!departamento) {
      return res.status(404).json({ message: 'Departamento no encontrado' });
    }

    const ultimoCargoDepartamento = await Cargo.findOne({
      where: { departamento_id: departamento_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimoCargoDepartamento) {
      const ultimaFecha = new Date(ultimoCargoDepartamento.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const cargo = await Cargo.create({
      nombre: nombre,
      departamento_id: departamento_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const cargoConDepartamento = await Cargo.findByPk(cargo.id, {
      include: [{
        model: Departamento,
        attributes: ['id', 'nombre'],
        include: [{
          model: Area,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }]
      }]
    });

    res.status(201).json(cargoConDepartamento);
  } catch (error) {
    console.error('Error creando cargo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un cargo
app.put('/api/cargos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, departamento_id } = req.body;
    
    const cargo = await Cargo.findByPk(id);
    if (!cargo) {
      return res.status(404).json({ message: 'Cargo no encontrado' });
    }

    if (departamento_id) {
      const departamento = await Departamento.findByPk(departamento_id);
      if (!departamento) {
        return res.status(404).json({ message: 'Departamento no encontrado' });
      }
    }

    await cargo.update({
      nombre: nombre || cargo.nombre,
      departamento_id: departamento_id || cargo.departamento_id
    });

    const cargoActualizado = await Cargo.findByPk(cargo.id, {
      include: [{
        model: Departamento,
        attributes: ['id', 'nombre'],
        include: [{
          model: Area,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }]
      }]
    });

    res.json(cargoActualizado);
  } catch (error) {
    console.error('Error actualizando cargo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un cargo
app.delete('/api/cargos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const cargo = await Cargo.findByPk(id);
    
    if (!cargo) {
      return res.status(404).json({ message: 'Cargo no encontrado' });
    }
    
    // Verificar si el cargo tiene relaciones que impidan su eliminación
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Empleados' as table_name, COUNT(*) as count FROM empleados WHERE cargo_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el cargo porque tiene elementos asociados.',
        relations: relations,
        cargo: {
          id: cargo.id,
          nombre: cargo.nombre
        }
      });
    }
    
    // Eliminar el cargo
    await cargo.destroy();
    res.json({ message: 'Cargo eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando cargo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// =============================================
// RUTAS PARA HORARIOS (SISTEMA DE BLOQUES)
// =============================================

// Obtener todos los horarios con sus bloques
app.get('/api/horarios', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let horarios;
    
    if (userLevel === 'TODO') {
      const results = await sequelize.query(`
        SELECT h.*, s.nombre as sala_nombre 
        FROM horarios h 
        LEFT JOIN salas s ON h.sala_id = s.id 
        ORDER BY h.created_at DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      
      horarios = results.map(row => ({
        id: row.id,
        nombre: row.nombre,
        sala_id: row.sala_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
        Sala: {
          id: row.sala_id,
          nombre: row.sala_nombre || 'Sala sin nombre'
        }
      }));
      
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      horarios = await Horario.findAll({
        where: {sala_id: userSalaIds
        },
        order: [['created_at', 'DESC']],
        raw: true
      });
      
      // Obtener salas por separado
      const salaIds = [...new Set(horarios.map(h => h.sala_id))];
      const salas = await Sala.findAll({
        where: { id: salaIds },
        attributes: ['id', 'nombre']
      });
      
      // Mapear salas a horarios
      const salasMap = {};
      salas.forEach(sala => {
        salasMap[sala.id] = sala;
      });
      
      horarios = horarios.map(horario => ({
        ...horario,
        Sala: salasMap[horario.sala_id]
      }));
    }
    
    // Obtener bloques para cada horario
    for (let horario of horarios) {
      const bloques = await Bloque.findAll({
        where: { horario_id: horario.id },
        order: [['orden', 'ASC']],
        raw: true
      });
      horario.bloques = bloques;
    }
    
    res.json(horarios);
  } catch (error) {
    console.error('Error obteniendo horarios:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo horario con bloques
app.post('/api/horarios', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id, bloques } = req.body;
    
    if (!nombre || !sala_id || !bloques || !Array.isArray(bloques) || bloques.length === 0) {
      return res.status(400).json({ message: 'Nombre, sala y al menos un bloque son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    // Crear el horario
    const horario = await Horario.create({
      nombre,
      sala_id
    });

    // Crear los bloques
    for (let i = 0; i < bloques.length; i++) {
      const bloque = bloques[i];
      await Bloque.create({
        horario_id: horario.id,
        hora_entrada: bloque.hora_entrada,
        hora_salida: bloque.hora_salida,
        turno: bloque.turno,
        orden: i + 1
      });
    }

    // Obtener el horario completo con bloques
    const horarioCompleto = await Horario.findByPk(horario.id, {
      include: [{
        model: Bloque,
        as: 'bloques',
        order: [['orden', 'ASC']]
      }]
    });

    if (!horarioCompleto) {
      return res.status(500).json({ message: 'Error creando horario' });
    }

    res.status(201).json(horarioCompleto);
  } catch (error) {
    console.error('Error creando horario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un horario con sus bloques
app.put('/api/horarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id, bloques } = req.body;
    
    const horario = await Horario.findByPk(id);
    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    // Actualizar el horario
    await horario.update({
      nombre: nombre || horario.nombre,
      sala_id: sala_id || horario.sala_id
    });

    // Si se proporcionan bloques, actualizarlos
    if (bloques && Array.isArray(bloques)) {
      // Eliminar bloques existentes
      await Bloque.destroy({ where: { horario_id: id } });
      
      // Crear nuevos bloques
      for (let i = 0; i < bloques.length; i++) {
        const bloque = bloques[i];
        await Bloque.create({
          horario_id: id,
          hora_entrada: bloque.hora_entrada,
          hora_salida: bloque.hora_salida,
          turno: bloque.turno,
          orden: i + 1
        });
      }
    }

    // Obtener el horario actualizado con bloques
    const horarioActualizado = await Horario.findByPk(id, {
      include: [{
        model: Bloque,
        as: 'bloques',
        order: [['orden', 'ASC']]
      }]
    });

    if (!horarioActualizado) {
      return res.status(500).json({ message: 'Error actualizando horario' });
    }

    res.json(horarioActualizado);
  } catch (error) {
    console.error('Error actualizando horario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un horario (soft delete)
app.delete('/api/horarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const horario = await Horario.findByPk(id);
    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    // Verificar si el horario tiene relaciones que impidan su eliminación
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Empleados' as table_name, COUNT(*) as count FROM empleados WHERE horario_id = ?
        UNION ALL
        SELECT 'Bloques' as table_name, COUNT(*) as count FROM bloques WHERE horario_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id, id],
      type: sequelize.QueryTypes.SELECT
    });

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el horario porque tiene elementos asociados.',
        relations: relations,
        horario: {
          id: horario.id,
          nombre: horario.nombre
        }
      });
    }

    // Eliminar el horario
    await horario.destroy();

    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando horario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener un horario específico con sus bloques
app.get('/api/horarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const horario = await Horario.findByPk(id, {
      include: [{
        model: Bloque,
        as: 'bloques',
        order: [['orden', 'ASC']]
      }]
    });

    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    res.json(horario);
  } catch (error) {
    console.error('Error obteniendo horario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA MESAS
// =============================================

// Obtener todas las mesas
app.get('/api/mesas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let mesas;
    
    if (userLevel === 'TODO') {
      mesas = await Mesa.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }, {
          model: Juego,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      mesas = await Mesa.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }, {
          model: Juego,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(mesas);
  } catch (error) {
    console.error('❌ Error obteniendo mesas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear una nueva mesa
app.post('/api/mesas', authenticateToken, async (req, res) => {
  try {
    const { nombre, juego_id } = req.body;
    
    if (!nombre || !juego_id) {
      return res.status(400).json({ message: 'El nombre y el juego son requeridos' });
    }

    const juego = await Juego.findByPk(juego_id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });
    
    if (!juego) {
      return res.status(404).json({ message: 'Juego no encontrado' });
    }

    const ultimaMesaSala = await Mesa.findOne({
      where: { sala_id: juego.sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimaMesaSala) {
      const ultimaFecha = new Date(ultimaMesaSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const mesa = await Mesa.create({
      nombre: nombre,
      sala_id: juego.sala_id,
      juego_id: juego_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const mesaConRelaciones = await Mesa.findByPk(mesa.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }, {
        model: Juego,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(mesaConRelaciones);
  } catch (error) {
    console.error('Error creando mesa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar una mesa
app.delete('/api/mesas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const mesa = await Mesa.findByPk(id);
    
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }
    
    // Eliminar primero todos los registros relacionados
    await Drop.destroy({ where: { mesa_id: id } });
    
    // Ahora eliminar la mesa
    await mesa.destroy();
    res.json({ message: 'Mesa eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando mesa:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA JUEGOS
// =============================================

// Obtener todos los juegos
app.get('/api/juegos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let juegos;
    
    if (userLevel === 'TODO') {
      juegos = await Juego.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      juegos = await Juego.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(juegos);
  } catch (error) {
    console.error('❌ Error obteniendo juegos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo juego
app.post('/api/juegos', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'El nombre y la sala son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const ultimoJuegoSala = await Juego.findOne({
      where: { sala_id: sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimoJuegoSala) {
      const ultimaFecha = new Date(ultimoJuegoSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const juego = await Juego.create({
      nombre: nombre,
      sala_id: sala_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const juegoConSala = await Juego.findByPk(juego.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(juegoConSala);
  } catch (error) {
    console.error('Error creando juego:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un juego
app.delete('/api/juegos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const juego = await Juego.findByPk(id);
    
    if (!juego) {
      return res.status(404).json({ message: 'Juego no encontrado' });
    }
    
    // Eliminar primero todas las mesas relacionadas
    await Mesa.destroy({ where: { juego_id: id } });
    
    // Ahora eliminar el juego
    await juego.destroy();
    res.json({ message: 'Juego eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando juego:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA MÁQUINAS
// =============================================

// Obtener todas las máquinas
app.get('/api/maquinas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let maquinas;
    
    if (userLevel === 'TODO') {
      maquinas = await Maquina.findAll({
        where: {},
        include: [{
          model: Rango,
          attributes: ['id', 'nombre']
        }, {
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      maquinas = await Maquina.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Rango,
          attributes: ['id', 'nombre']
        }, {
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(maquinas);
  } catch (error) {
    console.error('❌ Error obteniendo máquinas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear una nueva máquina
app.post('/api/maquinas', authenticateToken, async (req, res) => {
  try {
    const { nombre, rango_id } = req.body;
    
    if (!nombre || !rango_id) {
      return res.status(400).json({ message: 'El nombre y el rango son requeridos' });
    }

    const rango = await Rango.findByPk(rango_id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });
    
    if (!rango) {
      return res.status(404).json({ message: 'Rango no encontrado' });
    }

    const ultimaMaquinaSala = await Maquina.findOne({
      where: { sala_id: rango.sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimaMaquinaSala) {
      const ultimaFecha = new Date(ultimaMaquinaSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const maquina = await Maquina.create({
      nombre: nombre,
      sala_id: rango.sala_id,
      rango_id: rango_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const maquinaConRelaciones = await Maquina.findByPk(maquina.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }, {
        model: Rango,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(maquinaConRelaciones);
  } catch (error) {
    console.error('Error creando máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar una máquina
app.delete('/api/maquinas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const maquina = await Maquina.findByPk(id);
    
    if (!maquina) {
      return res.status(404).json({ message: 'Máquina no encontrada' });
    }
    
    // Eliminar primero todos los registros relacionados
    await NovedadMaquinaRegistro.destroy({ where: { maquina_id: id } });
    
    // Ahora eliminar la máquina
    await maquina.destroy();
    res.json({ message: 'Máquina eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA TÉCNICOS
// =============================================

// Obtener todos los técnicos
app.get('/api/tecnicos', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let tecnicos;
    
    if (userLevel === 'TODO') {
      tecnicos = await Tecnico.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: {}
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      tecnicos = await Tecnico.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(tecnicos);
  } catch (error) {
    console.error('❌ Error obteniendo técnicos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear un nuevo técnico
app.post('/api/tecnicos', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'El nombre y la sala son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const ultimoTecnicoSala = await Tecnico.findOne({
      where: { sala_id: sala_id },
      order: [['created_at', 'DESC']]
    });

    let fechaCreacion = new Date();
    if (ultimoTecnicoSala) {
      const ultimaFecha = new Date(ultimoTecnicoSala.created_at);
      fechaCreacion = new Date(ultimaFecha);
      fechaCreacion.setDate(fechaCreacion.getDate() + 1);
    }

    const tecnico = await Tecnico.create({
      nombre: nombre,
      sala_id: sala_id,
      created_at: fechaCreacion,
      updated_at: fechaCreacion
    });

    const tecnicoConSala = await Tecnico.findByPk(tecnico.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(tecnicoConSala);
  } catch (error) {
    console.error('Error creando técnico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un técnico
app.put('/api/tecnicos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    
    const tecnico = await Tecnico.findByPk(id);
    if (!tecnico) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    await tecnico.update({ nombre });
    res.json(tecnico);
  } catch (error) {
    console.error('Error actualizando técnico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar un técnico
app.delete('/api/tecnicos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const tecnico = await Tecnico.findByPk(id);
    
    if (!tecnico) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }
    
    // Eliminar primero todos los registros relacionados
    await NovedadMaquinaRegistro.destroy({ where: { tecnico_id: id } });
    
    // Ahora eliminar el técnico
    await tecnico.destroy();
    res.json({ message: 'Técnico eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando técnico:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PÚBLICAS PARA REPORTES
// =============================================

// Obtener libro para reporte (público)
app.get('/api/public/libros/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const libro = await Libro.findByPk(id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });
    
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    
    res.json(libro);
  } catch (error) {
    console.error('Error obteniendo libro para reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener drops por libro (público)
app.get('/api/public/drops/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    const drops = await Drop.findAll({
      where: { libro_id: libroId },
      include: [{
        model: Mesa,
        attributes: ['id', 'nombre']
      }],
      order: [['created_at', 'ASC']]
    });
    
    res.json(drops);
  } catch (error) {
    console.error('Error obteniendo drops para reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener novedades por libro (público)
app.get('/api/public/novedades/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    const novedades = await NovedadMaquinaRegistro.findAll({
      where: { libro_id: libroId },
      include: [{
        model: Maquina,
        attributes: ['id', 'nombre'],
        include: [{
          model: Rango,
          attributes: ['id', 'nombre']
        }]
      }, {
        model: NovedadMaquina,
        attributes: ['id', 'nombre']
      }, {
        model: Tecnico,
        attributes: ['id', 'nombre']
      }],
      order: [['hora', 'ASC']]
    });
    
    res.json(novedades);
  } catch (error) {
    console.error('Error obteniendo novedades para reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener incidencias por libro (público)
app.get('/api/public/incidencias/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    const incidencias = await IncidenciaGeneral.findAll({
      where: { libro_id: libroId },
      order: [['hora', 'ASC']]
    });
    
    res.json(incidencias);
  } catch (error) {
    console.error('Error obteniendo incidencias para reporte:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTA DE VERIFICACIÓN DE TOKEN
// =============================================

app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  try {
    // Obtener información completa del usuario desde la base de datos
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'usuario', 'nivel', 'nombre_apellido']
    });

    if (!user) {
      return res.status(404).json({ valid: false, message: 'Usuario no encontrado' });
    }

    res.json({ 
      valid: true, 
      user: {
        id: user.id,
        usuario: user.usuario,
        nivel: user.nivel,
        nombre_apellido: user.nombre_apellido
      }
    });
  } catch (error) {
    console.error('Error al verificar token:', error);
    res.status(500).json({ valid: false, message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTA DE INICIO
// =============================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'Sistema WISI - API funcionando correctamente',
    version: '1.0.0',
    author: 'Willinthon Carriedo'
  });
});

// ===== RUTAS PARA DROPS =====

// Obtener drops del usuario por libro
app.get('/api/drops/:libroId', authenticateToken, async (req, res) => {
  try {
    const { libroId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let drops;
    
    if (userLevel === 'TODO') {
      drops = await Drop.findAll({
        where: {libro_id: libroId
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at']
        }, {
          model: Mesa,
          attributes: ['id', 'nombre'],
          include: [{
            model: Juego,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          attributes: ['id']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      drops = await Drop.findAll({
        where: {libro_id: libroId,
          '$Mesa.Juego.Sala.id$': userSalaIds
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at']
        }, {
          model: Mesa,
          attributes: ['id', 'nombre'],
          include: [{
            model: Juego,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre']
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(drops);
  } catch (error) {
    console.error('❌ Error obteniendo drops:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener mesas del usuario para el select
app.get('/api/user/mesas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let mesas;
    
    if (userLevel === 'TODO') {
      mesas = await Mesa.findAll({
        where: {},
        include: [{
          model: Juego,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['nombre', 'ASC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          attributes: ['id']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      mesas = await Mesa.findAll({
        where: {'$Juego.Sala.id$': userSalaIds
        },
        include: [{
          model: Juego,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['nombre', 'ASC']]
      });
    }
    
    res.json(mesas);
  } catch (error) {
    console.error('❌ Error obteniendo mesas del usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear o actualizar drop
app.post('/api/drops', authenticateToken, async (req, res) => {
  try {
    const { libro_id, mesa_id, denominacion_100, denominacion_50, denominacion_20, denominacion_10, denominacion_5, denominacion_1 } = req.body;
    
    if (!libro_id || !mesa_id) {
      return res.status(400).json({ message: 'El libro y la mesa son requeridos' });
    }

    // Verificar que la mesa existe
    const mesa = await Mesa.findByPk(mesa_id, {
      include: [{
        model: Juego,
        include: [{
          model: Sala
        }]
      }]
    });

    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }

    // Calcular total
    const total = (denominacion_100 || 0) * 100 + 
                  (denominacion_50 || 0) * 50 + 
                  (denominacion_20 || 0) * 20 + 
                  (denominacion_10 || 0) * 10 + 
                  (denominacion_5 || 0) * 5 + 
                  (denominacion_1 || 0) * 1;

    // Buscar si ya existe un drop para esta mesa y libro
    let drop = await Drop.findOne({
      where: { 
        libro_id: libro_id,
        mesa_id: mesa_id}
    });

    if (drop) {
      // Actualizar drop existente
      await drop.update({
        denominacion_100: denominacion_100 || 0,
        denominacion_50: denominacion_50 || 0,
        denominacion_20: denominacion_20 || 0,
        denominacion_10: denominacion_10 || 0,
        denominacion_5: denominacion_5 || 0,
        denominacion_1: denominacion_1 || 0,
        total: total
      });
    } else {
      // Crear nuevo drop
      drop = await Drop.create({
        libro_id: libro_id,
        mesa_id: mesa_id,
        denominacion_100: denominacion_100 || 0,
        denominacion_50: denominacion_50 || 0,
        denominacion_20: denominacion_20 || 0,
        denominacion_10: denominacion_10 || 0,
        denominacion_5: denominacion_5 || 0,
        denominacion_1: denominacion_1 || 0,
        total: total});
    }

    // Obtener el drop con sus relaciones
    const dropConMesa = await Drop.findByPk(drop.id, {
      include: [{
        model: Mesa,
        attributes: ['id', 'nombre'],
        include: [{
          model: Juego,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }]
      }]
    });

    res.status(201).json(dropConMesa);
  } catch (error) {
    console.error('❌ Error creando/actualizando drop:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar drop
app.delete('/api/drops/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const drop = await Drop.findByPk(id);
    if (!drop) {
      return res.status(404).json({ message: 'Drop no encontrado' });
    }

    await drop.destroy();
    res.json({ message: 'Drop eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando drop:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===== RUTAS PARA NOVEDADES DE MÁQUINAS =====

// Obtener novedades de máquinas del usuario
app.get('/api/novedades-maquinas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let novedades;
    
    if (userLevel === 'TODO') {
      novedades = await NovedadMaquina.findAll({
        where: {},
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          attributes: ['id']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      novedades = await NovedadMaquina.findAll({
        where: {sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(novedades);
  } catch (error) {
    console.error('❌ Error obteniendo novedades de máquinas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear novedad de máquina
app.post('/api/novedades-maquinas', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'El nombre y la sala son requeridos' });
    }

    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const novedad = await NovedadMaquina.create({
      nombre: nombre,
      sala_id: sala_id
    });

    const novedadConSala = await NovedadMaquina.findByPk(novedad.id, {
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }]
    });

    res.status(201).json(novedadConSala);
  } catch (error) {
    console.error('❌ Error creando novedad de máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar novedad de máquina
app.put('/api/novedades-maquinas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre } = req.body;
    
    const novedad = await NovedadMaquina.findByPk(id);
    if (!novedad) {
      return res.status(404).json({ message: 'Novedad de máquina no encontrada' });
    }

    await novedad.update({ nombre });
    res.json(novedad);
  } catch (error) {
    console.error('❌ Error actualizando novedad de máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar novedad de máquina
app.delete('/api/novedades-maquinas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const novedad = await NovedadMaquina.findByPk(id);
    if (!novedad) {
      return res.status(404).json({ message: 'Novedad de máquina no encontrada' });
    }

    await novedad.destroy();
    res.json({ message: 'Novedad de máquina eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando novedad de máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===== RUTAS PARA REGISTROS DE NOVEDADES DE MÁQUINAS =====

// Obtener registros de novedades de máquinas por libro
app.get('/api/novedades-maquinas-registros/:libroId', authenticateToken, async (req, res) => {
  try {
    const { libroId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let registros;
    
    if (userLevel === 'TODO') {
      registros = await NovedadMaquinaRegistro.findAll({
        where: {libro_id: libroId
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at']
        }, {
          model: Maquina,
          attributes: ['id', 'nombre'],
          include: [{
            model: Rango,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre']
            }]
          }]
        }, {
          model: NovedadMaquina,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }, {
          model: Tecnico,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          attributes: ['id']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      
      registros = await NovedadMaquinaRegistro.findAll({
        where: {libro_id: libroId
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at']
        }, {
          model: Maquina,
          attributes: ['id', 'nombre'],
          include: [{
            model: Rango,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre'],
              where: { id: userSalaIds }
            }]
          }]
        }, {
          model: NovedadMaquina,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre'],
            where: { id: userSalaIds }
          }]
        }, {
          model: Tecnico,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre'],
            where: { id: userSalaIds }
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(registros);
  } catch (error) {
    console.error('❌ Error obteniendo registros de novedades de máquinas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear o actualizar registro de novedad de máquina
app.post('/api/novedades-maquinas-registros', authenticateToken, async (req, res) => {
  try {
    const { libro_id, maquina_id, novedad_maquina_id, tecnico_id, hora } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.nivel;

    if (!libro_id || !maquina_id || !novedad_maquina_id || !tecnico_id || !hora) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar que el libro existe
    const libro = await Libro.findByPk(libro_id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Verificar que la máquina existe
    const maquina = await Maquina.findByPk(maquina_id);
    if (!maquina) {
      return res.status(404).json({ message: 'Máquina no encontrada' });
    }

    // Verificar que la novedad de máquina existe
    const novedadMaquina = await NovedadMaquina.findByPk(novedad_maquina_id);
    if (!novedadMaquina) {
      return res.status(404).json({ message: 'Novedad de máquina no encontrada' });
    }

    // Verificar que el técnico existe
    const tecnico = await Tecnico.findByPk(tecnico_id);
    if (!tecnico) {
      return res.status(404).json({ message: 'Técnico no encontrado' });
    }

    // Siempre crear un nuevo registro (no actualizar existentes)
    const registro = await NovedadMaquinaRegistro.create({
      libro_id: libro_id,
      maquina_id: maquina_id,
      novedad_maquina_id: novedad_maquina_id,
      tecnico_id: tecnico_id,
      hora: hora});

    // Obtener el registro completo con todas las relaciones
    const registroCompleto = await NovedadMaquinaRegistro.findByPk(registro.id, {
      include: [{
        model: Libro,
        attributes: ['id', 'created_at']
      }, {
        model: Maquina,
        attributes: ['id', 'nombre'],
        include: [{
          model: Rango,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre']
          }]
        }]
      }, {
        model: NovedadMaquina,
        attributes: ['id', 'nombre'],
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }]
      }, {
        model: Tecnico,
        attributes: ['id', 'nombre'],
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }]
      }]
    });

    res.status(201).json(registroCompleto);
  } catch (error) {
    console.error('❌ Error creando/actualizando registro de novedad de máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar registro de novedad de máquina
app.delete('/api/novedades-maquinas-registros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const registro = await NovedadMaquinaRegistro.findByPk(id);
    if (!registro) {
      return res.status(404).json({ message: 'Registro de novedad de máquina no encontrado' });
    }

    await registro.destroy();
    res.json({ message: 'Registro de novedad de máquina eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando registro de novedad de máquina:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ===== RUTAS PARA INCIDENCIAS GENERALES =====

// GET /api/incidencias-generales/:libroId - Obtener incidencias de un libro
app.get('/api/incidencias-generales/:libroId', authenticateToken, async (req, res) => {
  try {
    const { libroId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let incidencias;
    
    if (userLevel === 'TODO') {
      incidencias = await IncidenciaGeneral.findAll({
        where: {libro_id: libroId
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at']
        }],
        order: [['created_at', 'DESC']]
      });
    } else {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          attributes: ['id']
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      
      incidencias = await IncidenciaGeneral.findAll({
        where: {libro_id: libroId
        },
        include: [{
          model: Libro,
          attributes: ['id', 'created_at'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre'],
            where: { id: userSalaIds }
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(incidencias);
  } catch (error) {
    console.error('❌ Error obteniendo incidencias generales:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/incidencias-generales - Crear nueva incidencia
app.post('/api/incidencias-generales', authenticateToken, async (req, res) => {
  try {
    const { libro_id, descripcion, hora } = req.body;
    
    if (!libro_id || !descripcion || !hora) {
      return res.status(400).json({ message: 'Faltan campos requeridos' });
    }

    const incidencia = await IncidenciaGeneral.create({
      libro_id,
      descripcion,
      hora});

    res.status(201).json(incidencia);
  } catch (error) {
    console.error('❌ Error creando incidencia general:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/incidencias-generales/:id - Eliminar incidencia
app.delete('/api/incidencias-generales/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const incidencia = await IncidenciaGeneral.findByPk(id);
    if (!incidencia) {
      return res.status(404).json({ message: 'Incidencia no encontrada' });
    }

    await incidencia.destroy();
    res.json({ message: 'Incidencia eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando incidencia general:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE EMPLEADOS ====================

// GET /api/empleados - Obtener todos los empleados
app.get('/api/empleados', authenticateToken, async (req, res) => {
  try {
    const empleados = await Empleado.findAll({
      where: {},
      include: [
        {
          model: Cargo,
          as: 'Cargo',
          include: [
            {
              model: Departamento,
              as: 'Departamento',
              include: [
                {
                  model: Area,
                  as: 'Area',
                  include: [
                    {
                      model: Sala,
                      as: 'Sala'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: Horario,
          as: 'Horario',
          include: [
            {
              model: Sala,
              as: 'Sala'
            }
          ]
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // Agregar dispositivos a cada empleado
    for (let empleado of empleados) {
      const dispositivos = await sequelize.query(
        'SELECT d.id, d.nombre, d.ip_local, d.ip_remota, d.usuario, d.clave, s.nombre as sala_nombre FROM empleado_dispositivos ed JOIN dispositivos d ON ed.dispositivo_id = d.id LEFT JOIN salas s ON d.sala_id = s.id WHERE ed.empleado_id = ?',
        {
          replacements: [empleado.id],
          type: sequelize.QueryTypes.SELECT
        }
      );
      empleado.dataValues.dispositivos = dispositivos;
    }

    res.json(empleados);
  } catch (error) {
    console.error('❌ Error obteniendo empleados:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/empleados/:id - Obtener empleado por ID
app.get('/api/empleados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const empleado = await Empleado.findByPk(id, {
      include: [
        {
          model: Cargo,
          as: 'Cargo',
          include: [
            {
              model: Departamento,
              as: 'Departamento',
              include: [
                {
                  model: Area,
                  as: 'Area',
                  include: [
                    {
                      model: Sala,
                      as: 'Sala'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: Horario,
          as: 'Horario',
          include: [
            {
              model: Sala,
              as: 'Sala'
            }
          ]
        }
      ]
    });

    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    res.json(empleado);
  } catch (error) {
    console.error('❌ Error obteniendo empleado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/empleados - Crear nuevo empleado
app.post('/api/empleados', authenticateToken, async (req, res) => {
  try {
    const { foto, nombre, cedula, fecha_ingreso, fecha_cumpleanos, sexo, cargo_id, primer_dia_horario, horario_id, dispositivos } = req.body;
    
    if (!nombre || !cedula || !fecha_ingreso || !fecha_cumpleanos || !sexo || !cargo_id) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }

    // Verificar que el cargo existe
    const cargo = await Cargo.findByPk(cargo_id);
    if (!cargo) {
      return res.status(404).json({ message: 'Cargo no encontrado' });
    }

    // Verificar que la cédula no esté duplicada
    const empleadoExistente = await Empleado.findOne({ where: { cedula } });
    if (empleadoExistente) {
      return res.status(400).json({ message: 'Ya existe un empleado con esta cédula' });
    }

    const empleado = await Empleado.create({
      foto: foto || null,
      nombre,
      cedula,
      fecha_ingreso,
      fecha_cumpleanos,
      sexo,
      cargo_id,
      primer_dia_horario: primer_dia_horario || null,
      horario_id: horario_id || null});

    // Manejar dispositivos si se proporcionan
    if (dispositivos && dispositivos.length > 0) {
      for (const dispositivoId of dispositivos) {
        await sequelize.query(
          'INSERT INTO empleado_dispositivos (empleado_id, dispositivo_id) VALUES (?, ?)',
          { replacements: [empleado.id, dispositivoId] }
        );
      }
    }

    // Obtener el empleado con sus relaciones
    const empleadoCompleto = await Empleado.findByPk(empleado.id, {
      include: [
        {
          model: Cargo,
          as: 'Cargo',
          include: [
            {
              model: Departamento,
              as: 'Departamento',
              include: [
                {
                  model: Area,
                  as: 'Area',
                  include: [
                    {
                      model: Sala,
                      as: 'Sala'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: Horario,
          as: 'Horario',
          include: [
            {
              model: Sala,
              as: 'Sala'
            }
          ]
        }
      ]
    });

    res.status(201).json(empleadoCompleto);
  } catch (error) {
    console.error('❌ Error creando empleado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/empleados/:id - Actualizar empleado
app.put('/api/empleados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { foto, nombre, cedula, fecha_ingreso, fecha_cumpleanos, sexo, cargo_id, primer_dia_horario, horario_id, dispositivos } = req.body;
    
    const empleado = await Empleado.findByPk(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el cargo existe
    if (cargo_id) {
      const cargo = await Cargo.findByPk(cargo_id);
      if (!cargo) {
        return res.status(404).json({ message: 'Cargo no encontrado' });
      }
    }

    // Verificar que la cédula no esté duplicada (si se está cambiando)
    if (cedula && cedula !== empleado.cedula) {
      const empleadoExistente = await Empleado.findOne({ 
        where: { cedula, id: { [Op.ne]: id } } 
      });
      if (empleadoExistente) {
        return res.status(400).json({ message: 'Ya existe un empleado con esta cédula' });
      }
    }

    await empleado.update({
      foto: foto !== undefined ? foto : empleado.foto,
      nombre: nombre || empleado.nombre,
      cedula: cedula || empleado.cedula,
      fecha_ingreso: fecha_ingreso || empleado.fecha_ingreso,
      fecha_cumpleanos: fecha_cumpleanos || empleado.fecha_cumpleanos,
      sexo: sexo || empleado.sexo,
      cargo_id: cargo_id || empleado.cargo_id,
      primer_dia_horario: primer_dia_horario !== undefined ? primer_dia_horario : empleado.primer_dia_horario,
      horario_id: horario_id !== undefined ? horario_id : empleado.horario_id
    });

    // Manejar dispositivos si se proporcionan
    if (dispositivos !== undefined) {
      // Eliminar todas las relaciones existentes
      await sequelize.query('DELETE FROM empleado_dispositivos WHERE empleado_id = ?', {
        replacements: [id]
      });

      // Crear nuevas relaciones si se proporcionan dispositivos
      if (dispositivos && dispositivos.length > 0) {
        for (const dispositivoId of dispositivos) {
          await sequelize.query(
            'INSERT INTO empleado_dispositivos (empleado_id, dispositivo_id) VALUES (?, ?)',
            { replacements: [id, dispositivoId] }
          );
        }
      }
    }

    // Obtener el empleado actualizado con sus relaciones
    const empleadoActualizado = await Empleado.findByPk(id, {
      include: [
        {
          model: Cargo,
          as: 'Cargo',
          include: [
            {
              model: Departamento,
              as: 'Departamento',
              include: [
                {
                  model: Area,
                  as: 'Area',
                  include: [
                    {
                      model: Sala,
                      as: 'Sala'
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          model: Horario,
          as: 'Horario',
          include: [
            {
              model: Sala,
              as: 'Sala'
            }
          ]
        }
      ]
    });

    res.json(empleadoActualizado);
  } catch (error) {
    console.error('❌ Error actualizando empleado:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/empleados/:id - Eliminar empleado
app.delete('/api/empleados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const empleado = await Empleado.findByPk(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar si el empleado tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para empleado:', {
      id: id,
      cedula: empleado.cedula,
      nombre: empleado.nombre
    });
    
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Tareas Dispositivo Usuarios' as table_name, COUNT(*) as count FROM tareas_dispositivo_usuarios WHERE numero_cedula_empleado = ?
        UNION ALL
        SELECT 'Empleado Dispositivos' as table_name, COUNT(*) as count FROM empleado_dispositivos WHERE empleado_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [empleado.cedula, id],
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('🔍 Resultado de verificación de relaciones:', relations);

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el empleado porque tiene elementos asociados.',
        relations: relations,
        empleado: {
          id: empleado.id,
          nombre: empleado.nombre,
          cedula: empleado.cedula
        }
      });
    }

    await empleado.destroy();
    res.json({ message: 'Empleado eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando empleado:', error);
    console.error('❌ Detalles del error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/empleados/verificar-cedula/:cedula - Verificar si una cédula ya existe
app.get('/api/empleados/verificar-cedula/:cedula', authenticateToken, async (req, res) => {
  try {
    const { cedula } = req.params;
    
    const empleadoExistente = await Empleado.findOne({ 
      where: { cedula },
      attributes: ['id', 'cedula', 'nombre']
    });
    
    res.json({ 
      existe: !!empleadoExistente,
      empleado: empleadoExistente
    });
  } catch (error) {
    console.error('❌ Error verificando cédula:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE TAREAS DISPOSITIVO USUARIOS ====================

// GET /api/tareas-dispositivo-usuarios/user/:userId - Obtener tareas por usuario
app.get('/api/tareas-dispositivo-usuarios/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const tareas = await sequelize.query(
      `SELECT * FROM tareas_dispositivo_usuarios WHERE user_id = ? 
       ORDER BY 
         CASE 
           WHEN accion_realizar LIKE '%Usuario%' THEN 1
           WHEN accion_realizar LIKE '%Foto%' THEN 2
           ELSE 3
         END,
         created_at ASC`,
      {
        replacements: [userId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json(tareas);
  } catch (error) {
    console.error('❌ Error obteniendo tareas por usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/tareas-dispositivo-usuarios - Obtener todas las tareas
app.get('/api/tareas-dispositivo-usuarios', authenticateToken, async (req, res) => {
  try {
    const tareas = await sequelize.query(
      `SELECT * FROM tareas_dispositivo_usuarios 
       ORDER BY 
         CASE 
           WHEN accion_realizar LIKE '%Usuario%' THEN 1
           WHEN accion_realizar LIKE '%Foto%' THEN 2
           ELSE 3
         END,
         created_at ASC`,
      {
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json(tareas);
  } catch (error) {
    console.error('❌ Error obteniendo tareas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/tareas-dispositivo-usuarios - Crear nueva tarea
app.post('/api/tareas-dispositivo-usuarios', authenticateToken, async (req, res) => {
  try {
    const {
      user_id,
      numero_cedula_empleado,
      nombre_empleado,
      nombre_genero,
      nombre_cargo,
      nombre_sala,
      nombre_area,
      nombre_departamento,
      foto_empleado,
      ip_publica_dispositivo,
      ip_local_dispositivo,
      usuario_login_dispositivo,
      clave_login_dispositivo,
      accion_realizar,
      marcaje_empleado_inicio_dispositivo,
      marcaje_empleado_fin_dispositivo
    } = req.body;

    console.log('🔍 Datos recibidos para crear tarea:', {
      user_id,
      numero_cedula_empleado,
      nombre_empleado,
      nombre_genero,
      nombre_cargo,
      nombre_sala,
      nombre_area,
      nombre_departamento,
      foto_empleado: foto_empleado ? `Base64 (${foto_empleado.length} chars)` : 'null',
      ip_publica_dispositivo,
      ip_local_dispositivo,
      usuario_login_dispositivo,
      clave_login_dispositivo,
      accion_realizar,
      marcaje_empleado_inicio_dispositivo,
      marcaje_empleado_fin_dispositivo
    });

    // Usar SQLite directamente para evitar problemas con Sequelize
    const sqlite3 = require('sqlite3').verbose();
    const db = new sqlite3.Database('./database.sqlite');
    
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO tareas_dispositivo_usuarios (
          user_id, numero_cedula_empleado, nombre_empleado, nombre_genero, nombre_cargo,
          nombre_sala, nombre_area, nombre_departamento, foto_empleado, ip_publica_dispositivo,
          usuario_login_dispositivo, clave_login_dispositivo, accion_realizar, 
          marcaje_empleado_inicio_dispositivo, marcaje_empleado_fin_dispositivo, ip_local_dispositivo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user_id, numero_cedula_empleado, nombre_empleado, nombre_genero, nombre_cargo,
          nombre_sala, nombre_area, nombre_departamento, foto_empleado, ip_publica_dispositivo,
          usuario_login_dispositivo, clave_login_dispositivo, accion_realizar,
          marcaje_empleado_inicio_dispositivo, marcaje_empleado_fin_dispositivo, ip_local_dispositivo
        ],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
    
    db.close();

    res.status(201).json({ 
      message: 'Tarea creada correctamente',
      id: result.id
    });
  } catch (error) {
    console.error('❌ Error creando tarea:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error errno:', error.errno);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error.message,
      code: error.code
    });
  }
});

// GET /api/test-tarea - Endpoint de prueba simple (sin autenticación)
app.get('/api/test-tarea', async (req, res) => {
  try {
    console.log('🧪 Probando creación de tarea simple...');
    
    const result = await sequelize.query(
      `INSERT INTO tareas_dispositivo_usuarios (
        user_id, numero_cedula_empleado, nombre_empleado, nombre_genero, nombre_cargo,
        nombre_sala, nombre_area, nombre_departamento, foto_empleado, ip_publica_dispositivo,
        usuario_login_dispositivo, clave_login_dispositivo, accion_realizar, 
        marcaje_empleado_inicio_dispositivo, marcaje_empleado_fin_dispositivo, ip_local_dispositivo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          1, '123456', 'Test User', 'male', 'Test Cargo',
          'Test Sala', 'Test Area', 'Test Dept', '', '192.168.1.1',
          'admin', 'password', 'Test Action',
          '2025-01-01T00:00:00', '2025-12-31T23:59:59', '192.168.1.1'
        ]
      }
    );

    console.log('✅ Tarea de prueba creada exitosamente:', result);
    res.status(201).json({ 
      message: 'Tarea de prueba creada correctamente',
      id: result[0]
    });
  } catch (error) {
    console.error('❌ Error en tarea de prueba:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error code:', error.code);
    res.status(500).json({ 
      message: 'Error en tarea de prueba',
      error: error.message,
      code: error.code
    });
  }
});

// PUT /api/tareas-dispositivo-usuarios/:id - Actualizar tarea
app.put('/api/tareas-dispositivo-usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero_cedula_empleado,
      nombre_empleado,
      nombre_genero,
      nombre_cargo,
      nombre_sala,
      nombre_area,
      nombre_departamento,
      foto_empleado,
      ip_publica_dispositivo,
      ip_local_dispositivo,
      usuario_login_dispositivo,
      clave_login_dispositivo,
      accion_realizar,
      marcaje_empleado_inicio_dispositivo,
      marcaje_empleado_fin_dispositivo
    } = req.body;

    await sequelize.query(
      `UPDATE tareas_dispositivo_usuarios SET 
        numero_cedula_empleado = ?, nombre_empleado = ?, nombre_genero = ?, nombre_cargo = ?,
        nombre_sala = ?, nombre_area = ?, nombre_departamento = ?, foto_empleado = ?,
        ip_publica_dispositivo = ?, ip_local_dispositivo = ?, usuario_login_dispositivo = ?,
        clave_login_dispositivo = ?, accion_realizar = ?, marcaje_empleado_inicio_dispositivo = ?,
        marcaje_empleado_fin_dispositivo = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      {
        replacements: [
          numero_cedula_empleado, nombre_empleado, nombre_genero, nombre_cargo,
          nombre_sala, nombre_area, nombre_departamento, foto_empleado,
          ip_publica_dispositivo, ip_local_dispositivo, usuario_login_dispositivo,
          clave_login_dispositivo, accion_realizar, marcaje_empleado_inicio_dispositivo,
          marcaje_empleado_fin_dispositivo, id
        ]
      }
    );

    res.json({ message: 'Tarea actualizada correctamente' });
  } catch (error) {
    console.error('❌ Error actualizando tarea:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/tareas-dispositivo-usuarios/:id - Eliminar tarea
app.delete('/api/tareas-dispositivo-usuarios/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await sequelize.query(
      `DELETE FROM tareas_dispositivo_usuarios WHERE id = ?`,
      {
        replacements: [id]
      }
    );

    res.json({ message: 'Tarea eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando tarea:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE HIKVISION ISAPI ====================

const HikvisionISAPI = require('./hikvision-isapi');

// Función para parsear información del dispositivo desde XML
function parseDeviceInfo(xmlData) {
  try {
    // Extraer información básica del XML
    const modelMatch = xmlData.match(/<modelName>(.*?)<\/modelName>/);
    const versionMatch = xmlData.match(/<firmwareVersion>(.*?)<\/firmwareVersion>/);
    const serialMatch = xmlData.match(/<serialNumber>(.*?)<\/serialNumber>/);
    
    return {
      model: modelMatch ? modelMatch[1] : 'N/A',
      version: versionMatch ? versionMatch[1] : 'N/A',
      serial: serialMatch ? serialMatch[1] : 'N/A',
      status: 'Online',
      manufacturer: 'Hikvision',
      protocol: 'ISAPI'
    };
  } catch (error) {
    console.error('Error parsing device info:', error);
    return {
      model: 'N/A',
      version: 'N/A',
      serial: 'N/A',
      status: 'Unknown',
      manufacturer: 'Hikvision',
      protocol: 'ISAPI'
    };
  }
}

// Función para parsear usuarios desde XML
function parseUsers(data) {
  try {
    const users = [];
    
    // Verificar si es JSON o XML
    if (typeof data === 'object' && data.UserInfoSearch && data.UserInfoSearch.UserInfo) {
      // Es JSON - parsear directamente
      const userInfoArray = Array.isArray(data.UserInfoSearch.UserInfo) 
        ? data.UserInfoSearch.UserInfo 
        : [data.UserInfoSearch.UserInfo];
      
      userInfoArray.forEach(user => {
        users.push({
          id: user.id || user.employeeNo,
          name: user.name || user.userName,
          employeeNo: user.employeeNo,
          status: user.status || (user.Valid && user.Valid.enable ? 'active' : 'inactive'),
          userType: user.userType || 'normal',
          doorRight: user.doorRight || '1',
          valid: user.Valid || null
        });
      });
      
      return users;
    } else if (typeof data === 'string' && data.includes('<?xml')) {
      // Es XML - parsear con regex
      const userMatches = data.match(/<UserInfo>(.*?)<\/UserInfo>/gs);
      
      if (userMatches) {
        userMatches.forEach(userXml => {
          const idMatch = userXml.match(/<id>(.*?)<\/id>/);
          const nameMatch = userXml.match(/<name>(.*?)<\/name>/);
          const employeeNoMatch = userXml.match(/<employeeNo>(.*?)<\/employeeNo>/);
          const statusMatch = userXml.match(/<status>(.*?)<\/status>/);
        
          users.push({
            id: idMatch ? idMatch[1] : 'N/A',
            name: nameMatch ? nameMatch[1] : 'Sin nombre',
            employeeNo: employeeNoMatch ? employeeNoMatch[1] : 'N/A',
            status: statusMatch ? statusMatch[1] : 'Active'
          });
        });
      }
    }
    
    return users;
  } catch (error) {
    console.error('Error parsing users:', error);
    return [];
  }
}

// Función para parsear eventos desde XML
function parseEvents(xmlData) {
  try {
    const events = [];
    const eventMatches = xmlData.match(/<AcsEvent>(.*?)<\/AcsEvent>/gs);
    
    if (eventMatches) {
      eventMatches.forEach(eventXml => {
        const idMatch = eventXml.match(/<id>(.*?)<\/id>/);
        const employeeNoMatch = eventXml.match(/<employeeNo>(.*?)<\/employeeNo>/);
        const timeMatch = eventXml.match(/<time>(.*?)<\/time>/);
        const eventTypeMatch = eventXml.match(/<eventType>(.*?)<\/eventType>/);
        
        events.push({
          id: idMatch ? idMatch[1] : 'N/A',
          employeeNo: employeeNoMatch ? employeeNoMatch[1] : 'N/A',
          eventTime: timeMatch ? timeMatch[1] : new Date().toISOString(),
          eventType: eventTypeMatch ? eventTypeMatch[1] : 'Access'
        });
      });
    }
    
    return events;
  } catch (error) {
    console.error('Error parsing events:', error);
    return [];
  }
}

// POST /api/hikvision/test-connection - Probar conexión con biométrico
app.post('/api/hikvision/test-connection', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    console.log('🔍 Credenciales recibidas:');
    console.log('🔍 IP:', ip);
    console.log('🔍 Usuario:', usuario);
    console.log('🔍 Clave:', clave ? '[SET]' : '[NOT SET]');
    
    // Probar credenciales comunes de Hikvision si las actuales fallan
    const commonCredentials = [
      { user: 'admin', pass: '12345' },
      { user: 'admin', pass: 'admin' },
      { user: 'admin', pass: '123456' },
      { user: 'root', pass: '12345' },
      { user: 'admin', pass: 'hikvision' }
    ];
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    // Intentar primero con las credenciales proporcionadas
    let hikvision = new HikvisionISAPI(ip, usuario, clave);
    let result = await hikvision.getDeviceInfo();
    
    if (!result.success) {
      console.log('❌ Credenciales originales fallaron, probando credenciales comunes...');
      
      // Probar credenciales comunes
      for (const cred of commonCredentials) {
        console.log(`🔍 Probando: ${cred.user} / ${cred.pass}`);
        hikvision = new HikvisionISAPI(ip, cred.user, cred.pass);
        result = await hikvision.getDeviceInfo();
        
        if (result.success) {
          console.log(`✅ ¡Credenciales encontradas! ${cred.user} / ${cred.pass}`);
          break;
        }
      }
      
      if (!result.success) {
        console.log('❌ Todas las credenciales comunes fallaron');
        result = { success: false, error: 'Todas las credenciales probadas fallaron' };
      }
    }
    
    if (result.success) {
      // Parsear XML de respuesta para extraer información del dispositivo
      const deviceInfo = parseDeviceInfo(result.data);
      res.json({
        success: true,
        data: deviceInfo
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/device-info - Obtener información del dispositivo
app.post('/api/hikvision/device-info', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getDeviceInfo();
    
    if (result.success) {
      const deviceInfo = parseDeviceInfo(result.data);
      res.json({
        success: true,
        data: deviceInfo
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error getting device info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/users - Obtener usuarios registrados
app.post('/api/hikvision/users', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    console.log('👥 Obteniendo usuarios - Credenciales:');
    console.log('👥 IP:', ip);
    console.log('👥 Usuario:', usuario);
    console.log('👥 Clave:', clave ? '[SET]' : '[NOT SET]');
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUsers();
    
    console.log('👥 Resultado de getUsers:', result);
    
    if (result.success) {
      // result.data ya es el objeto JSON parseado, no necesita parseUsers()
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/events - Obtener eventos de acceso
app.post('/api/hikvision/events', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, startTime, endTime } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getEvents(startTime, endTime);
    
    if (result.success) {
      // result.data ya es el objeto JSON parseado, no necesita parseEvents()
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error getting events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/photos - Obtener fotos registradas
app.post('/api/hikvision/photos', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getPhotos();
    
    if (result.success) {
      // Por ahora devolvemos un array vacío ya que las fotos se manejan de forma diferente
      res.json({
        success: true,
        data: []
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error getting photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/sync - Sincronizar datos
app.post('/api/hikvision/sync', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.syncData();
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RUTAS DE DISPOSITIVOS ====================

// GET /api/dispositivos - Obtener todos los dispositivos
app.get('/api/dispositivos', authenticateToken, async (req, res) => {
  try {
    const dispositivos = await Dispositivo.findAll({
      where: {},
      include: [
        {
          model: Sala,
          as: 'Sala'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(dispositivos);
  } catch (error) {
    console.error('❌ Error obteniendo dispositivos:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/dispositivos/by-ids - Obtener dispositivos por IDs
app.post('/api/dispositivos/by-ids', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'IDs de dispositivos requeridos' });
    }

    const dispositivos = await Dispositivo.findAll({
      where: { 
        id: { [Op.in]: ids }},
      include: [
        {
          model: Sala,
          as: 'Sala'
        }
      ]
    });

    res.json(dispositivos);
  } catch (error) {
    console.error('❌ Error obteniendo dispositivos por IDs:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/dispositivos/:id - Obtener dispositivo por ID
app.get('/api/dispositivos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dispositivo = await Dispositivo.findByPk(id, {
      include: [
        {
          model: Sala,
          as: 'Sala'
        }
      ]
    });

    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    res.json(dispositivo);
  } catch (error) {
    console.error('❌ Error obteniendo dispositivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/dispositivos - Crear nuevo dispositivo
app.post('/api/dispositivos', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id, ip_local, ip_remota, usuario, clave, marcaje_inicio, marcaje_fin } = req.body;
    
    if (!nombre || !sala_id || !ip_local) {
      return res.status(400).json({ message: 'Nombre, sala e IP local son requeridos' });
    }

    // Verificar que la sala existe
    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    const dispositivo = await Dispositivo.create({
      nombre,
      sala_id,
      ip_local,
      ip_remota: ip_remota || null,
      usuario: usuario || null,
      clave: clave || null,
      marcaje_inicio: marcaje_inicio || null,
      marcaje_fin: marcaje_fin || null});

    // Obtener el dispositivo con sus relaciones
    const dispositivoCompleto = await Dispositivo.findByPk(dispositivo.id, {
      include: [
        {
          model: Sala,
          as: 'Sala'
        }
      ]
    });

    res.status(201).json(dispositivoCompleto);
  } catch (error) {
    console.error('❌ Error creando dispositivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/dispositivos/:id - Actualizar dispositivo
app.put('/api/dispositivos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id, ip_local, ip_remota, usuario, clave, marcaje_inicio, marcaje_fin } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Verificar que la sala existe
    if (sala_id) {
      const sala = await Sala.findByPk(sala_id);
      if (!sala) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }
    }

    await dispositivo.update({
      nombre: nombre || dispositivo.nombre,
      sala_id: sala_id || dispositivo.sala_id,
      ip_local: ip_local || dispositivo.ip_local,
      ip_remota: ip_remota !== undefined ? ip_remota : dispositivo.ip_remota,
      usuario: usuario !== undefined ? usuario : dispositivo.usuario,
      clave: clave !== undefined ? clave : dispositivo.clave,
      marcaje_inicio: marcaje_inicio !== undefined ? marcaje_inicio : dispositivo.marcaje_inicio,
      marcaje_fin: marcaje_fin !== undefined ? marcaje_fin : dispositivo.marcaje_fin
    });

    // Obtener el dispositivo actualizado con sus relaciones
    const dispositivoActualizado = await Dispositivo.findByPk(id, {
      include: [
        {
          model: Sala,
          as: 'Sala'
        }
      ]
    });

    res.json(dispositivoActualizado);
  } catch (error) {
    console.error('❌ Error actualizando dispositivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/dispositivos/:id - Eliminar dispositivo (soft delete)
app.delete('/api/dispositivos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Verificar si el dispositivo tiene relaciones que impidan su eliminación
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Empleado Dispositivos' as table_name, COUNT(*) as count FROM empleado_dispositivos WHERE dispositivo_id = ?
        UNION ALL
        SELECT 'Tareas Dispositivo Usuarios' as table_name, COUNT(*) as count FROM tareas_dispositivo_usuarios WHERE ip_publica_dispositivo = ? OR ip_local_dispositivo = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id, dispositivo.ip_publica, dispositivo.ip_local],
      type: sequelize.QueryTypes.SELECT
    });

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el dispositivo porque tiene elementos asociados.',
        relations: relations,
        dispositivo: {
          id: dispositivo.id,
          nombre: dispositivo.nombre,
          ip_publica: dispositivo.ip_publica
        }
      });
    }

    await dispositivo.destroy();
    res.json({ message: 'Dispositivo eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando dispositivo:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Iniciar servidor
// Ruta para descubrir endpoints disponibles
app.post('/api/hikvision/discover', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.discoverEndpoints();
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/discover:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener capacidades de usuarios
app.post('/api/hikvision/user-capabilities', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUserCapabilities();
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/user-capabilities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener capacidades del dispositivo
app.post('/api/hikvision/device-capabilities', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getDeviceCapabilities();
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/device-capabilities:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener stream de cámara
app.post('/api/hikvision/camera-stream', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, streamType = 'preview' } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getCameraStream(streamType);
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/camera-stream:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener foto del usuario
app.post('/api/hikvision/user-photo', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, fpid } = req.body;
    
    if (!ip || !usuario || !clave || !fpid) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y FPID son requeridos' });
    }

    console.log(`📸 Obteniendo foto para FPID: ${fpid}`);
    console.log(`📸 Dispositivo: ${ip}, Usuario: ${usuario}`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUserPhoto(fpid);
    
    console.log(`📸 Resultado de getUserPhoto:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/user-photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener información específica de un usuario
app.post('/api/hikvision/get-user-info', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y employeeNo son requeridos' });
    }

    console.log(`👤 Obteniendo información del usuario: ${employeeNo}`);
    console.log(`👤 Dispositivo: ${ip}, Usuario: ${usuario}`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUserInfo(employeeNo);
    
    console.log(`👤 Resultado de getUserInfo:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/get-user-info:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para eliminar rostro de usuario
app.post('/api/hikvision/delete-user-face', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y employeeNo son requeridos' });
    }

    console.log(`🗑️ Eliminando rostro del usuario: ${employeeNo}`);
    console.log(`🗑️ Dispositivo: ${ip}, Usuario: ${usuario}`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUserFace(employeeNo);
    
    console.log(`🗑️ Resultado de deleteUserFace:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/delete-user-face:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para eliminar usuario completo
app.post('/api/hikvision/delete-user', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo } = req.body;
    
    console.log(`🗑️ Recibiendo solicitud de eliminación de usuario:`, { ip, usuario, clave, employeeNo });
    
    if (!ip || !usuario || !clave || !employeeNo) {
      console.log(`❌ Faltan parámetros requeridos`);
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y employeeNo son requeridos' });
    }
    
    console.log(`🗑️ Eliminando usuario completo: ${employeeNo}`);
    console.log(`🗑️ Dispositivo: ${ip}, Usuario: ${usuario}`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUser(employeeNo);
    
    console.log(`🗑️ Resultado de deleteUser:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/delete-user:', error);
    console.error('Error completo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para eliminar solo la foto del usuario
app.post('/api/hikvision/delete-user-photo-only', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, deletePhotoPayload } = req.body;
    
    if (!ip || !usuario || !clave || !deletePhotoPayload) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y deletePhotoPayload son requeridos' });
    }

    console.log(`🗑️ Eliminando solo la foto del usuario`);
    console.log(`🗑️ Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`🗑️ Payload:`, deletePhotoPayload);

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUserPhotoOnly(deletePhotoPayload);

    console.log(`🗑️ Resultado de deleteUserPhotoOnly:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/delete-user-photo-only:', error);
    console.error('Error completo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para registrar rostro de usuario con payload completo
app.post('/api/hikvision/register-user-face-payload', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, facePayload } = req.body;
    
    if (!ip || !usuario || !clave || !facePayload) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y facePayload son requeridos' });
    }

    console.log(`📸 Registrando rostro del usuario`);
    console.log(`📸 Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`📸 Payload:`, facePayload);

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFaceWithPayload(facePayload);

    console.log(`📸 Resultado de registerUserFaceWithPayload:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/register-user-face-payload:', error);
    console.error('Error completo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para registrar rostro de usuario
app.post('/api/hikvision/register-user-face', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo, name, gender, faceDataBase64 } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo || !name || !faceDataBase64) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave, employeeNo, name y faceDataBase64 son requeridos' });
    }

    console.log(`👤 Registrando rostro del usuario: ${employeeNo}`);
    console.log(`👤 Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`👤 Nombre: ${name}, Gender: ${gender}`);
    console.log(`👤 Tamaño de imagen base64: ${faceDataBase64.length} caracteres`);
    console.log(`👤 IMAGEN BASE64 COMPLETA:`);
    console.log(faceDataBase64);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceDataBase64);
    
    console.log(`👤 Resultado de registerUserFace:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/register-user-face:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Ruta para probar límites del campo faceURL
app.post('/api/hikvision/test-faceurl-limit', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    console.log(`🔍 Probando límites del campo faceURL...`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    
    // Probar con diferentes tamaños de base64
    const testSizes = [
      { size: 1000, description: '1KB' },
      { size: 5000, description: '5KB' },
      { size: 10000, description: '10KB' },
      { size: 20000, description: '20KB' },
      { size: 50000, description: '50KB' },
      { size: 100000, description: '100KB' }
    ];
    
    const results = [];
    
    for (const test of testSizes) {
      // Generar base64 de prueba del tamaño especificado
      const testBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(test.size);
      
      console.log(`🔍 Probando con ${test.description} (${testBase64.length} caracteres)...`);
      
      const testPayload = {
        "faceURL": testBase64,
        "faceLibType": "blackFD",
        "FDID": "1",
        "FPID": "TEST123",
        "name": "Test User",
        "gender": "male",
        "featurePointType": "face"
      };
      
      try {
        const result = await hikvision.makeRequest('/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json', 'POST', testPayload);
        
        results.push({
          size: test.size,
          description: test.description,
          characters: testBase64.length,
          success: result.success,
          statusCode: result.data?.statusCode,
          statusString: result.data?.statusString,
          errorMsg: result.data?.errorMsg
        });
        
        console.log(`🔍 ${test.description}: ${result.success ? '✅ ÉXITO' : '❌ FALLO'} - ${result.data?.statusString || 'Sin respuesta'}`);
        
      } catch (error) {
        results.push({
          size: test.size,
          description: test.description,
          characters: testBase64.length,
          success: false,
          error: error.message
        });
        
        console.log(`🔍 ${test.description}: ❌ ERROR - ${error.message}`);
      }
    }
    
    res.json({
      success: true,
      data: {
        message: 'Prueba de límites completada',
        results: results
      }
    });
    
  } catch (error) {
    console.error('Error en /api/hikvision/test-faceurl-limit:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Map para almacenar imágenes temporales con URLs cortas
const tempImages = new Map();

// Función para subir imagen a servidor PHP (eliminación automática en 5 minutos)
async function uploadToPhpServer(base64Image) {
  try {
    console.log('📤 Subiendo imagen a servidor PHP (eliminación automática en 5 minutos)...');
    
    // Remover el prefijo data:image/...;base64, del base64
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convertir base64 a Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('📤 Tamaño del buffer:', imageBuffer.length, 'bytes');
    
    // Crear FormData usando el módulo form-data
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Agregar el archivo directamente como Buffer
    formData.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });
    
    console.log('📤 Headers FormData:', formData.getHeaders());
    
    // Usar axios en lugar de fetch para mejor compatibilidad
    const axios = require('axios');
    
    const response = await axios.post('http://hotelroraimainn.com/upload.php', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 segundos timeout
    });
    
    console.log('📤 Status del servidor PHP:', response.status);
    console.log('📤 Headers del servidor PHP:', response.headers);
    console.log('📤 Respuesta del servidor PHP:', response.data);
    
    if (response.data && response.data.success && response.data.url) {
      console.log('✅ Imagen subida al servidor PHP exitosamente!');
      console.log('📤 URL temporal:', response.data.url);
      console.log('📤 Tamaño de URL:', response.data.url.length, 'caracteres');
      console.log('📤 ¿Dentro del límite de 1024?:', response.data.url.length <= 1024 ? '✅ SÍ' : '❌ NO');
      console.log('📤 Accesible desde cualquier dispositivo');
      console.log('📤 ⏰ Eliminación automática en 5 minutos');
      console.log('📤 Sin autenticación requerida');
      return response.data.url;
    } else {
      console.error('❌ Error subiendo al servidor PHP:', response.data);
      return null;
    }
  } catch (error) {
    console.error('❌ Error en uploadToPhpServer:', error.message);
    if (error.response) {
      console.error('❌ Status:', error.response.status);
      console.error('❌ Headers:', error.response.headers);
      console.error('❌ Data:', error.response.data);
    }
    return null;
  }
}

// Limpiar imágenes expiradas cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [id, imageData] of tempImages.entries()) {
    if (imageData.expires < now) {
      tempImages.delete(id);
      console.log('🗑️ Imagen temporal eliminada:', id);
    }
  }
}, 5 * 60 * 1000); // 5 minutos

// Ruta para servir imágenes temporales
app.get('/img/:id', (req, res) => {
  const imageId = req.params.id;
  const imageData = tempImages.get(imageId);
  
  if (!imageData) {
    return res.status(404).json({ error: 'Imagen no encontrada' });
  }
  
  // Decodificar base64 y servir como imagen
  const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');
  
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', 'no-cache');
  res.send(imageBuffer);
});

// Ruta para registrar rostro de usuario con ImgBB (URL pública gratuita)
app.post('/api/hikvision/register-user-face-imgbb', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo, name, gender, imageBase64 } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo || !name || !imageBase64) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave, employeeNo, name e imageBase64 son requeridos' });
    }

    console.log(`👤 Registrando rostro del usuario con servidor PHP: ${employeeNo}`);
    console.log(`👤 Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`👤 Nombre: ${name}, Gender: ${gender}`);
    console.log(`👤 Tamaño de base64: ${imageBase64.length} caracteres`);
    
    // Subir imagen a servidor PHP y obtener URL temporal
    const publicURL = await uploadToPhpServer(imageBase64);
    
    if (!publicURL) {
      return res.status(500).json({ 
        success: false, 
        error: 'No se pudo subir la imagen al servidor PHP' 
      });
    }
    
    console.log(`👤 URL temporal generada por servidor PHP: ${publicURL}`);
    console.log(`👤 Longitud de URL: ${publicURL.length} caracteres`);
    console.log(`👤 ¿Dentro del límite de 1024?: ${publicURL.length <= 1024 ? '✅ SÍ' : '❌ NO'}`);
    console.log(`👤 URL completa para probar en navegador: ${publicURL}`);
    console.log(`👤 ⏰ Esta imagen se eliminará automáticamente en 5 minutos`);
    
    // Crear el payload que se enviará al dispositivo
    const payloadToDevice = {
      "faceURL": publicURL,
      "faceLibType": "blackFD",
      "FDID": "1",
      "FPID": employeeNo,
      "name": name,
      "gender": gender || "male",
      "featurePointType": "face"
    };
    
    console.log(`👤 PAYLOAD COMPLETO QUE SE ENVÍA AL DISPOSITIVO:`);
    console.log(`👤 faceURL (URL del servidor PHP): ${payloadToDevice.faceURL}`);
    console.log(`👤 faceURL (primeros 100 chars): ${payloadToDevice.faceURL.substring(0, 100)}...`);
    console.log(`👤 faceURL (últimos 50 chars): ...${payloadToDevice.faceURL.substring(payloadToDevice.faceURL.length - 50)}`);
    console.log(`👤 Payload completo:`, JSON.stringify(payloadToDevice, null, 2));
    
    // 🧪 CONSOLE PARA COPIAR Y PEGAR LA URL EN EL NAVEGADOR
    console.log(`\n🧪 ===== COPIA Y PEGA ESTA URL EN EL NAVEGADOR =====`);
    console.log(`📋 URL del servidor PHP para probar (expira en 5 minutos):`);
    console.log(publicURL);
    console.log(`🧪 ===== FIN DE LA URL PARA COPIAR =====\n`);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, publicURL);
    
    console.log(`👤 Resultado de registerUserFace:`, result);
    
    // Agregar el payload a la respuesta para verificación
    if (result.success) {
      result.data.payloadToDevice = payloadToDevice;
      result.data.publicURL = publicURL;
      result.data.faceURL = publicURL;
    } else {
      result.payloadToDevice = payloadToDevice;
      result.publicURL = publicURL;
      result.faceURL = publicURL;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/register-user-face-imgbb:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para registrar rostro de usuario con URL externa (mantener compatibilidad)
app.post('/api/hikvision/register-user-face-url', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo, name, gender, imageBase64 } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo || !name || !imageBase64) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave, employeeNo, name e imageBase64 son requeridos' });
    }

    console.log(`👤 Registrando rostro del usuario con URL externa: ${employeeNo}`);
    console.log(`👤 Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`👤 Nombre: ${name}, Gender: ${gender}`);
    console.log(`👤 Tamaño de base64: ${imageBase64.length} caracteres`);
    
    // Generar ID único para la imagen
    const imageId = `face_${employeeNo}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Almacenar imagen en memoria
    tempImages.set(imageId, imageBase64);
    
    // Crear URL externa corta
    const faceURL = `http://${ip.split(':')[0]}:3000/img/${imageId}`;
    
    console.log(`👤 URL generada: ${faceURL}`);
    console.log(`👤 Longitud de URL: ${faceURL.length} caracteres`);
    console.log(`👤 ¿Dentro del límite de 1024?: ${faceURL.length <= 1024 ? '✅ SÍ' : '❌ NO'}`);
    
    // Crear el payload que se enviará al dispositivo
    const payloadToDevice = {
      "faceURL": faceURL,
      "faceLibType": "blackFD",
      "FDID": "1",
      "FPID": employeeNo,
      "name": name,
      "gender": gender || "male",
      "featurePointType": "face"
    };
    
    console.log(`👤 PAYLOAD COMPLETO QUE SE ENVÍA AL DISPOSITIVO:`);
    console.log(`👤 faceURL (primeros 200 chars): ${payloadToDevice.faceURL.substring(0, 200)}...`);
    console.log(`👤 faceURL (últimos 50 chars): ...${payloadToDevice.faceURL.substring(payloadToDevice.faceURL.length - 50)}`);
    console.log(`👤 Payload completo:`, JSON.stringify(payloadToDevice, null, 2));
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceURL);
    
    console.log(`👤 Resultado de registerUserFace:`, result);
    
    // Limpiar imagen temporal después de 5 minutos
    setTimeout(() => {
      tempImages.delete(imageId);
      console.log(`🧹 Imagen temporal eliminada: ${imageId}`);
    }, 5 * 60 * 1000);
    
    // Agregar el payload a la respuesta para verificación
    if (result.success) {
      result.data.payloadToDevice = payloadToDevice;
      result.data.imageId = imageId;
      result.data.faceURL = faceURL;
    } else {
      result.payloadToDevice = payloadToDevice;
      result.imageId = imageId;
      result.faceURL = faceURL;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/register-user-face-url:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para registrar rostro de usuario con base64 comprimido (mantener compatibilidad)
app.post('/api/hikvision/register-user-face-compressed', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo, name, gender, compressedBase64 } = req.body;
    
    if (!ip || !usuario || !clave || !employeeNo || !name || !compressedBase64) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave, employeeNo, name y compressedBase64 son requeridos' });
    }

    console.log(`👤 Registrando rostro del usuario con base64 comprimido: ${employeeNo}`);
    console.log(`👤 Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`👤 Nombre: ${name}, Gender: ${gender}`);
    console.log(`👤 Tamaño de base64 comprimido: ${compressedBase64.length} caracteres`);
    
    // Usar directamente el base64 optimizado que viene del frontend (WebP/PNG/JPEG)
    const faceURL = compressedBase64;
    console.log(`👤 Base64 optimizado recibido del frontend:`);
    console.log(`👤 Primeros 100 chars: ${faceURL.substring(0, 100)}...`);
    console.log(`👤 Tamaño total: ${faceURL.length} caracteres`);
    console.log(`👤 Tamaño en KB: ${(faceURL.length / 1024).toFixed(2)} KB`);
    console.log(`👤 Prefijo detectado: ${faceURL.substring(0, 30)}`);
    console.log(`👤 Formato: ${faceURL.includes('image/webp') ? 'WebP' : faceURL.includes('image/png') ? 'PNG' : 'JPEG'}`);
    console.log(`👤 LÍMITE RECOMENDADO: < 7,000 caracteres para evitar beyondARGSRangeLimit`);
    console.log(`👤 ¿Dentro del límite?: ${faceURL.length < 7000 ? '✅ SÍ' : '❌ NO'}`);
    
    // Crear el payload que se enviará al dispositivo
    const payloadToDevice = {
      "faceURL": faceURL,
      "faceLibType": "blackFD",
      "FDID": "1",
      "FPID": employeeNo,
      "name": name,
      "gender": gender || "male",
      "featurePointType": "face"
    };
    
    console.log(`👤 PAYLOAD COMPLETO QUE SE ENVÍA AL DISPOSITIVO:`);
    console.log(`👤 faceURL (primeros 200 chars): ${payloadToDevice.faceURL.substring(0, 200)}...`);
    console.log(`👤 faceURL (últimos 50 chars): ...${payloadToDevice.faceURL.substring(payloadToDevice.faceURL.length - 50)}`);
    console.log(`👤 Payload completo:`, JSON.stringify(payloadToDevice, null, 2));
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceURL);
    
    console.log(`👤 Resultado de registerUserFace:`, result);
    
    // Agregar el payload a la respuesta para verificación
    if (result.success) {
      result.data.payloadToDevice = payloadToDevice;
      result.data.base64Length = faceURL.length;
    } else {
      result.payloadToDevice = payloadToDevice;
      result.base64Length = faceURL.length;
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/register-user-face-compressed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para actualizar usuario
app.post('/api/hikvision/update-user', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, userData } = req.body;
    
    if (!ip || !usuario || !clave || !userData) {
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y userData son requeridos' });
    }

    console.log(`✏️ Actualizando usuario: ${userData.employeeNo}`);
    console.log(`✏️ Dispositivo: ${ip}, Usuario: ${usuario}`);
    console.log(`✏️ Datos del usuario:`, userData);
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.updateUser(userData);
    
    console.log(`✏️ Resultado de updateUser:`, result);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/update-user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para servir imágenes como proxy (evitar CORS)
app.get('/api/hikvision/image-proxy', async (req, res) => {
  try {
    const { url, ip, usuario, clave } = req.query;
    
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL es requerida' });
    }

    console.log(`🖼️ Proxying image: ${url}`);
    console.log(`🖼️ Device: ${ip}, User: ${usuario}`);
    
    // Si tenemos credenciales del dispositivo, usar autenticación digest
    if (ip && usuario && clave) {
      try {
        // Implementar digest authentication manualmente para imágenes
        const crypto = require('crypto');
        
        // Primera petición para obtener el challenge
        const challengeResponse = await axios.get(url, {
          timeout: 10000,
          validateStatus: function (status) {
            return status === 401; // Solo aceptar 401
          }
        });
        
        const wwwAuthenticate = challengeResponse.headers['www-authenticate'];
        if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
          // Parsear el challenge
          const realm = wwwAuthenticate.match(/realm="([^"]+)"/)?.[1];
          const nonce = wwwAuthenticate.match(/nonce="([^"]+)"/)?.[1];
          const qop = wwwAuthenticate.match(/qop="([^"]+)"/)?.[1];
          
          if (realm && nonce) {
            // Generar respuesta digest
            const ha1 = crypto.createHash('md5').update(`${usuario}:${realm}:${clave}`).digest('hex');
            const ha2 = crypto.createHash('md5').update(`GET:${url}`).digest('hex');
            const response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
            
            // Segunda petición con digest
            const digestResponse = await axios.get(url, {
              responseType: 'stream',
              timeout: 15000,
              headers: {
                'Authorization': `Digest username="${usuario}", realm="${realm}", nonce="${nonce}", uri="${url}", response="${response}"`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'image/*'
              }
            });
            
            // Enviar la imagen
            res.set({
              'Content-Type': digestResponse.headers['content-type'] || 'image/jpeg',
              'Content-Length': digestResponse.headers['content-length'],
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type'
            });
            
            return digestResponse.data.pipe(res);
          }
        }
      } catch (digestError) {
        console.log('❌ Autenticación digest falló, intentando básica...');
      }
    }
    
    // Fallback a autenticación básica
    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*',
          'Accept-Encoding': 'identity'
        },
        auth: {
          username: usuario || 'admin',
          password: clave || 'admin123'
        }
      });
      
      // Copiar headers de la respuesta original
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Content-Length': response.headers['content-length'],
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
      // Pipe la imagen al response
      response.data.pipe(res);
      
    } catch (basicError) {
      console.log('❌ Autenticación básica también falló');
      throw basicError;
    }
    
  } catch (error) {
    console.error('Error proxying image:', error.message);
    console.error('Error details:', error.response?.status, error.response?.statusText);
    res.status(500).json({ 
      success: false, 
      error: 'Error cargando imagen',
      details: error.message,
      status: error.response?.status
    });
  }
});

// Ruta para descubrir canales de streaming
app.post('/api/hikvision/discover-channels', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.discoverStreamingChannels();
    
    res.json(result);
  } catch (error) {
    console.error('Error en /api/hikvision/discover-channels:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RUTAS DE HIK-CONNECT ====================

// Usar las rutas de Hik-Connect
app.use('/api/hik-connect', hikConnectRoutes);

// ==================== RUTAS HÍBRIDAS WISI-HIKVISION ====================
// Usar las rutas híbridas
app.use('/api/wisi-hikvision', hybridRoutes);

// ==================== RUTAS TPP HIKVISION ====================
// Inicializar cliente TPP
const tppClient = new TPPHikvisionAPI();

// Ruta para autenticar con TPP
app.post('/api/tpp/authenticate', authenticateToken, async (req, res) => {
  try {
    const result = await tppClient.authenticate();
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/authenticate:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener dispositivos TPP
app.get('/api/tpp/devices', authenticateToken, async (req, res) => {
  try {
    const result = await tppClient.getDevices();
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/devices:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener usuarios de un dispositivo TPP
app.get('/api/tpp/devices/:deviceId/users', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await tppClient.getDeviceUsers(deviceId);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/devices/:deviceId/users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener eventos de un dispositivo TPP
app.get('/api/tpp/devices/:deviceId/events', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startTime, endTime } = req.query;
    const result = await tppClient.getDeviceEvents(deviceId, startTime, endTime);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/devices/:deviceId/events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener foto de usuario desde TPP
app.get('/api/tpp/devices/:deviceId/users/:userId/photo', authenticateToken, async (req, res) => {
  try {
    const { deviceId, userId } = req.params;
    const result = await tppClient.getUserPhoto(deviceId, userId);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/devices/:deviceId/users/:userId/photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para sincronizar TPP con ISAPI
app.post('/api/tpp/sync/:deviceId', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { ip, usuario, clave } = req.body;
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const HikvisionISAPI = require('./hikvision-isapi');
    const isapiClient = new HikvisionISAPI(ip, usuario, clave);
    
    const result = await tppClient.syncWithISAPI(deviceId, isapiClient);
    res.json(result);
  } catch (error) {
    console.error('Error en /api/tpp/sync/:deviceId:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🌐 Hik-Connect API: http://localhost:${PORT}/api/hik-connect`);
  console.log(`🔧 WISI-Hikvision Hybrid API: http://localhost:${PORT}/api/wisi-hikvision`);
  console.log(`🚀 TPP Hikvision API: http://localhost:${PORT}/api/tpp`);
});
