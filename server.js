const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit'); // DESHABILITADO
const axios = require('axios');
const cron = require('node-cron');

// Variables para control de cola de CRON
let cronQueue = [];
let isProcessingCron = false;
const MAX_CONCURRENT_DEVICES = 1; // Máximo 1 dispositivo a la vez para evitar bloqueos
let currentDeviceIndex = 0; // Índice para el dispositivo actual en el ciclo rotativo
let currentProcessingDevice = null; // Dispositivo que se está procesando actualmente
// Función para convertir tiempo a milisegundos
function timeToMs(timeValue) {
  const timeMap = {
    '10s': 10 * 1000,     // 10 segundos
    '30s': 30 * 1000,     // 30 segundos
    '1m': 60 * 1000,      // 1 minuto
    '5m': 5 * 60 * 1000,  // 5 minutos
    '10m': 10 * 60 * 1000, // 10 minutos
    '30m': 30 * 60 * 1000, // 30 minutos
    '1h': 60 * 60 * 1000,  // 1 hora
    '6h': 6 * 60 * 60 * 1000, // 6 horas
    '12h': 12 * 60 * 60 * 1000, // 12 horas
    '24h': 24 * 60 * 60 * 1000  // 24 horas
  };
  return timeMap[timeValue] || 60 * 1000; // Default 1 minuto
}
const CRON_TIMEOUT = 30000; // 30 segundos timeout máximo por dispositivo
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
  NovedadMaquinaRegistro,
  IncidenciaGeneral,
  Drop,
  Area,
  Departamento,
  Cargo,
  Empleado,
  Horario,
  Bloque,
  HorarioEmpleado,
  Dispositivo,
  Attlog,
  Cron,
  Llave,
  ControlLlaveRegistro,
  NovedadMesaRegistro,
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
  }
}

// Función para procesar la cola de CRON de forma asíncrona
async function processCronQueue() {
  if (isProcessingCron || cronQueue.length === 0) {
    return;
  }
  
  isProcessingCron = true;
  
  
  while (cronQueue.length > 0) {
    const { dispositivo, timestamp } = cronQueue.shift();
    
    // Actualizar dispositivo actual
    currentProcessingDevice = dispositivo;
    
    try {
      
      
      // Verificar salud del dispositivo antes de proceder
      const isHealthy = await checkDeviceHealth(dispositivo);
      if (!isHealthy) {
        
        currentProcessingDevice = null;
        continue;
      }
      
      // Ejecutar sincronización con timeout
      const result = await Promise.race([
        syncAttendanceFromDevice(dispositivo),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), CRON_TIMEOUT)
        )
      ]);
      
      if (result.error) {
        
      } else {
        
        
      }
    } catch (error) {
      
      
      // Si es un error de timeout, marcar el dispositivo como problemático
      if (error.message === 'Timeout' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        
      }
    }
    
    // Delay entre dispositivos basado en la configuración del CRON global
    if (cronQueue.length > 0) {
      const cronConfig = await Cron.findOne();
      const cronValue = cronConfig ? cronConfig.value : '1m';
      const delayMs = timeToMs(cronValue);
      
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Limpiar dispositivo actual
  currentProcessingDevice = null;
  isProcessingCron = false;
  
}

// Función para verificar la salud del dispositivo
async function checkDeviceHealth(dispositivo) {
  try {
    
    
    // Crear objeto de autenticación
    const authObject = {
      usuario_login_dispositivo: dispositivo.usuario,
      clave_login_dispositivo: dispositivo.clave
    };
    
    // Intentar una petición simple de información del dispositivo con timeout corto
    const healthResponse = await makeDigestRequest(
      `http://${dispositivo.ip_remota}`, 
      '/ISAPI/System/deviceInfo', 
      'GET', 
      null, 
      authObject
    );
    
    if (healthResponse && healthResponse.status === 200) {
      
      return true;
    } else {
      
      return false;
    }
  } catch (error) {
    
    return false;
  }
}

// Función para sincronizar marcajes desde dispositivo con paginación
async function syncAttendanceFromDevice(dispositivo) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Verificar salud del dispositivo antes de proceder
    const isDeviceHealthy = await checkDeviceHealth(dispositivo);
    if (!isDeviceHealthy) {
      
      return {
        totalEvents: 0,
        savedCount: 0,
        skippedCount: 0,
        errorCount: 0,
        imagesDownloaded: 0,
        imagesErrors: 0,
        eventsWithoutImage: 0,
        dispositivo: dispositivo.nombre,
        error: 'Dispositivo no disponible'
      };
    }
    // Crear carpeta attlogs si no existe
    const attlogsDir = path.join(__dirname, 'attlogs');
    if (!fs.existsSync(attlogsDir)) {
      fs.mkdirSync(attlogsDir, { recursive: true });
    }

    // Obtener el último evento sincronizado para este dispositivo
    const lastEvent = await Attlog.findOne({
      where: { dispositivo_id: dispositivo.id },
      order: [['event_time', 'DESC']]
    });

    const lastEventTime = lastEvent ? lastEvent.event_time : null;
    
    
    // Función para formatear fechas al formato correcto de Hikvision
    function formatDateForHikvision(dateInput) {
      
      
      if (!dateInput) {
        
        return null;
      }
      
      const date = new Date(dateInput);
      
      
      if (isNaN(date.getTime())) {
        
        return null;
      }
      
      // Formato específico para Hikvision: YYYY-MM-DDTHH:mm:ss-07:00
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      
      const result = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}-07:00`;
      
      return result;
    }
    
    // Si no hay eventos previos, usar marcaje_inicio del dispositivo
    // Si hay eventos previos, usar el último evento
    let startTimeForQuery = lastEventTime || dispositivo.marcaje_inicio;
    startTimeForQuery = formatDateForHikvision(startTimeForQuery);
    
    // Convertir marcaje_fin al formato correcto
    
    
    
    let endTimeForQuery = formatDateForHikvision(dispositivo.marcaje_fin);
    
    
    
    
    
    
    // Validar que las fechas sean válidas
    if (!startTimeForQuery || !endTimeForQuery) {
      
      return {
        totalEvents: 0,
        savedCount: 0,
        skippedCount: 0,
        errorCount: 1,
        imagesDownloaded: 0,
        imagesErrors: 0,
        dispositivo: dispositivo.nombre,
        error: 'Fechas inválidas para la consulta'
      };
    }

    let allEvents = [];
    let startIndex = 0;
    let hasMoreData = true;
    let totalProcessed = 0;

    

    // Primera consulta: obtener información general (sin eventos, solo para saber cuántos hay)
    
    const initialEndpoint = `/ISAPI/AccessControl/AcsEvent?format=json`;
    const initialBody = {
      "AcsEventCond": {
        "searchID": "0",
        "searchResultPosition": 0,
        "maxResults": 1, // Solo 1 para verificar
        "major": 5,
        "minor": 75,
        "startTime": startTimeForQuery,
        "endTime": endTimeForQuery
      }
    };

    // Crear objeto similar a tarea para la autenticación
    const authObject = {
      usuario_login_dispositivo: dispositivo.usuario,
      clave_login_dispositivo: dispositivo.clave
    };
    
    
    
    
    
    
    const initialResponse = await makeDigestRequest(`http://${dispositivo.ip_remota}`, initialEndpoint, 'POST', initialBody, authObject);
    
    if (!initialResponse) {
      
      return { totalEvents: 0, savedCount: 0, skippedCount: 0, errorCount: 1, dispositivo: dispositivo.nombre };
    }
    
    if (!initialResponse || initialResponse.status !== 200) {
      
      return { totalEvents: 0, savedCount: 0, skippedCount: 0, errorCount: 1, dispositivo: dispositivo.nombre };
    }

    // Paginación para obtener todos los eventos
    while (hasMoreData) {
      const endpoint = `/ISAPI/AccessControl/AcsEvent?format=json`;
      
      const requestBody = {
        "AcsEventCond": {
          "searchID": "0",
          "searchResultPosition": startIndex,
          "maxResults": 30,
          "major": 5,
          "minor": 75,
          "startTime": startTimeForQuery,
          "endTime": endTimeForQuery
        }
      };
      
      
      
      
      
      const response = await makeDigestRequest(`http://${dispositivo.ip_remota}`, endpoint, 'POST', requestBody, authObject);
      
      if (!response) {
        
        hasMoreData = false;
        continue;
      }
      
      // Pausa entre peticiones para evitar sobrecargar el dispositivo
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de pausa
      
      if (response && response.status === 200 && response.data) {
        // Manejar diferentes estructuras de respuesta
        let events = [];
        
        if (Array.isArray(response.data)) {
          // Si la respuesta es un array directo
          events = response.data;
        } else if (response.data.AcsEvent && Array.isArray(response.data.AcsEvent)) {
          // Si la respuesta tiene estructura AcsEvent
          events = response.data.AcsEvent;
        } else if (response.data.AcsEvent) {
          // Si AcsEvent existe pero no es array, intentar convertirlo
          if (typeof response.data.AcsEvent === 'object' && response.data.AcsEvent !== null) {
            // Si es un objeto, intentar convertirlo a array
            const values = Object.values(response.data.AcsEvent);
            
            // Si los valores son arrays, aplanarlos
            events = [];
            for (const value of values) {
              if (Array.isArray(value)) {
                events = events.concat(value);
              } else {
                events.push(value);
              }
            }
          } else {
            events = [];
          }
        } else {
          // Si no hay eventos, array vacío
          events = [];
        }
        
        if (events.length === 0) {
          hasMoreData = false;
          
        } else {
          allEvents = allEvents.concat(events);
          totalProcessed += events.length;
          startIndex += 30;
          
          
          
          // Si recibimos menos de 30 eventos, es la última página
          if (events.length < 30) {
            hasMoreData = false;
            
          }
          
        }
      } else {
        
        
        hasMoreData = false;
      }
    }
    

    

    // Procesar cada evento
    let savedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    let imagesDownloaded = 0;
    let imagesErrors = 0;
    let eventsWithoutImage = 0;

    for (const event of allEvents) {
      try {
        
        // Verificar si el evento ya existe y validar datos
        if (!event.employeeNoString) {
          
          skippedCount++;
          continue;
        }

        // Validar que employeeNoString no contenga datos corruptos (headers HTTP)
        if (event.employeeNoString.includes('GMT') || 
            event.employeeNoString.includes('Server:') || 
            event.employeeNoString.includes('Content-') ||
            event.employeeNoString.includes('Connection:') ||
            event.employeeNoString.includes('Keep-Alive:') ||
            event.employeeNoString.includes('X-Frame-Options:') ||
            event.employeeNoString.includes('Cache-Control:') ||
            event.employeeNoString.includes('Pragma:')) {
          
          skippedCount++;
          continue;
        }

        // Validar que el nombre no contenga datos corruptos
        if (event.name && (event.name.includes('GMT') || 
            event.name.includes('Server:') || 
            event.name.includes('Content-') ||
            event.name.includes('Connection:') ||
            event.name.includes('Keep-Alive:') ||
            event.name.includes('X-Frame-Options:') ||
            event.name.includes('Cache-Control:') ||
            event.name.includes('Pragma:'))) {
          
          skippedCount++;
          continue;
        }
        
        const existingLog = await Attlog.findOne({
          where: {
            dispositivo_id: dispositivo.id,
            employee_no: event.employeeNoString,
            event_time: event.time
          }
        });

        if (existingLog) {
          skippedCount++;
          continue;
        }

        // Crear nuevo registro
        
        const attlog = await Attlog.create({
          dispositivo_id: dispositivo.id,
          employee_no: event.employeeNoString,
          event_time: event.time,
          nombre: event.name
        });
        

        // Verificar si el evento tiene campo de imagen antes de procesar
        
        
        if (!event.pictureURL || event.pictureURL === '' || event.pictureURL === null || event.pictureURL === undefined) {
          
          eventsWithoutImage++;
          // Continuar con el siguiente evento sin procesar imagen
        } else {
          
          
          // Procesar imagen de forma síncrona para mejor control
          try {
              // Usar la URL completa de la imagen para autenticación
              const fullImageUrl = event.pictureURL.split('@')[0];
              
              
              // Extraer solo la ruta para makeDigestRequest
              const imagePath = event.pictureURL.split('@')[0].replace(`http://${dispositivo.ip_remota}`, '');
              
              
              // Descargar imagen usando Digest Authentication con headers específicos para imagen
              const imageResponse = await makeDigestRequestForImage(`http://${dispositivo.ip_remota}`, imagePath, authObject);
              
              
              
              
              
              if (imageResponse.status === 200 && imageResponse.data) {
                let imageBuffer;
                
                // Manejar diferentes formatos de respuesta
                if (Buffer.isBuffer(imageResponse.data)) {
                  // Si ya es un buffer (imagen binaria)
                  imageBuffer = imageResponse.data;
                  
                } else if (typeof imageResponse.data === 'string') {
                  // Si es string, limpiar el prefijo data:image/jpeg;base64, si existe
                  let base64Data = imageResponse.data;
                  if (base64Data.startsWith('data:image/')) {
                    base64Data = base64Data.split(',')[1]; // Remover prefijo data:image/jpeg;base64,
                    
                  }
                  imageBuffer = Buffer.from(base64Data, 'base64');
                  
                } else if (imageResponse.data.pictureInfo && imageResponse.data.pictureInfo.picData) {
                  // Si es objeto con pictureInfo.picData
                  imageBuffer = Buffer.from(imageResponse.data.pictureInfo.picData, 'base64');
                  
                } else {
                  
                  
                  
                  return; // Salir sin error para no detener el CRON
                }
                
                // Verificar que el buffer no esté vacío
                if (imageBuffer && imageBuffer.length > 0) {
                  const filePath = path.join(attlogsDir, `${attlog.id}.jpg`);
                  fs.writeFileSync(filePath, imageBuffer);
                  
                  imagesDownloaded++;
                } else {
                  
                  imagesErrors++;
                }
              } else {
                
                
                imagesErrors++;
              }
            } catch (imageError) {
              
              
              imagesErrors++;
            }
        }

        savedCount++;
        

      } catch (eventError) {
        errorCount++;
        
      }
    }

    // Descargar imágenes para eventos que tienen pictureInfo
    

    return {
      totalEvents: allEvents.length,
      savedCount,
      skippedCount,
      errorCount,
      imagesDownloaded,
      imagesErrors,
      eventsWithoutImage,
      dispositivo: dispositivo.nombre
    };

  } catch (error) {
    
    
    // Manejo específico para socket hang up
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      
    }
    
    // Devolver un resultado de error en lugar de lanzar la excepción
    return {
      totalEvents: 0,
      savedCount: 0,
      skippedCount: 0,
      errorCount: 1,
      imagesDownloaded: 0,
      imagesErrors: 0,
      dispositivo: dispositivo.nombre,
      error: error.message
    };
  }
}

