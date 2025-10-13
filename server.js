const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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
  console.log(`🔄 [COLA] Procesando cola de CRON: ${cronQueue.length} dispositivos pendientes`);
  
  while (cronQueue.length > 0) {
    const { dispositivo, timestamp } = cronQueue.shift();
    
    // Actualizar dispositivo actual
    currentProcessingDevice = dispositivo;
    
    try {
      console.log(`🔄 [COLA] Procesando dispositivo: ${dispositivo.nombre} (en cola desde: ${timestamp})`);
      
      // Verificar salud del dispositivo antes de proceder
      const isHealthy = await checkDeviceHealth(dispositivo);
      if (!isHealthy) {
        console.log(`⚠️ [COLA] Dispositivo ${dispositivo.nombre} no disponible, saltando sincronización`);
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
        console.log(`⚠️ [COLA] Sincronización con errores para ${dispositivo.nombre}: ${result.error}`);
      } else {
        console.log(`✅ [COLA] Sincronización completada para dispositivo: ${dispositivo.nombre}`);
        console.log(`📊 [COLA] Resultado: ${result.savedCount} guardados, ${result.skippedCount} omitidos, ${result.errorCount} errores`);
      }
    } catch (error) {
      console.error(`❌ [COLA] Error en sincronización para ${dispositivo.nombre}:`, error.message);
      
      // Si es un error de timeout, marcar el dispositivo como problemático
      if (error.message === 'Timeout' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        console.log(`🚫 [COLA] Dispositivo ${dispositivo.nombre} marcado como problemático por timeout`);
      }
    }
    
    // Delay entre dispositivos basado en la configuración del CRON global
    if (cronQueue.length > 0) {
      const cronConfig = await Cron.findOne();
      const cronValue = cronConfig ? cronConfig.value : '1m';
      const delayMs = timeToMs(cronValue);
      
      console.log(`⏳ [COLA] Esperando ${cronValue} antes del siguiente dispositivo...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // Limpiar dispositivo actual
  currentProcessingDevice = null;
  isProcessingCron = false;
  console.log(`✅ [COLA] Cola de CRON procesada completamente`);
}

// Función para verificar la salud del dispositivo
async function checkDeviceHealth(dispositivo) {
  try {
    console.log(`🏥 Verificando salud del dispositivo: ${dispositivo.nombre} (${dispositivo.ip_remota})`);
    
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
      console.log(`✅ Dispositivo ${dispositivo.nombre} está disponible`);
      return true;
    } else {
      console.log(`⚠️ Dispositivo ${dispositivo.nombre} respondió con status: ${healthResponse?.status}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Dispositivo ${dispositivo.nombre} no está disponible: ${error.message}`);
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
      console.log(`⚠️ Dispositivo ${dispositivo.nombre} no está disponible, saltando sincronización`);
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
    console.log(`📅 Último evento sincronizado: ${lastEventTime || 'Ninguno - sincronizando todos los eventos'}`);
    
    // Función para formatear fechas al formato correcto de Hikvision
    function formatDateForHikvision(dateInput) {
      console.log(`🔍 formatDateForHikvision - Input: ${dateInput}, Tipo: ${typeof dateInput}`);
      
      if (!dateInput) {
        console.log(`⚠️ dateInput es null/undefined`);
        return null;
      }
      
      const date = new Date(dateInput);
      console.log(`🔍 Date creado: ${date}, isValid: ${!isNaN(date.getTime())}`);
      
      if (isNaN(date.getTime())) {
        console.log(`⚠️ Fecha inválida: ${dateInput}`);
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
      console.log(`🔍 Resultado formateado: ${result}`);
      return result;
    }
    
    // Si no hay eventos previos, usar marcaje_inicio del dispositivo
    // Si hay eventos previos, usar el último evento
    let startTimeForQuery = lastEventTime || dispositivo.marcaje_inicio;
    startTimeForQuery = formatDateForHikvision(startTimeForQuery);
    
    // Convertir marcaje_fin al formato correcto
    console.log(`🔍 marcaje_fin original: ${dispositivo.marcaje_fin}`);
    console.log(`🔍 Tipo de marcaje_fin: ${typeof dispositivo.marcaje_fin}`);
    
    let endTimeForQuery = formatDateForHikvision(dispositivo.marcaje_fin);
    console.log(`🔍 endTimeForQuery después del formateo: ${endTimeForQuery}`);
    
    console.log(`🔍 Fechas que se envían al dispositivo:`);
    console.log(`   startTime: ${startTimeForQuery}`);
    console.log(`   endTime: ${endTimeForQuery}`);
    
    // Validar que las fechas sean válidas
    if (!startTimeForQuery || !endTimeForQuery) {
      console.log(`❌ Error: Fechas inválidas - startTime: ${startTimeForQuery}, endTime: ${endTimeForQuery}`);
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

    console.log(`🔄 Iniciando sincronización para dispositivo: ${dispositivo.nombre} (${dispositivo.ip_remota})`);

    // Primera consulta: obtener información general (sin eventos, solo para saber cuántos hay)
    console.log(`🔍 Consulta inicial: verificando eventos disponibles...`);
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
    
    console.log(`🔐 Credenciales para autenticación:`);
    console.log(`👤 Usuario: ${authObject.usuario_login_dispositivo}`);
    console.log(`🔑 Clave: ${authObject.clave_login_dispositivo ? '***' + authObject.clave_login_dispositivo.slice(-3) : 'undefined'}`);
    console.log(`🌐 URL dispositivo: http://${dispositivo.ip_remota}`);
    
    const initialResponse = await makeDigestRequest(`http://${dispositivo.ip_remota}`, initialEndpoint, 'POST', initialBody, authObject);
    
    if (!initialResponse) {
      console.log(`❌ Error: makeDigestRequest devolvió undefined/null en consulta inicial`);
      return { totalEvents: 0, savedCount: 0, skippedCount: 0, errorCount: 1, dispositivo: dispositivo.nombre };
    }
    
    if (!initialResponse || initialResponse.status !== 200) {
      console.log(`❌ Error en consulta inicial: ${initialResponse.status}`);
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
      
      console.log(`📡 Consultando página ${Math.floor(startIndex/30) + 1} - Índice: ${startIndex}`);
      console.log(`🌐 URL completa: http://${dispositivo.ip_remota}${endpoint}`);
      console.log(`📦 Body: ${JSON.stringify(requestBody)}`);
      
      const response = await makeDigestRequest(`http://${dispositivo.ip_remota}`, endpoint, 'POST', requestBody, authObject);
      
      if (!response) {
        console.log(`❌ Error: makeDigestRequest devolvió undefined/null`);
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
          console.log(`✅ No hay más eventos. Total procesados: ${totalProcessed}`);
        } else {
          allEvents = allEvents.concat(events);
          totalProcessed += events.length;
          startIndex += 30;
          
          console.log(`📊 Página procesada: ${events.length} eventos. Total acumulado: ${totalProcessed}`);
          
          // Si recibimos menos de 30 eventos, es la última página
          if (events.length < 30) {
            hasMoreData = false;
            console.log(`✅ Última página detectada. Total final: ${totalProcessed}`);
          }
          
        }
      } else {
        console.log(`❌ Error en página ${Math.floor(startIndex/30) + 1}: ${response.status}`);
        console.log(`🔍 Respuesta de error:`, JSON.stringify(response.data, null, 2));
        hasMoreData = false;
      }
    }
    

    console.log(`📋 Total de eventos obtenidos: ${allEvents.length}`);

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
          console.log(`⚠️ Evento sin employeeNoString, saltando...`);
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
          console.log(`⚠️ Evento con datos corruptos (headers HTTP), saltando: ${event.employeeNoString}`);
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
          console.log(`⚠️ Evento con nombre corrupto (headers HTTP), saltando: ${event.name}`);
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
        console.log(`💾 Guardando evento: ${event.employeeNoString} - ${event.name} - ${event.time}`);
        const attlog = await Attlog.create({
          dispositivo_id: dispositivo.id,
          employee_no: event.employeeNoString,
          event_time: event.time,
          nombre: event.name
        });
        console.log(`✅ Evento guardado con ID: ${attlog.id}`);

        // Verificar si el evento tiene campo de imagen antes de procesar
        console.log(`🔍 Evento ${attlog.id} - Verificando campo pictureURL...`);
        
        if (!event.pictureURL || event.pictureURL === '' || event.pictureURL === null || event.pictureURL === undefined) {
          console.log(`⚠️ Evento ${attlog.id} NO tiene campo pictureURL - Omitiendo descarga de imagen`);
          eventsWithoutImage++;
          // Continuar con el siguiente evento sin procesar imagen
        } else {
          console.log(`📸 Evento ${attlog.id} SÍ tiene imagen: ${event.pictureURL}`);
          
          // Procesar imagen de forma síncrona para mejor control
          try {
              // Usar la URL completa de la imagen para autenticación
              const fullImageUrl = event.pictureURL.split('@')[0];
              console.log(`🔍 URL completa de imagen: ${fullImageUrl}`);
              
              // Extraer solo la ruta para makeDigestRequest
              const imagePath = event.pictureURL.split('@')[0].replace(`http://${dispositivo.ip_remota}`, '');
              console.log(`🔍 Ruta de imagen: ${imagePath}`);
              
              // Descargar imagen usando Digest Authentication con headers específicos para imagen
              const imageResponse = await makeDigestRequestForImage(`http://${dispositivo.ip_remota}`, imagePath, authObject);
              
              console.log(`🔍 Respuesta de imagen - Status: ${imageResponse.status}`);
              console.log(`🔍 Respuesta de imagen - Data type: ${typeof imageResponse.data}`);
              console.log(`🔍 Respuesta de imagen - Data length: ${imageResponse.data ? imageResponse.data.length : 'undefined'}`);
              
              if (imageResponse.status === 200 && imageResponse.data) {
                let imageBuffer;
                
                // Manejar diferentes formatos de respuesta
                if (Buffer.isBuffer(imageResponse.data)) {
                  // Si ya es un buffer (imagen binaria)
                  imageBuffer = imageResponse.data;
                  console.log(`🔍 Imagen recibida como buffer de ${imageBuffer.length} bytes`);
                } else if (typeof imageResponse.data === 'string') {
                  // Si es string, limpiar el prefijo data:image/jpeg;base64, si existe
                  let base64Data = imageResponse.data;
                  if (base64Data.startsWith('data:image/')) {
                    base64Data = base64Data.split(',')[1]; // Remover prefijo data:image/jpeg;base64,
                    console.log(`🔍 Removido prefijo data:image/ del string base64`);
                  }
                  imageBuffer = Buffer.from(base64Data, 'base64');
                  console.log(`🔍 Imagen recibida como string base64, convertida a buffer de ${imageBuffer.length} bytes`);
                } else if (imageResponse.data.pictureInfo && imageResponse.data.pictureInfo.picData) {
                  // Si es objeto con pictureInfo.picData
                  imageBuffer = Buffer.from(imageResponse.data.pictureInfo.picData, 'base64');
                  console.log(`🔍 Imagen recibida en pictureInfo.picData, convertida a buffer de ${imageBuffer.length} bytes`);
                } else {
                  console.log(`❌ Formato de imagen no reconocido para evento ${attlog.id}`);
                  console.log(`🔍 Tipo de data: ${typeof imageResponse.data}`);
                  console.log(`🔍 Estructura:`, JSON.stringify(imageResponse.data, null, 2));
                  return; // Salir sin error para no detener el CRON
                }
                
                // Verificar que el buffer no esté vacío
                if (imageBuffer && imageBuffer.length > 0) {
                  const filePath = path.join(attlogsDir, `${attlog.id}.jpg`);
                  fs.writeFileSync(filePath, imageBuffer);
                  console.log(`✅ Imagen guardada: ${filePath} (${imageBuffer.length} bytes)`);
                  imagesDownloaded++;
                } else {
                  console.log(`❌ Buffer de imagen vacío para evento ${attlog.id}`);
                  imagesErrors++;
                }
              } else {
                console.log(`❌ Error descargando imagen para evento ${attlog.id}: ${imageResponse.status}`);
                console.log(`🔍 Respuesta de error:`, imageResponse.data);
                imagesErrors++;
              }
            } catch (imageError) {
              console.log(`❌ Error procesando imagen para evento ${attlog.id}:`, imageError.message);
              console.log(`⚠️ Continuando con el CRON a pesar del error de imagen`);
              imagesErrors++;
            }
        }

        savedCount++;
        console.log(`✅ Evento guardado: ${event.employeeNoString} - ${event.time}`);

      } catch (eventError) {
        errorCount++;
        console.log(`❌ Error procesando evento:`, eventError.message);
      }
    }

    // Descargar imágenes para eventos que tienen pictureInfo
    console.log(`📸 Procesamiento de imágenes completado: ${imagesDownloaded} descargadas, ${imagesErrors} errores, ${eventsWithoutImage} sin imagen`);

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
    console.error('❌ Error en syncAttendanceFromDevice:', error);
    
    // Manejo específico para socket hang up
    if (error.code === 'ECONNRESET' || error.message.includes('socket hang up')) {
      console.log('⚠️ Dispositivo cerró la conexión - reintentando en el siguiente ciclo');
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
      console.log(`📋 [CRON] Agregando dispositivo ${dispositivo.nombre} a la cola de sincronización`);
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
    
    console.log(`⏰ [CRON] Trabajo programado para ${dispositivo.nombre} con expresión: ${cronExpression}`);

    activeCronJobs.set(jobId, job);
    console.log(`⏰ CRON iniciado para dispositivo ${dispositivo.nombre} (${dispositivo.cron_tiempo})`);
  }
}

