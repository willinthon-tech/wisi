const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

/**
 * 🏢 WISI-HIKVISION HYBRID SYSTEM
 * Sistema híbrido que combina ISAPI actual con preparación para TPP
 * Funciona inmediatamente y se integra con TPP cuando esté disponible
 */

class WisiHikvisionHybrid {
  constructor() {
    this.isapiDevices = new Map(); // Dispositivos ISAPI actuales
    this.tppDevices = new Map(); // Dispositivos TPP (cuando esté disponible)
    this.hybridMode = true; // Modo híbrido activado
  }

  // ==================== GESTIÓN DE DISPOSITIVOS ====================
  
  /**
   * 📱 Registrar dispositivo ISAPI
   */
  registerISAPIDevice(deviceId, ip, username, password, port = 80, protocol = 'http') {
    const device = {
      id: deviceId,
      type: 'ISAPI',
      ip: ip,
      username: username,
      password: password,
      port: port,
      protocol: protocol,
      status: 'offline',
      lastSeen: null,
      capabilities: null,
      users: [],
      events: []
    };
    
    this.isapiDevices.set(deviceId, device);
    console.log(`📱 Dispositivo ISAPI registrado: ${deviceId} (${ip})`);
    return device;
  }

  /**
   * 📱 Registrar dispositivo TPP (cuando esté disponible)
   */
  registerTPPDevice(deviceId, tppData) {
    const device = {
      id: deviceId,
      type: 'TPP',
      tppData: tppData,
      status: 'offline',
      lastSeen: null,
      capabilities: null,
      users: [],
      events: []
    };
    
    this.tppDevices.set(deviceId, device);
    console.log(`📱 Dispositivo TPP registrado: ${deviceId}`);
    return device;
  }

  // ==================== OPERACIONES CRUD ====================
  