// Sistema de gestión de CRON dinámico
const activeCronJobs = new Map(); // Almacena los trabajos CRON activos

// Función para convertir tiempo a expresión CRON
function timeToCronExpression(timeString) {
  switch (timeString) {
    case '10s': return '*/10 * * * * *'; // Cada 10 segundos
    case '30s': return '*/30 * * * * *'; // Cada 30 segundos
    case '1m': return '*/1 * * * *';    // Cada minuto
    case '5m': return '*/5 * * * *';    // Cada 5 minutos
    case '10m': return '*/10 * * * *';  // Cada 10 minutos
    case '30m': return '*/30 * * * *';  // Cada 30 minutos
    case '1h': return '0 */1 * * *';     // Cada hora
    case '6h': return '0 */6 * * *';     // Cada 6 horas
    case '12h': return '0 */12 * * *';   // Cada 12 horas
    case '24h': return '0 0 * * *';   // Cada 24 horas (diario a medianoche)
    default: return '0 0 * * *';      // Por defecto cada 24 horas (diario a medianoche)
  }
}

// Función para iniciar CRON para un dispositivo
function startCronForDevice(dispositivo) {
  const jobId = `device_${dispositivo.id}`;
  
  console.log(`🔍 startCronForDevice - Dispositivo recibido:`, {
    id: dispositivo.id,
    nombre: dispositivo.nombre,
    ip_remota: dispositivo.ip_remota,
    usuario: dispositivo.usuario,
    clave: dispositivo.clave ? '***' + dispositivo.clave.slice(-3) : 'undefined',
    cron_activo: dispositivo.cron_activo,
    cron_tiempo: dispositivo.cron_tiempo
  });
  
  // Detener CRON existente si existe
  if (activeCronJobs.has(jobId)) {
    activeCronJobs.get(jobId).destroy();
    activeCronJobs.delete(jobId);
  }

  if (dispositivo.cron_activo === 1) {
    const cronExpression = timeToCronExpression(dispositivo.cron_tiempo);
    
    const job = cron.schedule(cronExpression, () => {
      // Agregar a la cola en lugar de ejecutar directamente
      
      cronQueue.push({
        dispositivo: dispositivo,
        timestamp: new Date().toISOString(),
        priority: 1 // Prioridad normal
      });
      
      // Procesar cola si no está en proceso
      if (!isProcessingCron) {
        processCronQueue();
      }
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });
    
    

    activeCronJobs.set(jobId, job);
    
  }
}

// Función para detener CRON de un dispositivo
function stopCronForDevice(dispositivoId) {
  const jobId = `device_${dispositivoId}`;
  
  if (activeCronJobs.has(jobId)) {
    activeCronJobs.get(jobId).destroy();
    activeCronJobs.delete(jobId);
    
  }
}

// Función para ejecutar sincronización global
async function executeGlobalSync() {
  try {
    
    
    // Obtener todos los dispositivos con credenciales completas
    const dispositivos = await Dispositivo.findAll({
      where: { 
        ip_remota: { [Op.ne]: null },
        usuario: { [Op.ne]: null },
        clave: { [Op.ne]: null }
      },
      attributes: ['id', 'nombre', 'ip_remota', 'usuario', 'clave', 'marcaje_inicio', 'marcaje_fin']
    });
    
    
    
    if (dispositivos.length === 0) {
      
      return;
    }
    
    // Agregar SOLO el dispositivo actual del ciclo rotativo
    const currentDevice = dispositivos[currentDeviceIndex];
    
    
    cronQueue.push({
      dispositivo: currentDevice,
      timestamp: new Date().toISOString(),
      priority: 1
    });
    
    // Avanzar al siguiente dispositivo para la próxima ejecución
    currentDeviceIndex = (currentDeviceIndex + 1) % dispositivos.length;
    
    
    // Procesar cola si no está en proceso
    if (!isProcessingCron) {
      processCronQueue();
    }
    
  } catch (error) {
    
  }
}

// Función para inicializar el CRON global
async function initializeAllCronJobs() {
  try {
    
    
    // Obtener configuración de CRON
    const cronConfig = await Cron.findOne();
    const cronValue = cronConfig ? cronConfig.value : 'Desactivado';
    
    
    
    if (cronValue === 'Desactivado') {
      
      return;
    }
    
    // Limpiar trabajos CRON existentes
    for (const [jobId, job] of activeCronJobs) {
      job.destroy();
    }
    activeCronJobs.clear();
    
    // Crear CRON global
    const cronExpression = timeToCronExpression(cronValue);
    const globalCronJob = cron.schedule(cronExpression, () => {
      
      executeGlobalSync();
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });
    
    activeCronJobs.set('global', globalCronJob);
    
    
  } catch (error) {
    
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3000", "https://localhost:3000"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Servir archivos estáticos de la aplicación Angular PWA (ANTES de las rutas de API)
app.use(express.static(path.join(__dirname, 'wisi-frontend/dist/wisi-frontend/browser')));


// Rate limiting DESHABILITADO para desarrollo
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000, // limit each IP to 1000 requests per windowMs (aumentado para desarrollo)
//   message: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.',
//   standardHeaders: true,
//   legacyHeaders: false});

// Rate limiting DESHABILITADO para desarrollo
// const loginLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // 50 intentos de login por IP cada 15 minutos
//   message: 'Demasiados intentos de login, intenta de nuevo más tarde.',
//   standardHeaders: true,
//   legacyHeaders: false,
//   skipSuccessfulRequests: true // No contar requests exitosos
// });

// app.use(limiter); // DESHABILITADO

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
        
        // Verificar que el módulo exista
        const module = await Module.findOne({ where: { id: moduleId} });
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
        
        // Verificar que el módulo exista
        const module = await Module.findOne({ where: { id: moduleId} });
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
      nivel
    });

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