// Función para detener CRON de un dispositivo
function stopCronForDevice(dispositivoId) {
  const jobId = `device_${dispositivoId}`;
  
  if (activeCronJobs.has(jobId)) {
    activeCronJobs.get(jobId).destroy();
    activeCronJobs.delete(jobId);
    console.log(`⏹️ CRON detenido para dispositivo ID: ${dispositivoId}`);
  }
}

// Función para ejecutar sincronización global
async function executeGlobalSync() {
  try {
    console.log('🔄 [GLOBAL SYNC] Iniciando sincronización global...');
    
    // Obtener todos los dispositivos con credenciales completas
    const dispositivos = await Dispositivo.findAll({
      where: { 
        ip_remota: { [Op.ne]: null },
        usuario: { [Op.ne]: null },
        clave: { [Op.ne]: null }
      },
      attributes: ['id', 'nombre', 'ip_remota', 'usuario', 'clave', 'marcaje_inicio', 'marcaje_fin']
    });
    
    console.log(`📱 [GLOBAL SYNC] Encontrados ${dispositivos.length} dispositivos para sincronizar`);
    
    if (dispositivos.length === 0) {
      console.log('⚠️ [GLOBAL SYNC] No hay dispositivos para sincronizar');
      return;
    }
    
    // Agregar SOLO el dispositivo actual del ciclo rotativo
    const currentDevice = dispositivos[currentDeviceIndex];
    console.log(`📋 [GLOBAL SYNC] Agregando dispositivo ${currentDevice.nombre} (índice ${currentDeviceIndex}) a la cola`);
    
    cronQueue.push({
      dispositivo: currentDevice,
      timestamp: new Date().toISOString(),
      priority: 1
    });
    
    // Avanzar al siguiente dispositivo para la próxima ejecución
    currentDeviceIndex = (currentDeviceIndex + 1) % dispositivos.length;
    console.log(`🔄 [GLOBAL SYNC] Próximo dispositivo será el índice ${currentDeviceIndex}`);
    
    // Procesar cola si no está en proceso
    if (!isProcessingCron) {
      processCronQueue();
    }
    
  } catch (error) {
    console.error('❌ [GLOBAL SYNC] Error en sincronización global:', error);
  }
}

