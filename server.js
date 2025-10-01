const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
      console.log('⚠️ No se encontró usuario creador para asignación automática');
      return;
    }

    console.log(`🔄 Asignando ${elementType} al usuario creador:`, creator.usuario);

    switch (elementType) {
      case 'sala':
        await creator.addSala(element);
        console.log(`✅ Sala "${element.nombre}" asignada al creador`);
        break;
        
      case 'module':
        await creator.addModule(element);
        console.log(`✅ Módulo "${element.nombre}" asignado al creador`);
        break;
        
      case 'permission':
        await creator.addPermission(element);
        console.log(`✅ Permiso "${element.nombre}" asignado al creador`);
        break;
        
      case 'page':
        // Las páginas no se asignan directamente a usuarios, pero registramos la creación
        console.log(`✅ Página "${element.nombre}" creada - el creador tiene acceso automático`);
        break;
        
      default:
        console.log(`⚠️ Tipo de elemento no reconocido para asignación automática: ${elementType}`);
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
  legacyHeaders: false,
});
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
    
    console.log(`Verificando permisos - Usuario: ${req.user.usuario}, Nivel: ${userLevel}, Requerido: ${requiredLevel}`);
    
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
      where: { usuario, activo: true },
      include: [
        { model: Sala, through: UserSala, where: { activo: true }, required: false },
        { model: Module, through: UserModule, where: { activo: true }, required: false }
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
      where: { 
        activo: true,
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
      const salasToAssign = await Sala.findAll({ where: { id: salas, activo: true } });
      await user.addSalas(salasToAssign);
    }

    // Asignar módulos con permisos específicos
    if (modulePermissions && modulePermissions.length > 0) {
      for (const modulePermission of modulePermissions) {
        const { moduleId, permissions } = modulePermission;
        
        // Verificar que el módulo exista y esté activo
        const module = await Module.findOne({ where: { id: moduleId, activo: true } });
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
            console.log(`🔐 Agregando permiso VER automáticamente al módulo ${moduleId}`);
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
      const salasToAssign = await Sala.findAll({ where: { id: salas, activo: true } });
      await user.setSalas(salasToAssign);
    } else {
      await user.setSalas([]);
    }

    // Limpiar módulos y permisos anteriores
    await user.setModules([]);
    await UserModulePermission.destroy({ where: { user_id: id } });

    // Asignar nuevos módulos con permisos específicos
    if (modulePermissions && modulePermissions.length > 0) {
      console.log('🔧 Asignando módulos y permisos:', modulePermissions);
      
      for (const modulePermission of modulePermissions) {
        const { moduleId, permissions } = modulePermission;
        console.log(`📋 Procesando módulo ${moduleId} con permisos:`, permissions);
        
        // Verificar que el módulo exista y esté activo
        const module = await Module.findOne({ where: { id: moduleId, activo: true } });
        if (!module) {
          console.log(`❌ Módulo ${moduleId} no encontrado o inactivo`);
          continue;
        }

        // Verificar que el módulo tenga al menos un permiso
        if (!permissions || permissions.length === 0) {
          console.log(`⚠️ Módulo ${moduleId} sin permisos, saltando...`);
          continue;
        }

        // Asignar el módulo al usuario
        await user.addModule(module);
        console.log(`✅ Módulo ${moduleId} asignado al usuario`);

        // Buscar el permiso VER
        const verPermission = await Permission.findOne({ where: { nombre: 'VER' } });
        
        // Asignar permisos específicos para este módulo
        for (const permissionId of permissions) {
          const permission = await Permission.findByPk(permissionId);
          if (permission) {
            console.log(`🔐 Asignando permiso ${permissionId} (${permission.nombre}) al módulo ${moduleId}`);
            
            await UserModulePermission.create({
              user_id: id,
              module_id: moduleId,
              permission_id: permissionId
            });
          } else {
            console.log(`❌ Permiso ${permissionId} no encontrado`);
          }
        }
        
        // Agregar automáticamente el permiso VER si no está ya incluido
        if (verPermission && !permissions.includes(verPermission.id)) {
          console.log(`🔐 Agregando permiso VER automáticamente al módulo ${moduleId}`);
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
    const { nombre_apellido, usuario, nivel, activo } = req.body;

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
      nivel,
      activo
    });

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
    const salas = await Sala.findAll({ where: { activo: true } });
    res.json(salas);
  } catch (error) {
    console.error('Error obteniendo salas:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/salas', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { nombre } = req.body;
    
    console.log('Creando sala:', { nombre, usuario: req.user.usuario });

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Verificar que la sala no exista
    const existingSala = await Sala.findOne({ where: { nombre } });
    if (existingSala) {
      return res.status(400).json({ message: 'Ya existe una sala con ese nombre' });
    }

    const sala = await Sala.create({ nombre });
    
    console.log('Sala creada exitosamente:', sala.toJSON());

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
    const { nombre, activo } = req.body;

    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    await sala.update({ nombre, activo });

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

    await sala.destroy();

    res.json({ message: 'Sala eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando sala:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS DE MÓDULOS
// =============================================

app.get('/api/modules', authenticateToken, async (req, res) => {
  try {
    const modules = await Module.findAll({ 
      where: { activo: true },
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

// Obtener todos los módulos (incluyendo inactivos) - solo para administradores
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
    
    console.log('Creando módulo:', { nombre, icono, ruta, page_id, usuario: req.user.usuario });

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
      page_id: page_id || null, 
      activo: true 
    });
    
    console.log('Módulo creado exitosamente:', module.toJSON());

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
    const { nombre, icono, ruta, activo, page_id } = req.body;

    const module = await Module.findByPk(id);
    if (!module) {
      return res.status(404).json({ message: 'Módulo no encontrado' });
    }

    await module.update({ nombre, icono, ruta, activo, page_id });

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
      where: { activo: true },
      include: [{
        model: Module,
        where: { activo: true },
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
    
    console.log('Creando página:', { nombre, icono, orden, usuario: req.user.usuario });

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
      orden: orden || 0, 
      activo: true 
    });
    
    console.log('Página creada exitosamente:', page.toJSON());

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
    const { nombre, icono, orden, activo } = req.body;

    const page = await Page.findByPk(id);
    if (!page) {
      return res.status(404).json({ message: 'Página no encontrada' });
    }

    await page.update({ nombre, icono, orden, activo });

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
    console.log('🔍 Obteniendo permisos para usuario ID:', userId, 'Nivel:', userLevel);
    
    // Si es el usuario creador (TODO), devolver todos los permisos de todos los módulos
    if (userLevel === 'TODO') {
      console.log('🔓 Usuario creador - devolviendo todos los permisos');
      
      const allModules = await Module.findAll({ where: { activo: true } });
      const allPermissions = await Permission.findAll({ where: { activo: true } });
      
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
      
      console.log('📋 Permisos del creador:', creatorPermissions.length);
      return res.json(creatorPermissions);
    }
    
    // Para usuarios normales, obtener permisos específicos
    const userPermissions = await UserModulePermission.findAll({
      where: { user_id: userId },
      include: [
        {
          model: Module,
          where: { activo: true }
        },
        {
          model: Permission,
          where: { activo: true }
        }
      ]
    });

    console.log('📋 Permisos encontrados:', userPermissions.length);
    
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
    console.log('🔧 Asignando permisos de prueba para usuario:', userId);
    
    // Obtener todos los módulos y permisos
    const modules = await Module.findAll({ where: { activo: true } });
    const permissions = await Permission.findAll({ where: { activo: true } });
    
    console.log('📋 Módulos disponibles:', modules.map(m => ({ id: m.id, nombre: m.nombre })));
    console.log('📋 Permisos disponibles:', permissions.map(p => ({ id: p.id, nombre: p.nombre })));
    
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
    
    console.log('✅ Permisos asignados:', userPermissions.length);
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
    console.log('🔍 Obteniendo menú para usuario ID:', userId);
    
    // Primero, obtener el usuario básico
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('👤 Usuario encontrado:', user.usuario, 'Nivel:', user.nivel);

    // Si es el creador, devolver todas las páginas
    if (user.nivel === 'TODO') {
      console.log('🔓 Creador - devolviendo todas las páginas');
      const allPages = await Page.findAll({
        where: { activo: true },
        order: [['orden', 'ASC']]
      });
      console.log('📄 Todas las páginas:', allPages.length);
      return res.json(allPages);
    }

    // Obtener módulos del usuario de forma separada
    console.log('🔍 Buscando módulos del usuario...');
    const userModules = await UserModule.findAll({
      where: { user_id: userId },
      include: [{
        model: Module,
        where: { activo: true }
      }]
    });

    console.log('📋 Módulos asignados al usuario:', userModules.length);
    userModules.forEach(um => {
      console.log(`  - ${um.Module.nombre} (ID: ${um.Module.id}, Página: ${um.Module.page_id})`);
    });

    if (userModules.length === 0) {
      console.log('⚠️ Usuario sin módulos asignados');
      return res.json([]);
    }

    // Obtener IDs de módulos
    const moduleIds = userModules.map(um => um.Module.id);
    console.log('🔧 IDs de módulos del usuario:', moduleIds);

    // Obtener páginas que contienen estos módulos
    console.log('🔍 Buscando páginas que contienen estos módulos...');
    const pages = await Page.findAll({
      where: { activo: true },
      include: [{
        model: Module,
        where: { 
          activo: true,
          id: moduleIds
        },
        required: true
      }],
      order: [['orden', 'ASC']]
    });

    console.log('📄 Páginas encontradas:', pages.length);
    pages.forEach(page => {
      console.log(`- Página: ${page.nombre} (ID: ${page.id})`);
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
    console.log('🔍 Obteniendo módulos para usuario ID:', userId);
    
    // Obtener módulos asignados al usuario
    const userModules = await UserModule.findAll({
      where: { user_id: userId },
      include: [{
        model: Module,
        where: { activo: true }
      }]
    });

    console.log('📋 Módulos asignados al usuario:', userModules.length);
    
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
    console.log('🔍 Obteniendo salas para usuario ID:', userId);
    
    // Obtener salas asignadas al usuario
    const userSalas = await UserSala.findAll({
      where: { user_id: userId },
      include: [{
        model: Sala,
        where: { activo: true }
      }]
    });

    console.log('📋 Salas asignadas al usuario:', userSalas.length);
    
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      const userSalaIds = userSalas.map(us => us.Sala.id);
      
      juegos = await Juego.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      const userSalaIds = userSalas.map(us => us.Sala.id);
      
      rangos = await Rango.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
    const { nombre, activo = true } = req.body;
    
    console.log('Creando permiso:', { nombre, activo, usuario: req.user.usuario });

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

    const permission = await Permission.create({ nombre, activo });
    
    console.log('Permiso creado exitosamente:', permission.toJSON());

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
    const { nombre, activo } = req.body;

    const permission = await Permission.findByPk(id);
    if (!permission) {
      return res.status(404).json({ message: 'Permiso no encontrado' });
    }

    await permission.update({ nombre, activo });

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
    console.log('🏢 Obteniendo salas para usuario ID:', userId, 'Nivel:', userLevel);
    
    let salas;
    
    if (userLevel === 'TODO') {
      // El creador tiene acceso a todas las salas
      console.log('🏢 Usuario creador - obteniendo todas las salas');
      salas = await Sala.findAll({
        where: { activo: true }
      });
    } else {
      // Otros usuarios solo ven sus salas asignadas
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      salas = user.Salas;
    }

    console.log('🏢 Salas disponibles para el usuario:', salas.length);
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
    console.log('📚 Obteniendo libros para usuario:', req.user.usuario, 'Nivel:', userLevel);
    
    let libros;
    
    if (userLevel === 'TODO') {
      // El creador ve todos los libros
      console.log('📚 Usuario creador - obteniendo todos los libros');
      libros = await Libro.findAll({
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      console.log('📚 Salas del usuario:', userSalaIds);

      libros = await Libro.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    console.log('📚 Libros encontrados:', libros.length);
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
      console.log(`📅 Última fecha para sala ${sala_id}:`, ultimaFecha.toISOString());
      console.log(`📅 Nueva fecha para sala ${sala_id}:`, fechaCreacion.toISOString());
    } else {
      console.log(`📅 Primer libro para sala ${sala_id}, usando fecha actual:`, fechaCreacion.toISOString());
    }

    const libro = await Libro.create({
      activo: true,
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
    const { activo } = req.body;

    const libro = await Libro.findByPk(id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    await libro.update({
      activo
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
    console.log('📊 Obteniendo rangos para usuario:', req.user.usuario, 'Nivel:', userLevel);
    
    let rangos;
    
    if (userLevel === 'TODO') {
      rangos = await Rango.findAll({
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      rangos = await Rango.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      mesas = await Mesa.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      juegos = await Juego.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      maquinas = await Maquina.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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
        where: { activo: true },
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
          where: { activo: true }
        }]
      });

      if (!user) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      const userSalaIds = user.Salas.map(sala => sala.id);
      tecnicos = await Tecnico.findAll({
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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
        where: { 
          activo: true,
          libro_id: libroId
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
        where: { 
          activo: true,
          libro_id: libroId,
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
        where: { activo: true },
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
        where: { 
          activo: true,
          '$Juego.Sala.id$': userSalaIds
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
        mesa_id: mesa_id,
        activo: true
      }
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
        total: total,
        activo: true
      });
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

    await drop.update({ activo: false });
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
        where: { activo: true },
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
        where: { 
          activo: true,
          sala_id: userSalaIds
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
      activo: true,
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

    await novedad.update({ activo: false });
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
        where: { 
          activo: true,
          libro_id: libroId
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
        where: { 
          activo: true,
          libro_id: libroId
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
      hora: hora,
      activo: true
    });

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

    await registro.update({ activo: false });
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
        where: { 
          activo: true,
          libro_id: libroId
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
        where: { 
          activo: true,
          libro_id: libroId
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
      hora,
      activo: true
    });

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

    await incidencia.update({ activo: false });
    res.json({ message: 'Incidencia eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando incidencia general:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor WISI ejecutándose en puerto ${PORT}`);
  console.log(`📊 Módulos disponibles: RRHH, MÁQUINAS, CECOM`);
  console.log(`🔐 Usuario creador: willinthon`);
});