app.post('/api/salas', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { 
      nombre, 
      logo, 
      rif, 
      ubicacion, 
      correo, 
      telefono, 
      nombre_comercial 
    } = req.body;
    

    if (!nombre) {
      return res.status(400).json({ message: 'El nombre es requerido' });
    }

    // Verificar que la sala no exista
    const existingSala = await Sala.findOne({ where: { nombre } });
    if (existingSala) {
      return res.status(400).json({ message: 'Ya existe una sala con ese nombre' });
    }

    const sala = await Sala.create({ 
      nombre,
      logo: logo || null,
      rif: rif || null,
      ubicacion: ubicacion || null,
      correo: correo || null,
      telefono: telefono || null,
      nombre_comercial: nombre_comercial || null
    });
    

    // Asignar automáticamente al usuario creador
    await assignToCreator(sala, 'sala');

    res.status(201).json({ message: 'Sala creada exitosamente', id: sala.id });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar sala
app.put('/api/salas/:id', authenticateToken, authorizeLevel('TODO'), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, 
      logo, 
      rif, 
      ubicacion, 
      correo, 
      telefono, 
      nombre_comercial 
    } = req.body;

    const sala = await Sala.findByPk(id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }

    await sala.update({ 
      nombre,
      logo: logo || null,
      rif: rif || null,
      ubicacion: ubicacion || null,
      correo: correo || null,
      telefono: telefono || null,
      nombre_comercial: nombre_comercial || null
    });

    res.json({ message: 'Sala actualizada exitosamente' });
  } catch (error) {
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint para debug - ver todos los módulos (TEMPORAL)
app.get('/api/debug/modules', authenticateToken, async (req, res) => {
  try {
    const modules = await Module.findAll({ 
      order: [['id', 'ASC']],
      include: [{
        model: Page,
        required: false
      }]
    });
    res.json(modules);
  } catch (error) {
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint duplicado eliminado - usar el de línea 2038

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

    // Verificar si el libro tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para libro:', {
      id: id,
      sala_id: libro.sala_id
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Novedades de Máquinas' as table_name, COUNT(*) as count FROM novedades_maquinas_registros WHERE libro_id = ?
        UNION ALL
        SELECT 'Novedades de Mesas' as table_name, COUNT(*) as count FROM novedades_mesas_registros WHERE libro_id = ?
        UNION ALL
        SELECT 'Control de Llaves' as table_name, COUNT(*) as count FROM control_llaves_registros WHERE libro_id = ?
        UNION ALL
        SELECT 'Incidencias Generales' as table_name, COUNT(*) as count FROM incidencias_generales WHERE libro_id = ?
        UNION ALL
        SELECT 'Drops' as table_name, COUNT(*) as count FROM drops WHERE libro_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id, id, id, id, id],
      type: sequelize.QueryTypes.SELECT
    });
    
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el libro porque tiene relaciones',
        relations: relations
      });
    }

    // Si no hay relaciones, eliminar el libro
    await libro.destroy();

    res.json({ message: 'Libro eliminado exitosamente' });
  } catch (error) {
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un rango
app.put('/api/rangos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id } = req.body;
    
    const rango = await Rango.findByPk(id);
    
    if (!rango) {
      return res.status(404).json({ message: 'Rango no encontrado' });
    }
    
    // Verificar permisos del usuario
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'super_admin') {
      // Verificar si el usuario tiene acceso a la sala del rango
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: rango.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar este rango' });
      }
    }
    
    // Actualizar el rango
    await rango.update({
      nombre,
      sala_id
    });
    
    res.json({ message: 'Rango actualizado correctamente', rango });
  } catch (error) {
    
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
    
    // Verificar si el rango tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para rango:', {
      id: id,
      nombre: rango.nombre
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Máquinas' as table_name, COUNT(*) as count FROM maquinas WHERE rango_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });
    
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el rango porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, eliminar el rango
    await rango.destroy();
    res.json({ message: 'Rango eliminado exitosamente' });
  } catch (error) {
    
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
        order: [['orden', 'ASC']]
      });
      horario.bloques = bloques;
    }
    
    res.json(horarios);
  } catch (error) {
    
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
        orden: i + 1,
        hora_entrada_descanso: bloque.hora_entrada_descanso || null,
        hora_salida_descanso: bloque.hora_salida_descanso || null,
        tiene_descanso: bloque.tiene_descanso === 'true' ? true : false
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
          orden: i + 1,
          hora_entrada_descanso: bloque.hora_entrada_descanso || null,
          hora_salida_descanso: bloque.hora_salida_descanso || null,
          tiene_descanso: bloque.tiene_descanso === 'true' ? true : false
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
        SELECT 'Horarios de Empleados' as table_name, COUNT(*) as count FROM horarios_empleados WHERE horario_id = ?
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener horarios por sala
app.get('/api/horarios/sala/:salaId', authenticateToken, async (req, res) => {
  try {
    const { salaId } = req.params;
    
    const horarios = await Horario.findAll({
      where: { sala_id: salaId },
      include: [{
        model: Bloque,
        as: 'bloques',
        order: [['orden', 'ASC']]
      }],
      order: [['nombre', 'ASC']]
    });

    res.json(horarios);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener horarios asignados a un empleado
app.get('/api/empleados/:empleadoId/horarios', authenticateToken, async (req, res) => {
  try {
    const { empleadoId } = req.params;
    
    const horariosEmpleado = await HorarioEmpleado.findAll({
      where: { empleado_id: empleadoId },
      include: [{
        model: Horario,
        as: 'Horario',
        include: [{
          model: Bloque,
          as: 'bloques',
          order: [['orden', 'ASC']]
        }]
      }],
      order: [['primer_dia', 'DESC']]
    });

    res.json(horariosEmpleado);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Asignar horario a un empleado
app.post('/api/empleados/:empleadoId/horarios', authenticateToken, async (req, res) => {
  try {
    const { empleadoId } = req.params;
    const { primer_dia, horario_id } = req.body;
    
    if (!primer_dia || !horario_id) {
      return res.status(400).json({ message: 'primer_dia y horario_id son requeridos' });
    }

    // Verificar que el empleado existe
    const empleado = await Empleado.findByPk(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el horario existe
    const horario = await Horario.findByPk(horario_id);
    if (!horario) {
      return res.status(404).json({ message: 'Horario no encontrado' });
    }

    // Validar que la fecha no sea menor o igual a horarios existentes
    const horariosExistentes = await HorarioEmpleado.findAll({
      where: { empleado_id: empleadoId },
      order: [['primer_dia', 'DESC']]
    });

    if (horariosExistentes.length > 0) {
      const fechaMasReciente = horariosExistentes[0].primer_dia;
      if (primer_dia <= fechaMasReciente) {
        return res.status(400).json({ 
          message: `La fecha debe ser posterior a ${fechaMasReciente}. Ya existe un horario asignado con fecha anterior o igual.` 
        });
      }
    }

    // Crear la asignación
    const horarioEmpleado = await HorarioEmpleado.create({
      empleado_id: parseInt(empleadoId),
      horario_id: parseInt(horario_id),
      primer_dia: primer_dia
    });

    // Obtener el horario con sus bloques para la respuesta
    const horarioCompleto = await Horario.findByPk(horario_id, {
      include: [{
        model: Bloque,
        as: 'bloques',
        order: [['orden', 'ASC']]
      }]
    });

    res.json({
      id: horarioEmpleado.id,
      empleado_id: horarioEmpleado.empleado_id,
      horario_id: horarioEmpleado.horario_id,
      primer_dia: horarioEmpleado.primer_dia,
      Horario: horarioCompleto
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar horario asignado a un empleado
app.delete('/api/empleados/:empleadoId/horarios/:horarioEmpleadoId', authenticateToken, async (req, res) => {
  try {
    const { empleadoId, horarioEmpleadoId } = req.params;
    
    const horarioEmpleado = await HorarioEmpleado.findOne({
      where: {
        id: horarioEmpleadoId,
        empleado_id: empleadoId
      }
    });

    if (!horarioEmpleado) {
      return res.status(404).json({ message: 'Asignación de horario no encontrada' });
    }

    // Verificar si el horario del empleado tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para horario de empleado:', {
      horarioEmpleadoId: horarioEmpleadoId,
      empleadoId: empleadoId,
      horarioId: horarioEmpleado.horario_id
    });
    
    // Obtener el empleado para usar su cédula en la consulta
    const empleado = await Empleado.findByPk(empleadoId);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar relaciones de forma más simple
    const relations = [];
    
    try {
      // Verificar marcajes
      const marcajesCount = await Attlog.count({
        where: { employee_no: empleado.cedula }
      });
      if (marcajesCount > 0) {
        relations.push({ table_name: 'Marcajes', count: marcajesCount });
      }
      
      // Verificar novedades de máquinas
      const novedadesCount = await NovedadMaquinaRegistro.count({
        where: { empleado_id: empleadoId }
      });
      if (novedadesCount > 0) {
        relations.push({ table_name: 'Novedades de Máquinas', count: novedadesCount });
      }
    } catch (relationError) {
      
      // Si hay error en la verificación, continuar con la eliminación
    }
    
    

    if (relations.length > 0) {
      return res.status(400).json({ 
        message: 'No se puede eliminar el horario porque tiene elementos asociados.',
        relations: relations,
        horarioEmpleado: {
          id: horarioEmpleado.id,
          empleado_id: horarioEmpleado.empleado_id,
          horario_id: horarioEmpleado.horario_id,
          primer_dia: horarioEmpleado.primer_dia
        }
      });
    }

    await horarioEmpleado.destroy();
    res.json({ message: 'Horario eliminado correctamente' });
  } catch (error) {
    
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
        where: { activo: 1 },
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
        where: {
          sala_id: userSalaIds,
          activo: 1
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar una mesa
app.put('/api/mesas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, juego_id } = req.body;
    
    const mesa = await Mesa.findByPk(id);
    
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }
    
    // Verificar permisos del usuario
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'super_admin') {
      // Verificar si el usuario tiene acceso a la sala de la mesa
      const juego = await Juego.findByPk(mesa.juego_id, {
        include: [{ model: Sala, as: 'Sala' }]
      });
      
      if (!juego || !juego.Sala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar esta mesa' });
      }
      
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: juego.Sala.id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar esta mesa' });
      }
    }
    
    // Actualizar la mesa
    await mesa.update({
      nombre,
      juego_id
    });
    
    res.json({ message: 'Mesa actualizada correctamente', mesa });
  } catch (error) {
    
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
    
    // Verificar si la mesa tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para mesa:', {
      id: id,
      nombre: mesa.nombre
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Drops' as table_name, COUNT(*) as count FROM drops WHERE mesa_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });
    
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la mesa porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, marcar mesa como borrada (soft delete)
    await mesa.update({ activo: 0 });
    res.json({ message: 'Mesa marcada como borrada correctamente' });
  } catch (error) {
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar un juego
app.put('/api/juegos/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id } = req.body;
    
    const juego = await Juego.findByPk(id);
    
    if (!juego) {
      return res.status(404).json({ message: 'Juego no encontrado' });
    }
    
    // Verificar permisos del usuario
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'super_admin') {
      // Verificar si el usuario tiene acceso a la sala del juego
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: juego.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar este juego' });
      }
    }
    
    // Actualizar el juego
    await juego.update({
      nombre,
      sala_id
    });
    
    res.json({ message: 'Juego actualizado correctamente', juego });
  } catch (error) {
    
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
    
    // Verificar si el juego tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para juego:', {
      id: id,
      nombre: juego.nombre
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Mesas' as table_name, COUNT(*) as count FROM mesas WHERE juego_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });
    
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar el juego porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, eliminar el juego
    await juego.destroy();
    res.json({ message: 'Juego eliminado exitosamente' });
  } catch (error) {
    
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
        where: { activo: 1 },
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
        where: {
          sala_id: userSalaIds,
          activo: 1
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar una máquina
app.put('/api/maquinas/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, rango_id } = req.body;
    
    const maquina = await Maquina.findByPk(id);
    
    if (!maquina) {
      return res.status(404).json({ message: 'Máquina no encontrada' });
    }
    
    // Verificar permisos del usuario
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'super_admin') {
      // Verificar si el usuario tiene acceso a la sala de la máquina
      const rango = await Rango.findByPk(maquina.rango_id, {
        include: [{ model: Sala, as: 'Sala' }]
      });
      
      if (!rango || !rango.Sala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar esta máquina' });
      }
      
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: rango.Sala.id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes permisos para actualizar esta máquina' });
      }
    }
    
    // Actualizar la máquina
    await maquina.update({
      nombre,
      rango_id
    });
    
    res.json({ message: 'Máquina actualizada correctamente', maquina });
  } catch (error) {
    
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
    
    // Verificar si la máquina tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para máquina:', {
      id: id,
      nombre: maquina.nombre
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Novedades de Máquinas' as table_name, COUNT(*) as count FROM novedades_maquinas_registros WHERE maquina_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });
    
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la máquina porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, marcar máquina como borrada (soft delete)
    await maquina.update({ activo: 0 });
    res.json({ message: 'Máquina marcada como borrada correctamente' });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/maquinas/borradas - Obtener máquinas borradas (activo = 0)
app.get('/api/maquinas/borradas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let maquinas;
    
    if (userLevel === 'TODO') {
      maquinas = await Maquina.findAll({
        where: { activo: 0 },
        include: [{
          model: Rango,
          attributes: ['id', 'nombre']
        }, {
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['updated_at', 'DESC']]
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
        where: {
          sala_id: userSalaIds,
          activo: 0
        },
        include: [{
          model: Rango,
          attributes: ['id', 'nombre']
        }, {
          model: Sala,
          attributes: ['id', 'nombre']
        }],
        order: [['updated_at', 'DESC']]
      });
    }
    
    res.json(maquinas);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/maquinas/:id/borrar - Borrar máquina (cambiar activo de 1 a 0 - soft delete)
app.put('/api/maquinas/:id/borrar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const maquina = await Maquina.findByPk(id);
    if (!maquina) {
      return res.status(404).json({ message: 'Máquina no encontrada' });
    }

    // Verificar que la máquina esté activa (activo = 1)
    if (maquina.activo !== 1) {
      return res.status(400).json({ message: 'La máquina ya está borrada' });
    }

    // Borrar la máquina (soft delete) - NO verificar relaciones porque solo cambia activo
    await maquina.update({ activo: 0 });

    res.json({ 
      message: 'Máquina borrada exitosamente',
      maquina: {
        id: maquina.id,
        nombre: maquina.nombre,
        activo: maquina.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/maquinas/:id/activar - Activar máquina (cambiar activo de 0 a 1)
app.put('/api/maquinas/:id/activar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const maquina = await Maquina.findByPk(id);
    if (!maquina) {
      return res.status(404).json({ message: 'Máquina no encontrada' });
    }

    // Verificar que la máquina esté borrada (activo = 0)
    if (maquina.activo !== 0) {
      return res.status(400).json({ message: 'La máquina ya está activa' });
    }

    // Activar la máquina
    await maquina.update({ activo: 1 });

    res.json({ 
      message: 'Máquina activada exitosamente',
      maquina: {
        id: maquina.id,
        nombre: maquina.nombre,
        activo: maquina.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/mesas/borradas - Obtener mesas borradas (activo = 0)
app.get('/api/mesas/borradas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let mesas;
    
    if (userLevel === 'TODO') {
      mesas = await Mesa.findAll({
        where: { activo: 0 },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }, {
          model: Juego,
          attributes: ['id', 'nombre']
        }],
        order: [['updated_at', 'DESC']]
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
        where: {
          sala_id: userSalaIds,
          activo: 0
        },
        include: [{
          model: Sala,
          attributes: ['id', 'nombre']
        }, {
          model: Juego,
          attributes: ['id', 'nombre']
        }],
        order: [['updated_at', 'DESC']]
      });
    }
    
    res.json(mesas);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/mesas/:id/borrar - Borrar mesa (cambiar activo de 1 a 0 - soft delete)
app.put('/api/mesas/:id/borrar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const mesa = await Mesa.findByPk(id);
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }

    // Verificar que la mesa esté activa (activo = 1)
    if (mesa.activo !== 1) {
      return res.status(400).json({ message: 'La mesa ya está borrada' });
    }

    // Borrar la mesa (soft delete) - NO verificar relaciones porque solo cambia activo
    await mesa.update({ activo: 0 });

    res.json({ 
      message: 'Mesa borrada exitosamente',
      mesa: {
        id: mesa.id,
        nombre: mesa.nombre,
        activo: mesa.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/mesas/:id/activar - Activar mesa (cambiar activo de 0 a 1)
app.put('/api/mesas/:id/activar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const mesa = await Mesa.findByPk(id);
    if (!mesa) {
      return res.status(404).json({ message: 'Mesa no encontrada' });
    }

    // Verificar que la mesa esté borrada (activo = 0)
    if (mesa.activo !== 0) {
      return res.status(400).json({ message: 'La mesa ya está activa' });
    }

    // Activar la mesa
    await mesa.update({ activo: 1 });

    res.json({ 
      message: 'Mesa activada exitosamente',
      mesa: {
        id: mesa.id,
        nombre: mesa.nombre,
        activo: mesa.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA LLAVES
// =============================================

// Obtener todas las llaves
app.get('/api/llaves', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let llaves;
    
    if (userLevel === 'TODO') {
      // Superusuario ve todas las llaves
      llaves = await Llave.findAll({
        where: { activo: 1 },
        include: [
          {
            model: Sala,
            as: 'Sala',
            attributes: ['id', 'nombre']
          }
        ],
        order: [['nombre', 'ASC']]
      });
    } else {
      // Usuario normal ve solo llaves de sus salas
      const userSalas = await UserSala.findAll({
        where: { user_id: userId },
        include: [{ model: Sala, as: 'Sala' }]
      });
      
      const salaIds = userSalas.map(us => us.sala_id);
      
      llaves = await Llave.findAll({
        where: { 
          activo: 1,
          sala_id: salaIds
        },
        include: [
          {
            model: Sala,
            as: 'Sala',
            attributes: ['id', 'nombre']
          }
        ],
        order: [['nombre', 'ASC']]
      });
    }
    
    res.json(llaves);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear una nueva llave
app.post('/api/llaves', authenticateToken, async (req, res) => {
  try {
    const { nombre, sala_id } = req.body;
    
    if (!nombre || !sala_id) {
      return res.status(400).json({ message: 'Nombre y sala_id son requeridos' });
    }
    
    // Verificar que la sala existe
    const sala = await Sala.findByPk(sala_id);
    if (!sala) {
      return res.status(404).json({ message: 'Sala no encontrada' });
    }
    
    // Verificar que el usuario tiene acceso a la sala
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a esta sala' });
      }
    }
    
    // Verificar que no existe una llave con el mismo nombre en la misma sala
    const existingLlave = await Llave.findOne({
      where: { 
        nombre: nombre,
        sala_id: sala_id,
        activo: 1
      }
    });
    
    if (existingLlave) {
      return res.status(400).json({ message: 'Ya existe una llave con este nombre en esta sala' });
    }
    
    const llave = await Llave.create({
      nombre,
      sala_id,
      activo: 1
    });
    
    // Obtener la llave con la sala
    const llaveWithSala = await Llave.findByPk(llave.id, {
      include: [
        {
          model: Sala,
          as: 'Sala',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    res.status(201).json(llaveWithSala);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Actualizar una llave
app.put('/api/llaves/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, sala_id } = req.body;
    
    const llave = await Llave.findByPk(id);
    if (!llave) {
      return res.status(404).json({ message: 'Llave no encontrada' });
    }
    
    // Verificar que el usuario tiene acceso a la sala
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: llave.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a esta llave' });
      }
    }
    
    // Verificar que la nueva sala existe
    if (sala_id && sala_id !== llave.sala_id) {
      const sala = await Sala.findByPk(sala_id);
      if (!sala) {
        return res.status(404).json({ message: 'Sala no encontrada' });
      }
      
      // Verificar acceso a la nueva sala
      if (userLevel !== 'TODO') {
        const userSala = await UserSala.findOne({
          where: { user_id: userId, sala_id: sala_id }
        });
        
        if (!userSala) {
          return res.status(403).json({ message: 'No tienes acceso a esta sala' });
        }
      }
    }
    
    // Verificar que no existe otra llave con el mismo nombre en la misma sala
    if (nombre && nombre !== llave.nombre) {
      const existingLlave = await Llave.findOne({
        where: { 
          nombre: nombre,
          sala_id: sala_id || llave.sala_id,
          activo: 1,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingLlave) {
        return res.status(400).json({ message: 'Ya existe una llave con este nombre en esta sala' });
      }
    }
    
    await llave.update({
      nombre: nombre || llave.nombre,
      sala_id: sala_id || llave.sala_id
    });
    
    // Obtener la llave actualizada con la sala
    const updatedLlave = await Llave.findByPk(llave.id, {
      include: [
        {
          model: Sala,
          as: 'Sala',
          attributes: ['id', 'nombre']
        }
      ]
    });
    
    res.json(updatedLlave);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar una llave (soft delete)
app.delete('/api/llaves/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const llave = await Llave.findByPk(id);
    
    if (!llave) {
      return res.status(404).json({ message: 'Llave no encontrada' });
    }
    
    // Verificar que el usuario tiene acceso a la llave
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: llave.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a esta llave' });
      }
    }
    
    // Verificar si la llave tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para llave:', {
      id: id,
      nombre: llave.nombre
    });
    
    // Por ahora no hay relaciones, pero se puede agregar en el futuro
    // const relations = await sequelize.query(`
    //   SELECT table_name, count FROM (
    //     SELECT 'Control de Llaves' as table_name, COUNT(*) as count FROM control_llaves_registros WHERE llave_id = ?
    //   ) as relations WHERE count > 0
    // `, {
    //   replacements: [id],
    //   type: sequelize.QueryTypes.SELECT
    // });
    
    // if (relations.length > 0) {
    //   return res.status(400).json({
    //     message: 'No se puede eliminar la llave porque tiene relaciones',
    //     relations: relations
    //   });
    // }
    
    // Si no hay relaciones, marcar llave como borrada (soft delete)
    await llave.update({ activo: 0 });
    res.json({ message: 'Llave marcada como borrada correctamente' });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/llaves/borradas - Obtener llaves borradas (activo = 0)
app.get('/api/llaves/borradas', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    let llaves;
    
    if (userLevel === 'TODO') {
      // Superusuario ve todas las llaves borradas
      llaves = await Llave.findAll({
        where: { activo: 0 },
        include: [
          {
            model: Sala,
            as: 'Sala',
            attributes: ['id', 'nombre']
          }
        ],
        order: [['nombre', 'ASC']]
      });
    } else {
      // Usuario normal ve solo llaves borradas de sus salas
      const userSalas = await UserSala.findAll({
        where: { user_id: userId },
        include: [{ model: Sala, as: 'Sala' }]
      });
      
      const salaIds = userSalas.map(us => us.sala_id);
      
      llaves = await Llave.findAll({
        where: { 
          activo: 0,
          sala_id: salaIds
        },
        include: [
          {
            model: Sala,
            as: 'Sala',
            attributes: ['id', 'nombre']
          }
        ],
        order: [['nombre', 'ASC']]
      });
    }
    
    res.json(llaves);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/llaves/:id/borrar - Borrar llave (cambiar activo a 0)
app.put('/api/llaves/:id/borrar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const llave = await Llave.findByPk(id);
    if (!llave) {
      return res.status(404).json({ message: 'Llave no encontrada' });
    }
    
    // Verificar que el usuario tiene acceso a la llave
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: llave.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a esta llave' });
      }
    }
    
    // Verificar que la llave esté activa (activo = 1)
    if (llave.activo !== 1) {
      return res.status(400).json({ message: 'La llave ya está borrada' });
    }
    
    // Borrar la llave
    await llave.update({ activo: 0 });
    
    res.json({ 
      message: 'Llave borrada exitosamente',
      llave: {
        id: llave.id,
        nombre: llave.nombre,
        activo: llave.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/llaves/:id/activar - Activar llave (cambiar activo de 0 a 1)
app.put('/api/llaves/:id/activar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const llave = await Llave.findByPk(id);
    if (!llave) {
      return res.status(404).json({ message: 'Llave no encontrada' });
    }
    
    // Verificar que el usuario tiene acceso a la llave
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: llave.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a esta llave' });
      }
    }
    
    // Verificar que la llave esté borrada (activo = 0)
    if (llave.activo !== 0) {
      return res.status(400).json({ message: 'La llave ya está activa' });
    }
    
    // Activar la llave
    await llave.update({ activo: 1 });
    
    res.json({ 
      message: 'Llave activada exitosamente',
      llave: {
        id: llave.id,
        nombre: llave.nombre,
        activo: llave.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA CONTROL DE LLAVES
// =============================================

// Obtener registros de control de llaves por libro
app.get('/api/control-llaves-registros/:libroId', authenticateToken, async (req, res) => {
  try {
    const { libroId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    // Verificar que el usuario tiene acceso al libro
    const libro = await Libro.findByPk(libroId, {
      include: [{ model: Sala, as: 'Sala' }]
    });
    
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    
    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este libro' });
      }
    }
    
    // Obtener registros de control de llaves con relaciones
    const registros = await ControlLlaveRegistro.findAll({
      where: { libro_id: libroId },
      include: [
        {
          model: Llave,
          as: 'Llave',
          include: [
            {
              model: Sala,
              as: 'Sala',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula']
        }
      ],
      order: [['hora', 'ASC']]
    });
    
    res.json(registros);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear registro de control de llave
app.post('/api/control-llaves-registros', authenticateToken, async (req, res) => {
  try {
    const { libro_id, llave_id, empleado_id, hora } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.nivel;

    // Verificar que el libro existe
    const libro = await Libro.findByPk(libro_id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este libro' });
      }
    }

    // Verificar que la llave existe y está activa
    const llave = await Llave.findByPk(llave_id);
    if (!llave || llave.activo !== 1) {
      return res.status(404).json({ message: 'Llave no encontrada o inactiva' });
    }

    // Verificar que el empleado existe y está activo
    const empleado = await Empleado.findByPk(empleado_id);
    if (!empleado || empleado.activo !== 1) {
      return res.status(404).json({ message: 'Empleado no encontrado o inactivo' });
    }

    // Crear el registro
    const registro = await ControlLlaveRegistro.create({
      libro_id,
      llave_id,
      empleado_id,
      hora
    });

    // Obtener el registro con relaciones
    const registroCompleto = await ControlLlaveRegistro.findByPk(registro.id, {
      include: [
        {
          model: Llave,
          as: 'Llave',
          include: [
            {
              model: Sala,
              as: 'Sala',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula']
        }
      ]
    });

    res.status(201).json(registroCompleto);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar registro de control de llave
app.delete('/api/control-llaves-registros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    const registro = await ControlLlaveRegistro.findByPk(id, {
      include: [
        {
          model: Libro,
          as: 'Libro',
          include: [{ model: Sala, as: 'Sala' }]
        }
      ]
    });
    
    if (!registro) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: registro.Libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este registro' });
      }
    }
    
    await registro.destroy();
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTAS PARA NOVEDADES DE MESAS
// =============================================

// Obtener registros de novedades de mesas por libro
app.get('/api/novedades-mesas-registros/:libroId', authenticateToken, async (req, res) => {
  try {
    const { libroId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    // Verificar que el usuario tiene acceso al libro
    const libro = await Libro.findByPk(libroId, {
      include: [{ model: Sala, as: 'Sala' }]
    });
    
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }
    
    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este libro' });
      }
    }
    
    // Obtener registros de novedades de mesas con relaciones
    const registros = await NovedadMesaRegistro.findAll({
      where: { libro_id: libroId },
      include: [
        {
          model: Mesa,
          as: 'Mesa',
          include: [
            {
              model: Juego,
              as: 'Juego',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula']
        }
      ],
      order: [['hora', 'ASC']]
    });
    
    res.json(registros);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear registro de novedad de mesa
app.post('/api/novedades-mesas-registros', authenticateToken, async (req, res) => {
  try {
    const { libro_id, mesa_id, empleado_id, descripcion, hora } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.nivel;

    // Verificar que el libro existe
    const libro = await Libro.findByPk(libro_id);
    if (!libro) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este libro' });
      }
    }

    // Verificar que la mesa existe y está activa
    const mesa = await Mesa.findByPk(mesa_id);
    if (!mesa || mesa.activo !== 1) {
      return res.status(404).json({ message: 'Mesa no encontrada o inactiva' });
    }

    // Verificar que el empleado existe y está activo
    const empleado = await Empleado.findByPk(empleado_id);
    if (!empleado || empleado.activo !== 1) {
      return res.status(404).json({ message: 'Empleado no encontrado o inactivo' });
    }

    // Crear el registro
    const registro = await NovedadMesaRegistro.create({
      libro_id,
      mesa_id,
      empleado_id,
      descripcion,
      hora
    });

    // Obtener el registro con relaciones
    const registroCompleto = await NovedadMesaRegistro.findByPk(registro.id, {
      include: [
        {
          model: Mesa,
          as: 'Mesa',
          include: [
            {
              model: Juego,
              as: 'Juego',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula']
        }
      ]
    });

    res.status(201).json(registroCompleto);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Eliminar registro de novedad de mesa
app.delete('/api/novedades-mesas-registros/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    const registro = await NovedadMesaRegistro.findByPk(id, {
      include: [
        {
          model: Libro,
          as: 'Libro',
          include: [{ model: Sala, as: 'Sala' }]
        }
      ]
    });
    
    if (!registro) {
      return res.status(404).json({ message: 'Registro no encontrado' });
    }
    
    // Verificar acceso a la sala del libro
    if (userLevel !== 'TODO') {
      const userSala = await UserSala.findOne({
        where: { user_id: userId, sala_id: registro.Libro.sala_id }
      });
      
      if (!userSala) {
        return res.status(403).json({ message: 'No tienes acceso a este registro' });
      }
    }
    
    await registro.destroy();
    res.json({ message: 'Registro eliminado correctamente' });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});


// =============================================
// RUTAS PARA EMPLEADOS POR SALA
// =============================================

// Obtener cargos
app.get('/api/empleados/cargos', authenticateToken, async (req, res) => {
  try {
    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id']
        }
      ]
    });

    // Si el usuario no tiene salas asignadas, devolver array vacío
    if (!user || !user.Salas || user.Salas.length === 0) {
      return res.json([]);
    }

    const userSalaIds = user.Salas.map(sala => sala.id);

    const cargos = await Cargo.findAll({
      include: [{
        model: Departamento,
        attributes: ['id', 'nombre'],
        include: [{
          model: Area,
          attributes: ['id', 'nombre'],
        include: [{
          model: Sala,
          attributes: ['id', 'nombre'],
          required: false
          }]
        }]
      }],
      where: {
        '$Departamento.Area.Sala.id$': {
          [Op.in]: userSalaIds
        }
      },
      order: [['nombre', 'ASC']]
    });
    
    res.json(cargos);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener tareas por usuario
app.get('/api/empleados/tareas/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userLevel = req.user.nivel;
    
    // Verificar permisos
    if (userLevel !== 'TODO' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({ message: 'No tienes permisos para ver estas tareas' });
    }
    
    // Consultar tareas_dispositivo_usuarios
    const tareas = await sequelize.query(`
      SELECT 
        tdu.*,
        e.nombre as empleado_nombre,
        e.cedula as empleado_cedula
      FROM tareas_dispositivo_usuarios tdu
      LEFT JOIN empleados e ON tdu.numero_cedula_empleado = e.cedula
      WHERE tdu.user_id = ?
      ORDER BY tdu.created_at DESC
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(tareas);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener horarios
app.get('/api/empleados/horarios', authenticateToken, async (req, res) => {
  try {
    const { cargoId } = req.query;
    
    if (!cargoId) {
      return res.status(400).json({ message: 'cargoId es requerido' });
    }

    // Obtener el cargo con su sala
    const cargo = await Cargo.findByPk(cargoId, {
      include: [
        {
          model: Departamento,
          include: [
            {
              model: Area,
              include: [
                {
                  model: Sala,
                  attributes: ['id']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!cargo) {
      return res.status(404).json({ message: 'Cargo no encontrado' });
    }

    // Obtener la sala del cargo
    const salaId = cargo.Departamento.Area.Sala.id;

    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id']
        }
      ]
    });

    // Verificar que el usuario tenga acceso a la sala del cargo
    const userSalaIds = user.Salas.map(sala => sala.id);
    if (!userSalaIds.includes(salaId)) {
      return res.status(403).json({ message: 'No tienes acceso a esta sala' });
    }

    const horarios = await Horario.findAll({
      where: {
        sala_id: salaId
      },
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }],
      order: [['nombre', 'ASC']]
    });
    
    res.json(horarios);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener dispositivos
app.get('/api/empleados/dispositivos', authenticateToken, async (req, res) => {
  try {
    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id']
        }
      ]
    });

    // Si el usuario no tiene salas asignadas, devolver array vacío
    if (!user || !user.Salas || user.Salas.length === 0) {
      return res.json([]);
    }

    const userSalaIds = user.Salas.map(sala => sala.id);

    const dispositivos = await Dispositivo.findAll({
      where: {
        sala_id: {
          [Op.in]: userSalaIds
        }
      },
      include: [{
        model: Sala,
        attributes: ['id', 'nombre']
      }],
      order: [['nombre', 'ASC']]
    });
    
    res.json(dispositivos);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint de debug para verificar filtrado de empleados
app.get('/api/empleados/debug-filter', authenticateToken, async (req, res) => {
  try {
    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id', 'nombre']
        }
      ]
    });

    const userSalaIds = user.Salas.map(sala => sala.id);

    // Obtener todos los empleados sin filtro para comparar
    const allEmpleados = await Empleado.findAll({
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
                      as: 'Sala',
                      attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo'],
                      attributes: ['id', 'nombre']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    res.json({
      userSalas: user.Salas,
      userSalaIds,
      totalEmpleados: allEmpleados.length,
      empleados: allEmpleados.map(emp => ({
        id: emp.id,
        nombre: emp.nombre,
        cargo: emp.Cargo?.nombre,
        sala: emp.Cargo?.Departamento?.Area?.Sala?.nombre,
        salaId: emp.Cargo?.Departamento?.Area?.Sala?.id
      }))
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Endpoint de debug para verificar relaciones
app.get('/api/empleados/debug-cargo/:cargoId', authenticateToken, async (req, res) => {
  try {
    const { cargoId } = req.params;
    
    const cargo = await Cargo.findByPk(cargoId, {
      include: [
        {
          model: Departamento,
          include: [
            {
              model: Area,
              include: [
                {
                  model: Sala,
                  attributes: ['id', 'nombre']
                }
              ]
            }
          ]
        }
      ]
    });
    
    res.json(cargo);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener usuario actual
app.get('/api/empleados/current-user', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'username', 'email', 'nivel'],
      include: [{
        model: Sala,
        through: { attributes: [] },
        attributes: ['id', 'nombre']
      }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(user);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Verificar cédula
app.get('/api/empleados/verificar-cedula/:cedula', authenticateToken, async (req, res) => {
  try {
    const { cedula } = req.params;
    
    const empleado = await Empleado.findOne({
      where: { cedula: cedula }
    });
    
    res.json({ existe: !!empleado });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener empleados por sala
app.get('/api/empleados/sala/:salaId', authenticateToken, async (req, res) => {
  try {
    const { salaId } = req.params;
    const userId = req.user.id;
    const userLevel = req.user.nivel;
    
    // Verificar que el usuario tiene acceso a la sala
    if (userLevel !== 'TODO') {
      const user = await User.findByPk(userId, {
        include: [{
          model: Sala,
          through: { attributes: [] },
          where: { id: salaId }
        }]
      });
      
      if (!user || !user.Salas || user.Salas.length === 0) {
        return res.status(403).json({ message: 'No tienes acceso a esta sala' });
      }
    }
    
    const empleados = await Empleado.findAll({
      where: { activo: 1 },
      include: [{
        model: Cargo,
        attributes: ['id', 'nombre'],
        include: [{
          model: Departamento,
          attributes: ['id', 'nombre'],
          include: [{
            model: Area,
            attributes: ['id', 'nombre'],
            include: [{
              model: Sala,
              attributes: ['id', 'nombre'],
              where: { id: salaId }
            }]
          }]
        }]
      }],
      order: [['nombre', 'ASC']]
    });
    
    res.json(empleados);
  } catch (error) {
    
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
        model: Empleado,
        attributes: ['id', 'nombre']
      }],
      order: [['hora', 'ASC']]
    });
    
    res.json(novedades);
  } catch (error) {
    
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
    
    res.status(500).json({ valid: false, message: 'Error interno del servidor' });
  }
});

// =============================================
// RUTA DE INICIO - WILLINTHON
// =============================================

// Ruta de inicio comentada para permitir que el frontend se sirva correctamente
// app.get('/', (req, res) => {
//   res.json({ 
//     message: 'Sistema WISI - API funcionando correctamente',
//     version: '1.0.0',
//     author: 'Willinthon Carriedo'
//   });
// });

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
        where: {libro_id: libroId},
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
        where: { activo: 1 },
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
          '$Juego.Sala.id$': userSalaIds,
          activo: 1
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

    // Verificar si el drop tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para drop:', {
      id: id,
      mesa_id: drop.mesa_id
    });
    
    // No hay relaciones que verificar para drops ya que novedades_maquinas_registros no tiene drop_id
    const relations = [];
    

    await drop.destroy();
    res.json({ message: 'Drop eliminado correctamente' });
  } catch (error) {
    
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
      
      
      // Verificar la estructura de la tabla primero
      const tableInfo = await sequelize.query("PRAGMA table_info(novedades_maquinas_registros)", {
        type: sequelize.QueryTypes.SELECT
      });
      
      
      registros = await NovedadMaquinaRegistro.findAll({
        where: {libro_id: libroId},
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
          model: Empleado,
          attributes: ['id', 'nombre'],
          include: [{
            model: Cargo,
            attributes: ['id', 'nombre'],
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
        where: {libro_id: libroId},
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
          model: Empleado,
          attributes: ['id', 'nombre'],
          include: [{
            model: Cargo,
            attributes: ['id', 'nombre'],
            include: [{
              model: Departamento,
              attributes: ['id', 'nombre'],
              include: [{
                model: Area,
          attributes: ['id', 'nombre'],
          include: [{
            model: Sala,
            attributes: ['id', 'nombre'],
            where: { id: userSalaIds }
                }]
              }]
            }]
          }]
        }],
        order: [['created_at', 'DESC']]
      });
    }
    
    res.json(registros);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Crear o actualizar registro de novedad de máquina
app.post('/api/novedades-maquinas-registros', authenticateToken, async (req, res) => {
  try {
    const { libro_id, maquina_id, descripcion, empleado_id, hora } = req.body;
    const userId = req.user.id;
    const userLevel = req.user.nivel;

    if (!libro_id || !maquina_id || !descripcion || !empleado_id || !hora) {
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


    // Verificar que el empleado existe
    const empleado = await Empleado.findByPk(empleado_id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Siempre crear un nuevo registro (no actualizar existentes)
    const registro = await NovedadMaquinaRegistro.create({
      libro_id: libro_id,
      maquina_id: maquina_id,
      descripcion: descripcion,
      empleado_id: empleado_id,
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
        model: Empleado,
        attributes: ['id', 'nombre'],
        include: [{
          model: Cargo,
          attributes: ['id', 'nombre'],
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
        }]
      }]
    });

    res.status(201).json(registroCompleto);
  } catch (error) {
    
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
        where: {libro_id: libroId},
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
        where: {libro_id: libroId},
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

    // Verificar si la incidencia tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para incidencia general:', {
      id: id,
      libro_id: incidencia.libro_id
    });
    
    // Por ahora no hay tablas relacionadas con incidencias_generales
    // Si en el futuro se agregan relaciones, se puede verificar aquí
    const relations = [];
    

    await incidencia.destroy();
    res.json({ message: 'Incidencia eliminada correctamente' });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== RUTAS DE EMPLEADOS ====================

// GET /api/empleados - Obtener todos los empleados
app.get('/api/empleados', authenticateToken, async (req, res) => {
  try {
    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id']
        }
      ]
    });

    // Si es el usuario creador (nivel TODO), devolver todos los empleados activos
    if (user.nivel === 'TODO') {
      const empleados = await Empleado.findAll({
        where: { activo: 1 },
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
                        as: 'Sala',
                        attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        order: [['nombre', 'ASC']]
      });

      // Agregar dispositivos a cada empleado para usuarios TODO
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

      return res.json(empleados);
    }

    // Si el usuario no tiene salas asignadas, devolver array vacío
    if (!user || !user.Salas || user.Salas.length === 0) {
      return res.json([]);
    }

    const userSalaIds = user.Salas.map(sala => sala.id);

    const empleados = await Empleado.findAll({
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
                        as: 'Sala',
                        required: false,
                        attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      where: {
        '$Cargo.Departamento.Area.Sala.id$': {
          [Op.in]: userSalaIds
        },
        activo: 1
      },
      order: [['created_at', 'DESC']]
    });

    // Agregar dispositivos a cada empleado
    for (let empleado of empleados) {
      const dispositivos = await sequelize.query(
        'SELECT d.id, d.nombre, d.ip_local, d.ip_remota, d.usuario, d.clave, s.nombre as sala_nombre FROM empleado_dispositivos ed JOIN dispositivos d ON ed.dispositivo_id = d.id LEFT JOIN salas s ON d.sala_id = s.id WHERE ed.empleado_id = ? AND d.sala_id IN (?)',
        {
          replacements: [empleado.id, userSalaIds],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      empleado.dataValues.dispositivos = dispositivos;
    }

    res.json(empleados);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/empleados/borrados - Obtener empleados borrados (activo = 0)
app.get('/api/empleados/borrados', authenticateToken, async (req, res) => {
  try {
    // Obtener las salas del usuario logueado
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Sala,
          as: 'Salas',
          attributes: ['id']
        }
      ]
    });

    // Si es el usuario creador (nivel TODO), devolver todos los empleados borrados
    if (user.nivel === 'TODO') {
      const empleados = await Empleado.findAll({
        where: { activo: 0 },
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
                        as: 'Sala',
                        attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        order: [['updated_at', 'DESC']]
      });

      // Agregar dispositivos a cada empleado para usuarios TODO
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

      return res.json(empleados);
    }

    // Si el usuario no tiene salas asignadas, devolver array vacío
    if (!user || !user.Salas || user.Salas.length === 0) {
      return res.json([]);
    }

    const userSalaIds = user.Salas.map(sala => sala.id);

    const empleados = await Empleado.findAll({
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
                        as: 'Sala',
                        required: false,
                        attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      where: {
        activo: 0,
        '$Cargo.Departamento.Area.Sala.id$': {
          [Op.in]: userSalaIds
        }
      },
      order: [['updated_at', 'DESC']]
    });

    // Agregar dispositivos a cada empleado
    for (let empleado of empleados) {
      const dispositivos = await sequelize.query(
        'SELECT d.id, d.nombre, d.ip_local, d.ip_remota, d.usuario, d.clave, s.nombre as sala_nombre FROM empleado_dispositivos ed JOIN dispositivos d ON ed.dispositivo_id = d.id LEFT JOIN salas s ON d.sala_id = s.id WHERE ed.empleado_id = ? AND d.sala_id IN (?)',
        {
          replacements: [empleado.id, userSalaIds],
          type: sequelize.QueryTypes.SELECT
        }
      );
      
      empleado.dataValues.dispositivos = dispositivos;
    }

    res.json(empleados);
  } catch (error) {
    
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
                      as: 'Sala',
                      attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                    }
                  ]
                }
              ]
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/empleados - Crear nuevo empleado
app.post('/api/empleados', authenticateToken, async (req, res) => {
  try {
    const { foto, nombre, cedula, fecha_ingreso, fecha_cumpleanos, sexo, cargo_id, dispositivos } = req.body;
    
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
      activo: 1
    });

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
                      as: 'Sala',
                      attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    res.status(201).json(empleadoCompleto);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/empleados/:id/borrar - Borrar empleado (cambiar activo de 1 a 0 - soft delete)
app.put('/api/empleados/:id/borrar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const empleado = await Empleado.findByPk(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el empleado esté activo (activo = 1)
    if (empleado.activo !== 1) {
      return res.status(400).json({ message: 'El empleado ya está borrado' });
    }

    // Borrar el empleado (soft delete) - NO verificar relaciones porque solo cambia activo
    await empleado.update({ activo: 0 });

    res.json({ 
      message: 'Empleado borrado exitosamente',
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        activo: empleado.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/empleados/:id - Actualizar empleado
app.put('/api/empleados/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { foto, nombre, cedula, fecha_ingreso, fecha_cumpleanos, sexo, cargo_id, dispositivos } = req.body;
    
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
      activo: 1
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
                      as: 'Sala',
                      attributes: ['id', 'nombre', 'nombre_comercial', 'rif', 'ubicacion', 'correo', 'telefono', 'logo']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    res.json(empleadoActualizado);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/empleados/:id/activar - Activar empleado (cambiar activo de 0 a 1)
app.put('/api/empleados/:id/activar', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const empleado = await Empleado.findByPk(id);
    if (!empleado) {
      return res.status(404).json({ message: 'Empleado no encontrado' });
    }

    // Verificar que el empleado esté borrado (activo = 0)
    if (empleado.activo !== 0) {
      return res.status(400).json({ message: 'El empleado ya está activo' });
    }

    // Activar el empleado
    await empleado.update({ activo: 1 });

    res.json({ 
      message: 'Empleado activado exitosamente',
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        activo: empleado.activo
      }
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// DELETE /api/empleados/:id - Eliminar empleado
app.delete('/api/empleados/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
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
        UNION ALL
        SELECT 'Novedades de Máquinas' as table_name, COUNT(*) as count FROM novedades_maquinas_registros WHERE empleado_id = ?
        UNION ALL
        SELECT 'Horarios de Empleados' as table_name, COUNT(*) as count FROM horarios_empleados WHERE empleado_id = ?
        UNION ALL
        SELECT 'Marcajes' as table_name, COUNT(*) as count FROM attlogs WHERE employee_no = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [empleado.cedula, id, id, id, empleado.cedula],
      type: sequelize.QueryTypes.SELECT
    });
    
    

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

    // Marcar empleado como borrado (activo = 0) en lugar de eliminar físicamente
    await empleado.update({ activo: 0 });
    res.json({ message: 'Empleado marcado como borrado correctamente' });
  } catch (error) {
    
    console.error('❌ Detalles del error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Si es un error de foreign key constraint, devolver información específica
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        message: 'No se puede eliminar el empleado porque tiene relaciones que impiden su eliminación',
        relations: [
          { table_name: 'Relaciones de Base de Datos', count: 'Tiene registros asociados' }
        ],
        empleado: {
          id: id,
          nombre: 'Empleado',
          tipo: 'empleado'
        },
        helpText: 'Para eliminar este empleado, primero debe eliminar o reasignar los elementos relacionados.'
      });
    }
    
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

    
    res.status(201).json({ 
      message: 'Tarea de prueba creada correctamente',
      id: result[0]
    });
  } catch (error) {
    
    
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ==================== ENDPOINTS DE COMUNICACIÓN CON DISPOSITIVOS ====================

// POST /api/tareas/dispositivo/borrar-usuario
app.post('/api/tareas/dispositivo/borrar-usuario', authenticateToken, async (req, res) => {
  
  try {
    const { tarea } = req.body;
    
    
    
    
    
    
    
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/AccessControl/UserInfo/Delete?format=json';
    const method = 'PUT';
    const body = {
      UserInfoDelCond: {
        EmployeeNoList: [
          {
            employeeNo: tarea.numero_cedula_empleado
          }
        ]
      }
    };

    // Usar la lógica de autenticación Digest del backend
    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Usuario eliminado correctamente del dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/agregar-usuario
app.post('/api/tareas/dispositivo/agregar-usuario', authenticateToken, async (req, res) => {
  
  try {
    const { tarea } = req.body;
    
    
    
    
    
    
    
    
    
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/AccessControl/UserInfo/SetUp?format=json';
    const method = 'PUT';
    const body = {
      UserInfo: {
        employeeNo: tarea.numero_cedula_empleado,
        name: tarea.nombre_empleado,
        gender: tarea.nombre_genero,
        userType: 'normal',
        localUIRight: false,
        maxOpenDoorTime: 0,
        Valid: {
          enable: true,
          beginTime: '2024-01-01T00:00:00',
          endTime: '2030-12-31T23:59:59',
          timeType: 'local'
        },
        doorRight: "1",
        RightPlan: [
          {
            doorNo: "1",
            planTemplateNo: "1"
          }
        ]
      }
    };

    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Usuario agregado correctamente al dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/editar-usuario
app.post('/api/tareas/dispositivo/editar-usuario', authenticateToken, async (req, res) => {
  try {
    const { tarea } = req.body;
    
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/AccessControl/UserInfo/SetUp?format=json';
    const method = 'PUT';
    const body = {
      UserInfo: {
        employeeNo: tarea.numero_cedula_empleado,
        name: tarea.nombre_empleado,
        gender: tarea.nombre_genero,
        userType: 'normal',
        Valid: {
          enable: true,
          beginTime: tarea.fecha_ingreso || '2024-01-01T00:00:00',
          endTime: '2025-12-31T23:59:59',
          timeType: 'local'
        },
        doorRight: "1",
        RightPlan: [
          {
            doorNo: "1",
            planTemplateNo: "1"
          }
        ]
      }
    };

    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Usuario editado correctamente en el dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/borrar-foto
app.post('/api/tareas/dispositivo/borrar-foto', authenticateToken, async (req, res) => {
  try {
    const { tarea } = req.body;
    
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD';
    const method = 'PUT';
    const body = {
      FPID: [
        {
          value: tarea.numero_cedula_empleado
        }
      ]
    };

    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Foto eliminada correctamente del dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/agregar-foto
app.post('/api/tareas/dispositivo/agregar-foto', authenticateToken, async (req, res) => {
  try {
    const { tarea } = req.body;
    
    // Primero eliminar la foto existente del dispositivo (si existe)
    try {
      const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
      const deleteEndpoint = '/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD';
      const deleteBody = {
        FPID: [
          {
            value: tarea.numero_cedula_empleado
          }
        ]
      };
      await makeDigestRequest(deviceUrl, deleteEndpoint, 'PUT', deleteBody, tarea);
    } catch (deleteError) {
      // Continuar aunque falle la eliminación (puede que no exista foto previa)
    }
    
    // Subir la imagen al servidor PHP
    const imageUrl = await subirImagenAlServidor(tarea.foto_empleado);
    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir la imagen al servidor'
      });
    }
    
    // Agregar la nueva foto al dispositivo
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json';
    const method = 'POST';
    const body = {
      faceURL: imageUrl,
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: tarea.numero_cedula_empleado,
      name: tarea.nombre_empleado,
      gender: tarea.nombre_genero === 'Masculino' ? 'male' : 'female',
      featurePointType: 'face'
    };

    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Foto agregada correctamente al dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/editar-foto
app.post('/api/tareas/dispositivo/editar-foto', authenticateToken, async (req, res) => {
  try {
    const { tarea } = req.body;
    
    // Primero borrar la foto existente
    try {
      const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
      const deleteEndpoint = '/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=1&faceLibType=blackFD';
      const deleteBody = {
        FPID: [
          {
            value: tarea.numero_cedula_empleado
          }
        ]
      };
      
      await makeDigestRequest(deviceUrl, deleteEndpoint, 'PUT', deleteBody, tarea);
    } catch (deleteError) {
      
    }
    
    // Luego agregar la nueva foto
    const imageUrl = await subirImagenAlServidor(tarea.foto_empleado);
    if (!imageUrl) {
      return res.status(500).json({
        success: false,
        message: 'Error al subir la nueva imagen al servidor'
      });
    }
    
    const deviceUrl = `http://${tarea.ip_publica_dispositivo}`;
    const endpoint = '/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json';
    const method = 'POST';
    const body = {
      faceURL: imageUrl,
      faceLibType: 'blackFD',
      FDID: '1',
      FPID: tarea.numero_cedula_empleado,
      name: tarea.nombre_empleado,
      gender: tarea.nombre_genero === 'Masculino' ? 'male' : 'female',
      featurePointType: 'face'
    };

    const response = await makeDigestRequest(deviceUrl, endpoint, method, body, tarea);
    
    // Verificar si la respuesta del dispositivo fue exitosa
    if (response.status >= 200 && response.status < 300) {
      
      
      res.json({
        success: true,
        message: 'Foto editada correctamente en el dispositivo',
        deviceResponse: response.data
      });
    } else {
      
      
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Función para subir imagen al servidor PHP
async function subirImagenAlServidor(base64Image) {
  try {
    // Convertir base64 a blob
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    const byteCharacters = Buffer.from(base64Data, 'base64');
    
    // Crear FormData
    const FormData = require('form-data');
    const form = new FormData();
    form.append('image', byteCharacters, {
      filename: 'foto_empleado.jpg',
      contentType: 'image/jpeg'
    });
    
    // Enviar al servidor PHP
    const axios = require('axios');
    const response = await axios.post('http://hotelroraimainn.com/upload.php', form, {
      headers: form.getHeaders()
    });
    
    if (response.data && response.data.success && response.data.url) {
      return response.data.url;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

// Función para hacer peticiones con autenticación Digest (igual que en gestión biométrica)
// Función específica para descargar imágenes con Digest Authentication
async function makeDigestRequestForImage(deviceUrl, endpoint, credentials) {
  const axios = require('axios');
  const crypto = require('crypto');
  
  const username = credentials.usuario_login_dispositivo;
  const password = credentials.clave_login_dispositivo;
  const fullUrl = `${deviceUrl}${endpoint}`;
  
  
  
  
  
  try {
    // Primera petición para obtener challenge digest
    
    
    const firstResponse = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'image/jpeg, image/png, */*'
      },
      timeout: 30000,
      validateStatus: (status) => status === 401
    });
    
    
    const directResponse = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'image/jpeg, image/png, */*'
      },
      timeout: 30000,
      responseType: 'arraybuffer' // Importante para imágenes binarias
    });
    
    
    return directResponse;
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      
      
      
      
      // Extraer información del challenge digest
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        
        // Generar respuesta digest
        
        const digestResponse = generateDigestResponse(challenge, username, password, fullUrl, 'GET');
        
        
        // Segunda petición con la respuesta digest
        try {
          const secondResponse = await axios({
            method: 'GET',
            url: fullUrl,
            headers: {
              'Accept': 'image/jpeg, image/png, */*',
              'Authorization': `Digest ${digestResponse}`
            },
            timeout: 30000,
            responseType: 'arraybuffer' // Importante para imágenes binarias
          });
          
          
          
          return secondResponse;
          
        } catch (secondError) {
          
          if (secondError.response?.data) {
            
          }
          throw secondError;
        }
      } else {
        
        throw error;
      }
    } else {
      
      throw error;
    }
  }
}

async function makeDigestRequest(deviceUrl, endpoint, method, body, credentials) {
  const axios = require('axios');
  const crypto = require('crypto');
  
  // Manejar tanto objeto tarea como credenciales directas
  let username, password, requestBody;
  
  if (typeof credentials === 'object' && credentials.usuario_login_dispositivo) {
    // Es un objeto tarea o authObject
    username = credentials.usuario_login_dispositivo;
    password = credentials.clave_login_dispositivo;
    requestBody = body; // body contiene el JSON del POST
  } else if (typeof credentials === 'string') {
    // Es credenciales directas: credentials = clave, body = usuario
    username = body;  // body contiene el usuario
    password = credentials;  // credentials contiene la clave
    requestBody = null; // No hay body JSON
  } else {
    throw new Error('Formato de credenciales no válido');
  }
  
  const fullUrl = `${deviceUrl}${endpoint}`;
  
  
  
  
  
  
  
  // Primera petición para obtener challenge digest
  
  
  try {
    const firstResponse = await axios({
      method: method,
      url: fullUrl,
      data: requestBody ? JSON.stringify(requestBody) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000, // 10 segundos para health check
      validateStatus: (status) => status === 401
    });
    
    // Si llegamos aquí, no hubo error 401, intentar sin autenticación
    
    const directResponse = await axios({
      method: method,
      url: fullUrl,
      data: requestBody ? JSON.stringify(requestBody) : undefined,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000 // 30 segundos
    });
    
    
    return directResponse;
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      
      
      
      
      // Extraer información del challenge digest
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        
        // Generar respuesta digest
        
        const digestResponse = generateDigestResponse(challenge, username, password, fullUrl, method);
        
        
        // Segunda petición con la respuesta digest
        try {
          const secondResponse = await axios({
            method: method,
            url: fullUrl,
            data: requestBody ? JSON.stringify(requestBody) : undefined,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Authorization': `Digest ${digestResponse}`
            },
            timeout: 30000 // 30 segundos
          });
          
          
          
          return secondResponse;
        } catch (secondError) {
          // Devolver la respuesta del error para que el frontend pueda manejarla
          
          if (secondError.response) {
            
            return secondError.response;
          } else {
            // Si no hay respuesta, crear una respuesta de error
            
            return {
              status: 500,
              data: { error: 'Error en autenticación Digest' }
            };
          }
        }
      } else {
        throw new Error('No se encontró challenge digest válido');
      }
    } else {
      throw error;
    }
  }
}

function parseDigestChallenge(wwwAuthenticate) {
  const challenge = {};
  const regex = /(\w+)="([^"]+)"/g;
  let match;
  
  while ((match = regex.exec(wwwAuthenticate)) !== null) {
    challenge[match[1]] = match[2];
  }
  
  return challenge;
}

function generateDigestResponse(challenge, username, password, uri, method) {
  const crypto = require('crypto');
  const realm = challenge.realm || '';
  const nonce = challenge.nonce || '';
  const qop = challenge.qop || '';

  const cnonce = crypto.randomBytes(16).toString('hex');

  const ha1String = `${username}:${realm}:${password}`;
  const ha1 = crypto.createHash('md5').update(ha1String).digest('hex');

  const ha2String = `${method}:${uri}`;
  const ha2 = crypto.createHash('md5').update(ha2String).digest('hex');

  let response;
  if (qop === 'auth') {
    const responseString = `${ha1}:${nonce}:00000001:${cnonce}:${qop}:${ha2}`;
    response = crypto.createHash('md5').update(responseString).digest('hex');
  } else {
    const responseString = `${ha1}:${nonce}:${ha2}`;
    response = crypto.createHash('md5').update(responseString).digest('hex');
  }

  let digestResponse = `username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;

  if (qop) {
    digestResponse += `, qop=${qop}, nc=00000001, cnonce="${cnonce}"`;
  }

  if (challenge.opaque) {
    digestResponse += `, opaque="${challenge.opaque}"`;
  }

  return digestResponse;
}

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
    
    return [];
  }
}

// POST /api/hikvision/test-connection - Probar conexión con biométrico
app.post('/api/hikvision/test-connection', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    
    
    
    
    
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
      
      
      // Probar credenciales comunes
      for (const cred of commonCredentials) {
        
        hikvision = new HikvisionISAPI(ip, cred.user, cred.pass);
        result = await hikvision.getDeviceInfo();
        
        if (result.success) {
          
          break;
        }
      }
      
      if (!result.success) {
        
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
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/hikvision/users - Obtener usuarios registrados
app.post('/api/hikvision/users', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave } = req.body;
    
    
    
    
    
    
    if (!ip || !usuario || !clave) {
      return res.status(400).json({ success: false, error: 'IP, usuario y clave son requeridos' });
    }

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUsers();
    
    
    
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
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// PUT /api/dispositivos/:id/cron - Actualizar configuración CRON del dispositivo
app.put('/api/dispositivos/:id/cron', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { cron_activo, cron_tiempo } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    // Validar valores
    if (cron_activo !== undefined && ![0, 1].includes(cron_activo)) {
      return res.status(400).json({ message: 'cron_activo debe ser 0 o 1' });
    }

    const tiempoValidos = ['10s', '1m', '5m', '10m', '30m', '1h', '6h', '12h', '24h'];
    if (cron_tiempo && !tiempoValidos.includes(cron_tiempo)) {
      return res.status(400).json({ message: 'cron_tiempo debe ser uno de: ' + tiempoValidos.join(', ') });
    }

    // Guardar valores anteriores para comparación
    const previousCronActivo = dispositivo.cron_activo;
    const previousCronTiempo = dispositivo.cron_tiempo;

    // Actualizar solo los campos CRON
    await dispositivo.update({
      cron_activo: cron_activo !== undefined ? cron_activo : dispositivo.cron_activo,
      cron_tiempo: cron_tiempo || dispositivo.cron_tiempo
    });

    // Obtener el dispositivo actualizado con todos los campos necesarios
    const dispositivoActualizado = await Dispositivo.findByPk(id, {
      attributes: ['id', 'nombre', 'ip_remota', 'usuario', 'clave', 'cron_activo', 'cron_tiempo', 'marcaje_inicio', 'marcaje_fin']
    });

    // Gestionar CRON automáticamente
    const newCronActivo = cron_activo !== undefined ? cron_activo : dispositivo.cron_activo;
    const newCronTiempo = cron_tiempo || dispositivo.cron_tiempo;

    // Si cambió la configuración CRON, actualizar el trabajo programado
    if (previousCronActivo !== newCronActivo || previousCronTiempo !== newCronTiempo) {
      if (newCronActivo === 1) {
        // Activar o actualizar CRON
        startCronForDevice(dispositivoActualizado);
        
      } else {
        // Desactivar CRON
        stopCronForDevice(id);
        
      }
    }

    res.json({
      success: true,
      message: 'Configuración CRON actualizada correctamente',
      dispositivo: dispositivoActualizado
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/dispositivos/:id/sync-attendance - Sincronizar marcajes del dispositivo
app.post('/api/dispositivos/:id/sync-attendance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    if (!dispositivo.ip_remota || !dispositivo.usuario || !dispositivo.clave) {
      return res.status(400).json({ message: 'Dispositivo no tiene credenciales completas' });
    }

    // Sincronizar marcajes
    const result = await syncAttendanceFromDevice(dispositivo);
    
    res.json({
      success: true,
      message: 'Sincronización completada',
      data: result
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/test-sync/:id - Endpoint de prueba para sincronización (sin autenticación)
app.post('/api/test-sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    if (!dispositivo.ip_remota || !dispositivo.usuario || !dispositivo.clave) {
      return res.status(400).json({ message: 'Dispositivo no tiene credenciales completas' });
    }

    // Sincronizar marcajes
    const result = await syncAttendanceFromDevice(dispositivo);
    
    res.json({
      success: true,
      message: 'Test de sincronización completado',
      data: result
    });
  } catch (error) {
    
    res.status(500).json({ 
      success: false,
      message: 'Error en test de sincronización',
      error: error.message 
    });
  }
});

// GET /api/verify-img-device/:id - Verificar descarga de imagen del dispositivo
app.get('/api/verify-img-device/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    if (!dispositivo.ip_remota || !dispositivo.usuario || !dispositivo.clave) {
      return res.status(400).json({ message: 'Dispositivo no tiene credenciales completas' });
    }

    // Crear objeto de autenticación
    const authObject = {
      usuario_login_dispositivo: dispositivo.usuario,
      clave_login_dispositivo: dispositivo.clave
    };

    // URL completa de imagen de prueba (como llega del evento)
    const fullImageUrl = `http://${dispositivo.ip_remota}/LOCALS/pic/acsLinkCap/202509_00/21_003420_30075_0.jpeg@WEB000000001502`;
    
    
    // Extraer solo la ruta para makeDigestRequest
    const imagePath = fullImageUrl.replace(`http://${dispositivo.ip_remota}`, '').split('@')[0];
    
    
    // Descargar imagen usando Digest Authentication
    const imageResponse = await makeDigestRequest(`http://${dispositivo.ip_remota}`, imagePath, 'GET', null, authObject);
    
    
    
    
    
    if (imageResponse.status === 200 && imageResponse.data) {
      let imageBuffer;
      
      if (Buffer.isBuffer(imageResponse.data)) {
        imageBuffer = imageResponse.data;
        
      } else if (typeof imageResponse.data === 'string') {
        // Limpiar el prefijo data:image/jpeg;base64, si existe
        let base64Data = imageResponse.data;
        if (base64Data.startsWith('data:image/')) {
          base64Data = base64Data.split(',')[1]; // Remover prefijo data:image/jpeg;base64,
          
        }
        imageBuffer = Buffer.from(base64Data, 'base64');
        
      } else {
        
        return res.json({
          success: false,
          message: 'Formato de respuesta no reconocido',
          data: imageResponse.data
        });
      }
      
      // Guardar imagen en carpeta attlogs con ID de attlogs
      const fs = require('fs');
      const path = require('path');
      const attlogsDir = path.join(__dirname, 'attlogs');
      
      // Crear directorio si no existe
      if (!fs.existsSync(attlogsDir)) {
        fs.mkdirSync(attlogsDir, { recursive: true });
      }
      
      // Usar un ID de prueba (por ejemplo, 99999)
      const testImagePath = path.join(attlogsDir, '99999.jpg');
      fs.writeFileSync(testImagePath, imageBuffer);
      
      res.json({
        success: true,
        message: 'Imagen verificada y descargada correctamente',
        bufferLength: imageBuffer.length,
        savedTo: testImagePath,
        imagePath: imagePath,
        fullUrl: fullImageUrl
      });
    } else {
      res.json({
        success: false,
        message: 'Error descargando imagen',
        status: imageResponse.status,
        data: imageResponse.data
      });
    }
  } catch (error) {
    
    res.status(500).json({ 
      success: false,
      message: 'Error verificando imagen',
      error: error.message 
    });
  }
});

// GET /api/attlogs/:id - Obtener datos de un marcaje específico
app.get('/api/attlogs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const attlog = await Attlog.findByPk(id, {
      include: [
        {
          model: Dispositivo,
          as: 'Dispositivo',
          attributes: ['id', 'nombre', 'ip_remota']
        }
      ]
    });
    
    if (!attlog) {
      return res.status(404).json({ message: 'Marcaje no encontrado' });
    }
    
    res.json({
      success: true,
      data: attlog
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/attlogs/:id/image - Obtener imagen de un marcaje específico
app.get('/api/attlogs/:id/image', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar el marcaje
    const attlog = await Attlog.findByPk(id, {
      include: [
        {
          model: Dispositivo,
          as: 'Dispositivo',
          attributes: ['id', 'nombre', 'ip_remota', 'usuario', 'clave']
        }
      ]
    });
    
    if (!attlog) {
      return res.status(404).json({ message: 'Marcaje no encontrado' });
    }
    
    // Verificar si la imagen existe localmente
    const fs = require('fs');
    const path = require('path');
    const attlogsDir = path.join(__dirname, 'attlogs');
    const imagePath = path.join(attlogsDir, `${id}.jpg`);
    
    if (fs.existsSync(imagePath)) {
      // Si existe, enviar la imagen con headers CORS
      const imageBuffer = fs.readFileSync(imagePath);
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Content-Length', imageBuffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${id}.jpg"`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.send(imageBuffer);
    } else {
      // Si no existe, intentar descargarla del dispositivo
      if (!attlog.Dispositivo.usuario || !attlog.Dispositivo.clave) {
        return res.status(400).json({ message: 'Dispositivo no tiene credenciales para descargar imagen' });
      }
      
      // Crear objeto de autenticación
      const authObject = {
        usuario_login_dispositivo: attlog.Dispositivo.usuario,
        clave_login_dispositivo: attlog.Dispositivo.clave
      };
      
      // Construir URL de imagen (necesitarías tener la pictureURL original)
      // Por ahora, retornar que no está disponible
      res.status(404).json({ 
        message: 'Imagen no disponible localmente',
        suggestion: 'La imagen no se ha descargado aún'
      });
    }
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/dispositivos/:id/download-image/:imageId - Descargar imagen de marcaje
app.get('/api/dispositivos/:id/download-image/:imageId', authenticateToken, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }

    if (!dispositivo.ip_remota || !dispositivo.usuario || !dispositivo.clave) {
      return res.status(400).json({ message: 'Dispositivo no tiene credenciales completas' });
    }

    // Verificar si la imagen ya existe localmente
    const fs = require('fs');
    const path = require('path');
    const attlogsDir = path.join(__dirname, 'attlogs');
    const localImagePath = path.join(attlogsDir, `${imageId}.jpg`);
    
    if (fs.existsSync(localImagePath)) {
      
      return res.json({
        success: true,
        message: 'Imagen ya existe localmente',
        imagePath: localImagePath,
        imageId: imageId,
        local: true
      });
    }

    // Construir URL para descargar imagen del dispositivo
    const imageUrl = `/ISAPI/Intelligent/FDLib/FDSearch/DownloadPicture?format=json&FDID=1&faceLibType=blackFD&faceID=${imageId}`;
    
    
    
    
    // Crear objeto similar a tarea para la autenticación
    const authObject = {
      usuario_login_dispositivo: dispositivo.usuario,
      clave_login_dispositivo: dispositivo.clave
    };
    
    const response = await makeDigestRequest(`http://${dispositivo.ip_remota}`, imageUrl, 'GET', null, authObject);
    
    
    
    
    if (response.status === 200 && response.data) {
      // La respuesta debería contener la imagen en base64
      let imageData = null;
      
      // Intentar diferentes formatos de respuesta
      if (response.data.pictureInfo?.picData) {
        imageData = response.data.pictureInfo.picData;
        
      } else if (typeof response.data === 'string') {
        imageData = response.data;
        
      } else if (response.data.picData) {
        imageData = response.data.picData;
        
      }
      
      if (imageData) {
        // Convertir base64 a buffer
        const imageBuffer = Buffer.from(imageData, 'base64');
        
        // Crear directorio si no existe
        if (!fs.existsSync(attlogsDir)) {
          fs.mkdirSync(attlogsDir, { recursive: true });
        }
        
        // Guardar imagen
        fs.writeFileSync(localImagePath, imageBuffer);
        
        
        
        res.json({
          success: true,
          message: 'Imagen descargada y guardada correctamente',
          imagePath: localImagePath,
          imageId: imageId,
          local: false
        });
      } else {
        
        
        res.status(404).json({ message: 'No se encontró imagen en la respuesta del dispositivo' });
      }
    } else {
      
      res.status(response.status || 500).json({ 
        message: 'Error descargando imagen del dispositivo',
        status: response.status
      });
    }
  } catch (error) {
    
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
      replacements: [id, dispositivo.ip_remota || '', dispositivo.ip_local || ''],
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

    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUserPhoto(fpid);
    
    
    res.json(result);
  } catch (error) {
    
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

    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.getUserInfo(employeeNo);
    
    
    res.json(result);
  } catch (error) {
    
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

    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUserFace(employeeNo);
    
    
    res.json(result);
  } catch (error) {
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para eliminar usuario completo
app.post('/api/hikvision/delete-user', authenticateToken, async (req, res) => {
  try {
    const { ip, usuario, clave, employeeNo } = req.body;
    
    
    
    if (!ip || !usuario || !clave || !employeeNo) {
      
      return res.status(400).json({ success: false, error: 'IP, usuario, clave y employeeNo son requeridos' });
    }
    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUser(employeeNo);
    
    
    res.json(result);
  } catch (error) {
    
    
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

    
    
    

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.deleteUserPhotoOnly(deletePhotoPayload);

    
    res.json(result);
  } catch (error) {
    
    
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

    
    
    

    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFaceWithPayload(facePayload);

    
    res.json(result);
  } catch (error) {
    
    
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

    
    
    
    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceDataBase64);
    
    
    res.json(result);
  } catch (error) {
    
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
        
        
        
      } catch (error) {
        results.push({
          size: test.size,
          description: test.description,
          characters: testBase64.length,
          success: false,
          error: error.message
        });
        
        
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
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Map para almacenar imágenes temporales con URLs cortas
const tempImages = new Map();

// Función para subir imagen a servidor PHP (eliminación automática en 5 minutos)
async function uploadToPhpServer(base64Image) {
  try {
    
    
    // Remover el prefijo data:image/...;base64, del base64
    const base64Data = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Convertir base64 a Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    
    
    // Crear FormData usando el módulo form-data
    const FormData = require('form-data');
    const formData = new FormData();
    
    // Agregar el archivo directamente como Buffer
    formData.append('image', imageBuffer, {
      filename: 'image.jpg',
      contentType: 'image/jpeg'
    });
    
    
    
    // Usar axios en lugar de fetch para mejor compatibilidad
    const axios = require('axios');
    
    const response = await axios.post('http://hotelroraimainn.com/upload.php', formData, {
      headers: {
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 segundos timeout
    });
    
    
    
    
    
    if (response.data && response.data.success && response.data.url) {
      
      
      
      
      
      
      
      return response.data.url;
    } else {
      
      return null;
    }
  } catch (error) {
    
    if (error.response) {
      
      
      
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

    
    
    
    
    
    // Subir imagen a servidor PHP y obtener URL temporal
    const publicURL = await uploadToPhpServer(imageBase64);
    
    if (!publicURL) {
      return res.status(500).json({ 
        success: false, 
        error: 'No se pudo subir la imagen al servidor PHP' 
      });
    }
    
    
    
    
    
    
    
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
    
    
    
    
    
    
    
    // 🧪 CONSOLE PARA COPIAR Y PEGAR LA URL EN EL NAVEGADOR
    
    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, publicURL);
    
    
    
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

    
    
    
    
    
    // Generar ID único para la imagen
    const imageId = `face_${employeeNo}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Almacenar imagen en memoria
    tempImages.set(imageId, imageBase64);
    
    // Crear URL externa corta
    const faceURL = `http://${ip.split(':')[0]}:3000/img/${imageId}`;
    
    
    
    
    
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
    
    
    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceURL);
    
    
    
    // Limpiar imagen temporal después de 5 minutos
    setTimeout(() => {
      tempImages.delete(imageId);
      
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

    
    
    
    
    
    // Usar directamente el base64 optimizado que viene del frontend (WebP/PNG/JPEG)
    const faceURL = compressedBase64;
    
    
    
    
    
    
    
    
    
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
    
    
    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.registerUserFace(employeeNo, name, gender, faceURL);
    
    
    
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

    
    
    
    
    const hikvision = new HikvisionISAPI(ip, usuario, clave);
    const result = await hikvision.updateUser(userData);
    
    
    res.json(result);
  } catch (error) {
    
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
      
      throw basicError;
    }
    
  } catch (error) {
    
    
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
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== RUTAS DE ATTLOGS (MARCJES) ====================

// GET /api/attlogs - Obtener todos los marcajes (DataTables server-side)
app.get('/api/attlogs', authenticateToken, async (req, res) => {
  try {
    const { 
      dispositivo_id, 
      employee_no, 
      fecha_inicio, 
      fecha_fin
    } = req.query;
    
    // Construir filtros
    const whereClause = {};
    
    if (dispositivo_id) {
      whereClause.dispositivo_id = dispositivo_id;
    }
    
    if (employee_no) {
      whereClause.employee_no = { [Op.like]: `%${employee_no}%` };
    }
    
    if (fecha_inicio && fecha_fin) {
      whereClause.event_time = {
        [Op.between]: [fecha_inicio, fecha_fin]
      };
    }
    
    const queryOptions = {
      where: whereClause,
      include: [
        {
          model: Dispositivo,
          as: 'Dispositivo',
          attributes: ['id', 'nombre', 'ip_remota']
        }
      ],
      order: [['event_time', 'DESC']]
    };
    
    const attlogs = await Attlog.findAll(queryOptions);
    
    // Respuesta simple con todos los datos
    res.json({
      attlogs: attlogs,
      total: attlogs.length
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/attlogs/:id - Obtener marcaje por ID
app.get('/api/attlogs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const attlog = await Attlog.findByPk(id, {
      include: [
        {
          model: Dispositivo,
          as: 'Dispositivo',
          attributes: ['id', 'nombre', 'ip_remota']
        }
      ]
    });
    
    if (!attlog) {
      return res.status(404).json({ message: 'Marcaje no encontrado' });
    }
    
    res.json(attlog);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
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
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener dispositivos TPP
app.get('/api/tpp/devices', authenticateToken, async (req, res) => {
  try {
    const result = await tppClient.getDevices();
    res.json(result);
  } catch (error) {
    
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
    
    res.status(500).json({ success: false, error: error.message });
  }
});

// Configuración de archivos estáticos movida al inicio del archivo

// Ruta catch-all: devolver index.html para todas las rutas no encontradas (SPA)
// IMPORTANTE: Esta ruta debe estar AL FINAL, después de todas las rutas de API
app.get('*', (req, res) => {
  // Solo servir index.html para rutas que no sean de API
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'wisi-frontend/dist/wisi-frontend/browser/index.html'));
  } else {
    res.status(404).json({ message: 'Ruta de API no encontrada' });
  }
});

app.listen(PORT, () => {
  
  
  
  
  
  
  
  
  
  
  
  
  // Inicializar trabajos CRON después de que el servidor esté listo
  setTimeout(async () => {
    
    await initializeAllCronJobs();
    
  }, 2000); // Esperar 2 segundos para que la base de datos esté lista
});

// Ruta para verificar salud de un dispositivo específico
app.get('/api/dispositivos/:id/health', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }
    
    const isHealthy = await checkDeviceHealth(dispositivo);
    
    res.json({
      device: dispositivo.nombre,
      ip: dispositivo.ip_remota,
      healthy: isHealthy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para deshabilitar dispositivos problemáticos automáticamente
app.post('/api/dispositivos/:id/disable-problematic', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const dispositivo = await Dispositivo.findByPk(id);
    if (!dispositivo) {
      return res.status(404).json({ message: 'Dispositivo no encontrado' });
    }
    
    // Deshabilitar CRON
    await dispositivo.update({ 
      cron_activo: false
    });
    
    // Detener el job de CRON si existe
    if (cronJobs[id]) {
      cronJobs[id].destroy();
      delete cronJobs[id];
      
    }
    
    res.json({ 
      message: 'Dispositivo problemático deshabilitado exitosamente',
      reason: reason || 'Timeout/Connectivity issues'
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para monitorear el estado de la cola de CRON
app.get('/api/cron/queue-status', authenticateToken, async (req, res) => {
  try {
    // Obtener configuración actual del CRON para mostrar el delay dinámico
    const cronConfig = await Cron.findOne();
    const cronValue = cronConfig ? cronConfig.value : '1m';
    const delayMs = timeToMs(cronValue);
    
    res.json({
      queueLength: cronQueue.length,
      isProcessing: isProcessingCron,
      currentProcessingDevice: currentProcessingDevice ? {
        id: currentProcessingDevice.id,
        nombre: currentProcessingDevice.nombre,
        ip_remota: currentProcessingDevice.ip_remota
      } : null,
      maxConcurrentDevices: MAX_CONCURRENT_DEVICES,
      delayBetweenDevices: cronValue,
      delayMs: delayMs,
      timeoutPerDevice: CRON_TIMEOUT,
      queue: cronQueue.map(item => ({
        device: item.dispositivo.nombre,
        timestamp: item.timestamp,
        priority: item.priority
      })),
      activeCronJobs: activeCronJobs.size
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para limpiar la cola de CRON
app.post('/api/cron/clear-queue', authenticateToken, async (req, res) => {
  try {
    const clearedCount = cronQueue.length;
    cronQueue = [];
    isProcessingCron = false;
    
    
    
    res.json({ 
      message: 'Cola de CRON limpiada exitosamente',
      clearedCount: clearedCount
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para obtener configuración de CRON global
app.get('/api/cron/config', authenticateToken, async (req, res) => {
  try {
    const cronConfig = await Cron.findOne();
    const currentValue = cronConfig ? cronConfig.value : 'Desactivado';
    
    const options = [
      'Desactivado',
      '1m',
      '5m', 
      '10m',
      '30m',
      '1h',
      '6h',
      '12h',
      '24h'
    ];
    
    res.json({
      currentValue: currentValue,
      options: options,
      isActive: currentValue !== 'Desactivado'
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para actualizar configuración de CRON global
app.put('/api/cron/config', authenticateToken, async (req, res) => {
  try {
    const { value } = req.body;
    
    const validValues = ['Desactivado', '10s', '30s', '1m', '5m', '10m', '30m', '1h', '6h', '12h', '24h'];
    if (!validValues.includes(value)) {
      return res.status(400).json({ message: 'Valor de CRON inválido' });
    }
    
    // Actualizar o crear configuración
    let cronConfig = await Cron.findOne();
    if (cronConfig) {
      await cronConfig.update({ value });
    } else {
      cronConfig = await Cron.create({ value });
    }
    
    // Reinicializar CRON global
    await initializeAllCronJobs();
    
    
    
    res.json({ 
      message: 'Configuración de CRON actualizada exitosamente',
      value: value
    });
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// =============================================
// ENDPOINTS PÚBLICOS PARA REPORTES
// =============================================

// Obtener novedades de máquinas por libro (público) - MOVIDO ARRIBA
app.get('/api/public/novedades-maquinas/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    
    
    // Verificar que el modelo existe
    if (!NovedadMaquinaRegistro) {
      
      return res.status(500).json({ message: 'Modelo no encontrado' });
    }
    
    
    
    // Consulta con includes para obtener datos completos
    const novedades = await NovedadMaquinaRegistro.findAll({
      where: { libro_id: libroId },
      include: [
        {
          model: Maquina,
          as: 'Maquina',
          include: [
            {
              model: Rango,
              as: 'Rango',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula', 'foto', 'sexo']
        }
      ],
      order: [['created_at', 'ASC']]
    });
    
    
    res.json(novedades);
  } catch (error) {
    
    
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener novedades de mesas por libro (público)
app.get('/api/public/novedades-mesas/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    const novedades = await NovedadMesaRegistro.findAll({
      where: { libro_id: libroId },
      include: [
        {
          model: Mesa,
          as: 'Mesa',
          include: [
            {
              model: Juego,
              as: 'Juego',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula', 'foto', 'sexo']
        }
      ],
      order: [['hora', 'ASC']]
    });
    res.json(novedades);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Obtener control de llaves por libro (público)
app.get('/api/public/control-llaves/:libroId', async (req, res) => {
  try {
    const { libroId } = req.params;
    const controles = await ControlLlaveRegistro.findAll({
      where: { libro_id: libroId },
      include: [
        {
          model: Llave,
          as: 'Llave',
          include: [
            {
              model: Sala,
              as: 'Sala',
              attributes: ['id', 'nombre']
            }
          ]
        },
        {
          model: Empleado,
          as: 'Empleado',
          attributes: ['id', 'nombre', 'cedula', 'foto', 'sexo']
        }
      ],
      order: [['hora', 'ASC']]
    });
    res.json(controles);
  } catch (error) {
    
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