// Función para inicializar el CRON global
async function initializeAllCronJobs() {
  try {
    console.log('🔄 Inicializando CRON global...');
    
    // Obtener configuración de CRON
    const cronConfig = await Cron.findOne();
    const cronValue = cronConfig ? cronConfig.value : 'Desactivado';
    
    console.log(`⏰ Configuración de CRON: ${cronValue}`);
    
    if (cronValue === 'Desactivado') {
      console.log('⚠️ CRON global desactivado');
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
      console.log('🔄 [CRON GLOBAL] Ejecutando sincronización global...');
      executeGlobalSync();
    }, {
      scheduled: true,
      timezone: "America/Caracas"
    });
    
    activeCronJobs.set('global', globalCronJob);
    console.log(`✅ CRON global inicializado con expresión: ${cronExpression}`);
    
  } catch (error) {
    console.error('❌ Error inicializando CRON global:', error);
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
      nivel
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

    // Verificar si el libro tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para libro:', {
      id: id,
      sala_id: libro.sala_id
    });
    const relations = await sequelize.query(`
      SELECT table_name, count FROM (
        SELECT 'Novedades de Máquinas' as table_name, COUNT(*) as count FROM novedades_maquinas_registros WHERE libro_id = ?
        UNION ALL
        SELECT 'Incidencias Generales' as table_name, COUNT(*) as count FROM incidencias_generales WHERE libro_id = ?
        UNION ALL
        SELECT 'Drops' as table_name, COUNT(*) as count FROM drops WHERE libro_id = ?
      ) as relations WHERE count > 0
    `, {
      replacements: [id, id, id],
      type: sequelize.QueryTypes.SELECT
    });
    console.log('🔍 Resultado de verificación de relaciones para libro:', relations);
    
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
    console.error('Error actualizando rango:', error);
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
    console.log('🔍 Resultado de verificación de relaciones para rango:', relations);
    
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
        order: [['orden', 'ASC']]
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
    console.error('Error obteniendo horarios por sala:', error);
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
    console.error('Error obteniendo horarios del empleado:', error);
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
    console.error('Error asignando horario al empleado:', error);
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
      console.error('Error verificando relaciones:', relationError);
      // Si hay error en la verificación, continuar con la eliminación
    }
    
    console.log('🔍 Resultado de verificación de relaciones para horario de empleado:', relations);

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
    console.error('Error eliminando horario del empleado:', error);
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
    console.error('Error actualizando mesa:', error);
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
    console.log('🔍 Resultado de verificación de relaciones para mesa:', relations);
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la mesa porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, eliminar la mesa
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
    console.error('Error actualizando juego:', error);
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
    console.log('🔍 Resultado de verificación de relaciones para juego:', relations);
    
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
    console.error('Error actualizando máquina:', error);
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
    console.log('🔍 Resultado de verificación de relaciones para máquina:', relations);
    
    if (relations.length > 0) {
      return res.status(400).json({
        message: 'No se puede eliminar la máquina porque tiene relaciones',
        relations: relations
      });
    }
    
    // Si no hay relaciones, eliminar la máquina
    await maquina.destroy();
    res.json({ message: 'Máquina eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando máquina:', error);
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
    console.error('Error obteniendo cargos:', error);
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
    console.error('Error obteniendo tareas:', error);
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
    console.error('Error obteniendo horarios:', error);
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
    console.error('Error obteniendo dispositivos:', error);
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
    console.error('Error en debug filtro:', error);
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
    console.error('Error en debug cargo:', error);
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
    console.error('Error obteniendo usuario actual:', error);
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
    console.error('Error verificando cédula:', error);
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
    console.error('Error obteniendo empleados por sala:', error);
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
        model: Empleado,
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

    // Verificar si el drop tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para drop:', {
      id: id,
      mesa_id: drop.mesa_id
    });
    
    // No hay relaciones que verificar para drops ya que novedades_maquinas_registros no tiene drop_id
    const relations = [];
    console.log('🔍 Resultado de verificación de relaciones para drop:', relations);

    await drop.destroy();
    res.json({ message: 'Drop eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error eliminando drop:', error);
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
    
    console.log('🔍 Obteniendo registros para libro:', libroId);
    
    let registros;
    
    if (userLevel === 'TODO') {
      console.log('🔍 Ejecutando consulta para usuario TODO');
      
      // Verificar la estructura de la tabla primero
      const tableInfo = await sequelize.query("PRAGMA table_info(novedades_maquinas_registros)", {
        type: sequelize.QueryTypes.SELECT
      });
      console.log('🔍 Estructura de la tabla:', tableInfo);
      
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
    console.error('❌ Error obteniendo registros de novedades de máquinas:', error);
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

    // Verificar si la incidencia tiene relaciones que impidan su eliminación
    console.log('🔍 Verificando relaciones para incidencia general:', {
      id: id,
      libro_id: incidencia.libro_id
    });
    
    // Por ahora no hay tablas relacionadas con incidencias_generales
    // Si en el futuro se agregan relaciones, se puede verificar aquí
    const relations = [];
    console.log('🔍 Resultado de verificación de relaciones para incidencia general:', relations);

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

    // Si es el usuario creador (nivel TODO), devolver todos los empleados
    if (user.nivel === 'TODO') {
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
                        attributes: ['id', 'nombre']
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
                      required: false
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
        }
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
      console.log(`🔍 Empleado ${empleado.nombre} (ID: ${empleado.id}) - Dispositivos encontrados:`, dispositivos);
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
      cargo_id});

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