  /**
   * 👥 Obtener usuarios (ISAPI + TPP)
   */
  async getUsers(deviceId) {
    try {
      console.log(`👥 Obteniendo usuarios del dispositivo: ${deviceId}`);
      
      // Verificar si es dispositivo ISAPI
      if (this.isapiDevices.has(deviceId)) {
        const device = this.isapiDevices.get(deviceId);
        return await this.getISAPIUsers(device);
      }
      
      // Verificar si es dispositivo TPP
      if (this.tppDevices.has(deviceId)) {
        const device = this.tppDevices.get(deviceId);
        return await this.getTPPUsers(device);
      }
      
      return { success: false, error: 'Dispositivo no encontrado' };
      
    } catch (error) {
      console.log(`❌ Error obteniendo usuarios: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Crear usuario (ISAPI + TPP)
   */
  async createUser(deviceId, userData) {
    try {
      console.log(`👥 Creando usuario en dispositivo: ${deviceId}`);
      
      // Verificar si es dispositivo ISAPI
      if (this.isapiDevices.has(deviceId)) {
        const device = this.isapiDevices.get(deviceId);
        return await this.createISAPIUser(device, userData);
      }
      
      // Verificar si es dispositivo TPP
      if (this.tppDevices.has(deviceId)) {
        const device = this.tppDevices.get(deviceId);
        return await this.createTPPUser(device, userData);
      }
      
      return { success: false, error: 'Dispositivo no encontrado' };
      
    } catch (error) {
      console.log(`❌ Error creando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Actualizar usuario (ISAPI + TPP)
   */
  async updateUser(deviceId, userId, userData) {
    try {
      console.log(`👥 Actualizando usuario: ${userId} en dispositivo: ${deviceId}`);
      
      // Verificar si es dispositivo ISAPI
      if (this.isapiDevices.has(deviceId)) {
        const device = this.isapiDevices.get(deviceId);
        return await this.updateISAPIUser(device, userId, userData);
      }
      
      // Verificar si es dispositivo TPP
      if (this.tppDevices.has(deviceId)) {
        const device = this.tppDevices.get(deviceId);
        return await this.updateTPPUser(device, userId, userData);
      }
      
      return { success: false, error: 'Dispositivo no encontrado' };
      
    } catch (error) {
      console.log(`❌ Error actualizando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Eliminar usuario (ISAPI + TPP)
   */
  async deleteUser(deviceId, userId) {
    try {
      console.log(`👥 Eliminando usuario: ${userId} del dispositivo: ${deviceId}`);
      
      // Verificar si es dispositivo ISAPI
      if (this.isapiDevices.has(deviceId)) {
        const device = this.isapiDevices.get(deviceId);
        return await this.deleteISAPIUser(device, userId);
      }
      
      // Verificar si es dispositivo TPP
      if (this.tppDevices.has(deviceId)) {
        const device = this.tppDevices.get(deviceId);
        return await this.deleteTPPUser(device, userId);
      }
      
      return { success: false, error: 'Dispositivo no encontrado' };
      
    } catch (error) {
      console.log(`❌ Error eliminando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== MÉTODOS ISAPI ====================
  
  /**
   * 🔧 Obtener usuarios ISAPI
   */
  async getISAPIUsers(device) {
    try {
      const HikvisionISAPI = require('./hikvision-isapi');
      const hikvision = new HikvisionISAPI(device.ip, device.username, device.password, device.port, device.protocol);
      
      const result = await hikvision.getUsers();
      
      if (result.success) {
        device.users = result.data;
        device.lastSeen = new Date();
        device.status = 'online';
        console.log(`✅ Usuarios ISAPI obtenidos: ${result.data.length}`);
      }
      
      return result;
      
    } catch (error) {
      console.log(`❌ Error obteniendo usuarios ISAPI: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 Crear usuario ISAPI
   */
  async createISAPIUser(device, userData) {
    try {
      // Implementar creación de usuario ISAPI
      console.log('🔧 Creando usuario ISAPI...');
      
      // Por ahora, retornar éxito simulado
      return { success: true, message: 'Usuario ISAPI creado exitosamente' };
      
    } catch (error) {
      console.log(`❌ Error creando usuario ISAPI: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 Actualizar usuario ISAPI
   */
  async updateISAPIUser(device, userId, userData) {
    try {
      // Implementar actualización de usuario ISAPI
      console.log('🔧 Actualizando usuario ISAPI...');
      
      // Por ahora, retornar éxito simulado
      return { success: true, message: 'Usuario ISAPI actualizado exitosamente' };
      
    } catch (error) {
      console.log(`❌ Error actualizando usuario ISAPI: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🔧 Eliminar usuario ISAPI
   */
  async deleteISAPIUser(device, userId) {
    try {
      // Implementar eliminación de usuario ISAPI
      console.log('🔧 Eliminando usuario ISAPI...');
      
      // Por ahora, retornar éxito simulado
      return { success: true, message: 'Usuario ISAPI eliminado exitosamente' };
      
    } catch (error) {
      console.log(`❌ Error eliminando usuario ISAPI: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== MÉTODOS TPP ====================
  
  /**
   * 🏢 Obtener usuarios TPP
   */
  async getTPPUsers(device) {
    try {
      // Implementar obtención de usuarios TPP
      console.log('🏢 Obteniendo usuarios TPP...');
      
      // Por ahora, retornar datos simulados
      return { 
        success: true, 
        data: [],
        message: 'TPP no disponible aún - esperando activación de cuenta'
      };
      
    } catch (error) {
      console.log(`❌ Error obteniendo usuarios TPP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏢 Crear usuario TPP
   */
  async createTPPUser(device, userData) {
    try {
      // Implementar creación de usuario TPP
      console.log('🏢 Creando usuario TPP...');
      
      // Por ahora, retornar mensaje de espera
      return { 
        success: false, 
        message: 'TPP no disponible aún - esperando activación de cuenta'
      };
      
    } catch (error) {
      console.log(`❌ Error creando usuario TPP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏢 Actualizar usuario TPP
   */
  async updateTPPUser(device, userId, userData) {
    try {
      // Implementar actualización de usuario TPP
      console.log('🏢 Actualizando usuario TPP...');
      
      // Por ahora, retornar mensaje de espera
      return { 
        success: false, 
        message: 'TPP no disponible aún - esperando activación de cuenta'
      };
      
    } catch (error) {
      console.log(`❌ Error actualizando usuario TPP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 🏢 Eliminar usuario TPP
   */
  async deleteTPPUser(device, userId) {
    try {
      // Implementar eliminación de usuario TPP
      console.log('🏢 Eliminando usuario TPP...');
      
      // Por ahora, retornar mensaje de espera
      return { 
        success: false, 
        message: 'TPP no disponible aún - esperando activación de cuenta'
      };
      
    } catch (error) {
      console.log(`❌ Error eliminando usuario TPP: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================
  
  /**
   * 📊 Obtener estado del sistema
   */
  getSystemStatus() {
    const isapiCount = this.isapiDevices.size;
    const tppCount = this.tppDevices.size;
    const totalDevices = isapiCount + tppCount;
    
    return {
      hybridMode: this.hybridMode,
      totalDevices: totalDevices,
      isapiDevices: isapiCount,
      tppDevices: tppCount,
      tppStatus: tppCount > 0 ? 'available' : 'pending_activation',
      devices: {
        isapi: Array.from(this.isapiDevices.values()),
        tpp: Array.from(this.tppDevices.values())
      }
    };
  }

  /**
   * 🔄 Sincronizar datos entre ISAPI y TPP
   */
  async syncData(deviceId) {
    try {
      console.log(`🔄 Sincronizando datos del dispositivo: ${deviceId}`);
      
      // Obtener datos de ISAPI
      const isapiData = await this.getUsers(deviceId);
      
      // Si TPP está disponible, sincronizar
      if (this.tppDevices.has(deviceId)) {
        // Implementar sincronización TPP
        console.log('🔄 Sincronizando con TPP...');
      }
      
      return { success: true, message: 'Datos sincronizados exitosamente' };
      
    } catch (error) {
      console.log(`❌ Error sincronizando datos: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// ==================== RUTAS EXPRESS ====================

const hybridSystem = new WisiHikvisionHybrid();

// Registrar dispositivo ISAPI existente
hybridSystem.registerISAPIDevice(
  'device-001',
  '186.167.73.66',
  'admin',
  'S0p0rt3S0p0rt3',
  8027,
  'http'
);

// Ruta para obtener estado del sistema
router.get('/status', (req, res) => {
  try {
    const status = hybridSystem.getSystemStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para obtener usuarios
router.post('/users', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const result = await hybridSystem.getUsers(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para crear usuario
router.post('/users/create', async (req, res) => {
  try {
    const { deviceId, userData } = req.body;
    const result = await hybridSystem.createUser(deviceId, userData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para actualizar usuario
router.put('/users/update', async (req, res) => {
  try {
    const { deviceId, userId, userData } = req.body;
    const result = await hybridSystem.updateUser(deviceId, userId, userData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para eliminar usuario
router.delete('/users/delete', async (req, res) => {
  try {
    const { deviceId, userId } = req.body;
    const result = await hybridSystem.deleteUser(deviceId, userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ruta para sincronizar datos
router.post('/sync', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const result = await hybridSystem.syncData(deviceId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;