// ==================== ENDPOINTS DE COMUNICACIÓN CON DISPOSITIVOS ====================

// POST /api/tareas/dispositivo/borrar-usuario
app.post('/api/tareas/dispositivo/borrar-usuario', authenticateToken, async (req, res) => {
  console.log('🚀 ENDPOINT BORRAR USUARIO LLAMADO!');
  try {
    const { tarea } = req.body;
    
    console.log('🗑️ ========== BORRAR USUARIO ==========');
    console.log('👤 Empleado:', tarea.numero_cedula_empleado);
    console.log('📱 Dispositivo:', tarea.ip_publica_dispositivo);
    console.log('🔐 Usuario login:', tarea.usuario_login_dispositivo);
    console.log('🗑️ ======================================');
    
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Usuario eliminado correctamente del dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error borrando usuario:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/tareas/dispositivo/agregar-usuario
app.post('/api/tareas/dispositivo/agregar-usuario', authenticateToken, async (req, res) => {
  console.log('🚀 ENDPOINT AGREGAR USUARIO LLAMADO!');
  try {
    const { tarea } = req.body;
    
    console.log('➕ ========== AGREGAR USUARIO ==========');
    console.log('👤 Empleado:', tarea.numero_cedula_empleado);
    console.log('📝 Nombre:', tarea.nombre_empleado);
    console.log('⚧ Género:', tarea.nombre_genero);
    console.log('📱 Dispositivo:', tarea.ip_publica_dispositivo);
    console.log('🔐 Usuario login:', tarea.usuario_login_dispositivo);
    console.log('➕ ======================================');
    
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Usuario agregado correctamente al dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error agregando usuario:', error.message);
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Usuario editado correctamente en el dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error editando usuario:', error.message);
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Foto eliminada correctamente del dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error borrando foto:', error.message);
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Foto agregada correctamente al dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error agregando foto:', error.message);
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
      console.log('⚠️ Error borrando foto existente (continuando):', deleteError.message);
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
      console.log('✅ Dispositivo respondió exitosamente');
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.json({
        success: true,
        message: 'Foto editada correctamente en el dispositivo',
        deviceResponse: response.data
      });
    } else {
      console.log('❌ Dispositivo respondió con error:', response.status);
      console.log('📦 Respuesta del dispositivo:', JSON.stringify(response.data, null, 2));
      res.status(500).json({
        success: false,
        message: `El dispositivo respondió con error: ${response.status} - ${response.statusText}`,
        deviceResponse: response.data
      });
    }
    
  } catch (error) {
    console.log('❌ Error editando foto:', error.message);
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
  
  console.log(`🔍 makeDigestRequestForImage - URL: ${fullUrl}`);
  console.log(`🔍 makeDigestRequestForImage - Username: ${username}`);
  console.log(`🔍 makeDigestRequestForImage - Password: ${password ? '***' + password.slice(-3) : 'undefined'}`);
  
  try {
    // Primera petición para obtener challenge digest
    console.log(`🔄 Realizando primera petición para obtener challenge digest...`);
    
    const firstResponse = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'image/jpeg, image/png, */*'
      },
      timeout: 30000,
      validateStatus: (status) => status === 401
    });
    
    console.log(`⚠️ No se recibió challenge 401, intentando sin autenticación...`);
    const directResponse = await axios({
      method: 'GET',
      url: fullUrl,
      headers: {
        'Accept': 'image/jpeg, image/png, */*'
      },
      timeout: 30000,
      responseType: 'arraybuffer' // Importante para imágenes binarias
    });
    
    console.log(`🔍 makeDigestRequestForImage - Respuesta sin auth:`, directResponse.status);
    return directResponse;
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Challenge digest recibido (401)');
      console.log(`🔍 Status: ${error.response.status}`);
      console.log(`🔍 Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      
      // Extraer información del challenge digest
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        
        // Generar respuesta digest
        console.log(`🔐 Challenge parseado:`, challenge);
        const digestResponse = generateDigestResponse(challenge, username, password, fullUrl, 'GET');
        console.log(`🔑 Respuesta digest generada: ${digestResponse}`);
        
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
          
          console.log(`🔍 makeDigestRequestForImage - Respuesta final: ${secondResponse.status}`);
          console.log(`🔍 makeDigestRequestForImage - Data: ${secondResponse.data ? 'Presente' : 'Ausente'}`);
          return secondResponse;
          
        } catch (secondError) {
          console.log(`❌ Error en segunda petición: ${secondError.response?.status}`);
          if (secondError.response?.data) {
            console.log(`📦 Respuesta del dispositivo:`, secondError.response.data);
          }
          throw secondError;
        }
      } else {
        console.log(`❌ No se encontró challenge digest válido`);
        throw error;
      }
    } else {
      console.log(`❌ Error en primera petición:`, error.message);
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
  
  console.log(`🔍 makeDigestRequest - URL: ${fullUrl}`);
  console.log(`🔍 makeDigestRequest - Method: ${method}`);
  console.log(`🔍 makeDigestRequest - Username: ${username}`);
  console.log(`🔍 makeDigestRequest - Password: ${password ? '***' + password.slice(-3) : 'undefined'}`);
  console.log(`🔍 makeDigestRequest - RequestBody: ${requestBody ? JSON.stringify(requestBody).substring(0, 100) + '...' : 'null'}`);
  
  // Primera petición para obtener challenge digest
  console.log(`🔄 Realizando primera petición para obtener challenge digest...`);
  
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
    console.log(`⚠️ No se recibió challenge 401, intentando sin autenticación...`);
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
    
    console.log(`🔍 makeDigestRequest - Respuesta sin auth:`, directResponse.status);
    return directResponse;
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Challenge digest recibido (401)');
      console.log(`🔍 Status: ${error.response.status}`);
      console.log(`🔍 Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      
      // Extraer información del challenge digest
      const wwwAuthenticate = error.response.headers['www-authenticate'];
      
      if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
        // Parsear el challenge digest
        const challenge = parseDigestChallenge(wwwAuthenticate);
        
        // Generar respuesta digest
        console.log(`🔐 Challenge parseado:`, challenge);
        const digestResponse = generateDigestResponse(challenge, username, password, fullUrl, method);
        console.log(`🔑 Respuesta digest generada: ${digestResponse}`);
        
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
          
          console.log(`🔍 makeDigestRequest - Respuesta final:`, secondResponse.status);
          console.log(`🔍 makeDigestRequest - Data:`, secondResponse.data ? 'Presente' : 'Ausente');
          return secondResponse;
        } catch (secondError) {
          // Devolver la respuesta del error para que el frontend pueda manejarla
          console.log(`❌ Error en segunda petición: ${secondError.response ? secondError.response.status : 'Sin respuesta'}`);
          if (secondError.response) {
            console.log(`📦 Respuesta del dispositivo:`, JSON.stringify(secondError.response.data, null, 2));
            return secondError.response;
          } else {
            // Si no hay respuesta, crear una respuesta de error
            console.log(`❌ Sin respuesta del dispositivo`);
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
        console.log(`✅ CRON activado/actualizado para dispositivo: ${dispositivoActualizado.nombre}`);
      } else {
        // Desactivar CRON
        stopCronForDevice(id);
        console.log(`⏹️ CRON desactivado para dispositivo: ${dispositivoActualizado.nombre}`);
      }
    }

    res.json({
      success: true,
      message: 'Configuración CRON actualizada correctamente',
      dispositivo: dispositivoActualizado
    });
  } catch (error) {
    console.error('❌ Error actualizando configuración CRON:', error);
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
    console.error('❌ Error sincronizando marcajes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// POST /api/test-sync/:id - Endpoint de prueba para sincronización (sin autenticación)
app.post('/api/test-sync/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🧪 TEST: Sincronización manual iniciada para dispositivo ${id}`);
    
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
    console.error('❌ Error en test de sincronización:', error);
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
    
    console.log(`🔍 VERIFY: Verificando descarga de imagen del dispositivo ${id}`);
    
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
    console.log(`🔍 URL completa de imagen: ${fullImageUrl}`);
    
    // Extraer solo la ruta para makeDigestRequest
    const imagePath = fullImageUrl.replace(`http://${dispositivo.ip_remota}`, '').split('@')[0];
    console.log(`🔍 Ruta de imagen: ${imagePath}`);
    
    // Descargar imagen usando Digest Authentication
    const imageResponse = await makeDigestRequest(`http://${dispositivo.ip_remota}`, imagePath, 'GET', null, authObject);
    
    console.log(`🔍 Respuesta - Status: ${imageResponse.status}`);
    console.log(`🔍 Respuesta - Data type: ${typeof imageResponse.data}`);
    console.log(`🔍 Respuesta - Data length: ${imageResponse.data ? imageResponse.data.length : 'undefined'}`);
    
    if (imageResponse.status === 200 && imageResponse.data) {
      let imageBuffer;
      
      if (Buffer.isBuffer(imageResponse.data)) {
        imageBuffer = imageResponse.data;
        console.log(`🔍 Imagen recibida como buffer de ${imageBuffer.length} bytes`);
      } else if (typeof imageResponse.data === 'string') {
        // Limpiar el prefijo data:image/jpeg;base64, si existe
        let base64Data = imageResponse.data;
        if (base64Data.startsWith('data:image/')) {
          base64Data = base64Data.split(',')[1]; // Remover prefijo data:image/jpeg;base64,
          console.log(`🔍 Removido prefijo data:image/ del string base64`);
        }
        imageBuffer = Buffer.from(base64Data, 'base64');
        console.log(`🔍 Imagen recibida como string base64, convertida a buffer de ${imageBuffer.length} bytes`);
      } else {
        console.log(`❌ Formato no reconocido:`, JSON.stringify(imageResponse.data, null, 2));
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
    console.error('❌ Error verificando imagen:', error);
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
    console.error('❌ Error obteniendo marcaje:', error);
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
    console.error('❌ Error obteniendo imagen del marcaje:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// GET /api/dispositivos/:id/download-image/:imageId - Descargar imagen de marcaje
app.get('/api/dispositivos/:id/download-image/:imageId', authenticateToken, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    
    console.log(`📸 Solicitando descarga de imagen ${imageId} del dispositivo ${id}`);
    
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
      console.log(`✅ Imagen ya existe localmente: ${imageId}.jpg`);
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
    
    console.log(`📸 Descargando imagen ${imageId} del dispositivo ${dispositivo.nombre}`);
    console.log(`🌐 URL imagen: http://${dispositivo.ip_remota}${imageUrl}`);
    
    // Crear objeto similar a tarea para la autenticación
    const authObject = {
      usuario_login_dispositivo: dispositivo.usuario,
      clave_login_dispositivo: dispositivo.clave
    };
    
    const response = await makeDigestRequest(`http://${dispositivo.ip_remota}`, imageUrl, 'GET', null, authObject);
    
    console.log(`🔍 Respuesta del dispositivo - Status: ${response.status}`);
    console.log(`🔍 Respuesta del dispositivo - Data type: ${typeof response.data}`);
    
    if (response.status === 200 && response.data) {
      // La respuesta debería contener la imagen en base64
      let imageData = null;
      
      // Intentar diferentes formatos de respuesta
      if (response.data.pictureInfo?.picData) {
        imageData = response.data.pictureInfo.picData;
        console.log(`🔍 Imagen encontrada en pictureInfo.picData`);
      } else if (typeof response.data === 'string') {
        imageData = response.data;
        console.log(`🔍 Imagen encontrada como string directo`);
      } else if (response.data.picData) {
        imageData = response.data.picData;
        console.log(`🔍 Imagen encontrada en picData`);
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
        
        console.log(`✅ Imagen guardada: ${imageId}.jpg`);
        
        res.json({
          success: true,
          message: 'Imagen descargada y guardada correctamente',
          imagePath: localImagePath,
          imageId: imageId,
          local: false
        });
      } else {
        console.log(`❌ No se encontró imagen en la respuesta del dispositivo`);
        console.log(`🔍 Estructura de respuesta:`, JSON.stringify(response.data, null, 2));
        res.status(404).json({ message: 'No se encontró imagen en la respuesta del dispositivo' });
      }
    } else {
      console.log(`❌ Error en respuesta del dispositivo: ${response.status}`);
      res.status(response.status || 500).json({ 
        message: 'Error descargando imagen del dispositivo',
        status: response.status
      });
    }
  } catch (error) {
    console.error('❌ Error descargando imagen:', error);
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
    console.error('❌ Error obteniendo attlogs:', error);
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
    console.error('❌ Error obteniendo marcaje:', error);
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
  console.log('📡 Endpoints de dispositivos disponibles:');
  console.log('   POST /api/tareas/dispositivo/borrar-usuario');
  console.log('   POST /api/tareas/dispositivo/agregar-usuario');
  console.log('   POST /api/tareas/dispositivo/editar-usuario');
  console.log('   POST /api/tareas/dispositivo/borrar-foto');
  console.log('   POST /api/tareas/dispositivo/agregar-foto');
  console.log('   POST /api/tareas/dispositivo/editar-foto');
  console.log(`🚀 TPP Hikvision API: http://localhost:${PORT}/api/tpp`);
  
  // Inicializar trabajos CRON después de que el servidor esté listo
  setTimeout(async () => {
    console.log('🔄 [INIT] Iniciando trabajos CRON...');
    await initializeAllCronJobs();
    console.log('✅ [INIT] Trabajos CRON inicializados');
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
    console.error('Error verificando salud del dispositivo:', error);
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
      console.log(`🚫 Dispositivo problemático deshabilitado: ${dispositivo.nombre} - Razón: ${reason || 'Timeout/Connectivity'}`);
    }
    
    res.json({ 
      message: 'Dispositivo problemático deshabilitado exitosamente',
      reason: reason || 'Timeout/Connectivity issues'
    });
  } catch (error) {
    console.error('Error deshabilitando dispositivo problemático:', error);
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
    console.error('Error obteniendo estado de la cola:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// Ruta para limpiar la cola de CRON
app.post('/api/cron/clear-queue', authenticateToken, async (req, res) => {
  try {
    const clearedCount = cronQueue.length;
    cronQueue = [];
    isProcessingCron = false;
    
    console.log(`🧹 Cola de CRON limpiada: ${clearedCount} elementos removidos`);
    
    res.json({ 
      message: 'Cola de CRON limpiada exitosamente',
      clearedCount: clearedCount
    });
  } catch (error) {
    console.error('Error limpiando cola de CRON:', error);
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
    console.error('Error obteniendo configuración de CRON:', error);
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
    
    console.log(`⏰ Configuración de CRON actualizada: ${value}`);
    
    res.json({ 
      message: 'Configuración de CRON actualizada exitosamente',
      value: value
    });
  } catch (error) {
    console.error('Error actualizando configuración de CRON:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});
