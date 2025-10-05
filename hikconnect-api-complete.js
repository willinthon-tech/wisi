const axios = require('axios');
const crypto = require('crypto');

/**
 * 🏢 HIK-CONNECT API COMPLETA
 * Sistema completo para gestión de dispositivos Hik-Connect
 * Soporta CRUD completo y múltiples métodos de autenticación
 */

class HikConnectAPI {
  constructor(email, password, baseUrl = 'https://isa.hik-connect.com') {
    this.email = email;
    this.password = password;
    this.baseUrl = baseUrl;
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionId = null;
  }

  // ==================== AUTENTICACIÓN ====================
  
  /**
   * 🔐 Autenticación OAuth 2.0
   */
  async authenticateOAuth2() {
    try {
      console.log('🔄 Autenticando con OAuth 2.0...');
      
      const response = await axios.post(`${this.baseUrl}/oauth/token`, {
        grant_type: 'password',
        username: this.email,
        password: this.password,
        scope: 'device:read device:write user:read user:write event:read event:write photo:read photo:write'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.refreshToken = response.data.refresh_token;
        console.log('✅ OAuth 2.0 autenticación exitosa');
        return { success: true, token: this.accessToken };
      }
      
    } catch (error) {
      console.log(`❌ Error OAuth 2.0: ${error.message}`);
    }
    
    return { success: false, error: 'OAuth 2.0 authentication failed' };
  }

  /**
   * 🔐 Autenticación Digest
   */
  async authenticateDigest() {
    try {
      console.log('🔄 Autenticando con Digest...');
      
      const testUrl = `${this.baseUrl}/v3/open/trust/v1/group/device`;
      
      // Primera petición para obtener challenge
      const firstResponse = await axios.get(testUrl, {
        timeout: 10000,
        validateStatus: (status) => status === 401
      });
      
    } catch (error) {
      if (error.response && error.response.status === 401) {
        const wwwAuthenticate = error.response.headers['www-authenticate'];
        
        if (wwwAuthenticate && wwwAuthenticate.includes('Digest')) {
          const challenge = this.parseDigestChallenge(wwwAuthenticate);
          const digestResponse = this.generateDigestResponse(challenge, testUrl, 'GET');
          
          // Segunda petición con digest
          const secondResponse = await axios.get(testUrl, {
            headers: {
              'Authorization': `Digest ${digestResponse}`
            },
            timeout: 10000
          });
          
          console.log('✅ Digest autenticación exitosa');
          return { success: true, data: secondResponse.data };
        }
      }
    }
    
    return { success: false, error: 'Digest authentication failed' };
  }

  /**
   * 🔐 Autenticación Básica
   */
  async authenticateBasic() {
    try {
      console.log('🔄 Autenticando con Basic Auth...');
      
      const response = await axios.get(`${this.baseUrl}/v3/open/trust/v1/group/device`, {
        auth: {
          username: this.email,
          password: this.password
        },
        timeout: 10000
      });
      
      console.log('✅ Basic Auth exitosa');
      return { success: true, data: response.data };
      
    } catch (error) {
      console.log(`❌ Error Basic Auth: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== GESTIÓN DE DISPOSITIVOS ====================
  
  /**
   * 📱 Obtener todos los dispositivos
   */
  async getDevices() {
    try {
      console.log('📱 Obteniendo dispositivos...');
      
      const response = await this.makeRequest('/v3/open/trust/v1/group/device');
      
      if (response.success) {
        console.log(`✅ Dispositivos obtenidos: ${response.data?.data?.length || 0}`);
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error obteniendo dispositivos: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📱 Obtener dispositivo por serial
   */
  async getDeviceBySerial(serial) {
    try {
      console.log(`📱 Obteniendo dispositivo por serial: ${serial}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device?serial=${serial}`);
      
      if (response.success) {
        console.log(`✅ Dispositivo encontrado: ${serial}`);
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error obteniendo dispositivo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📱 Crear dispositivo
   */
  async createDevice(deviceData) {
    try {
      console.log('📱 Creando dispositivo...');
      
      const response = await this.makeRequest('/v3/open/trust/v1/group/device', 'POST', deviceData);
      
      if (response.success) {
        console.log('✅ Dispositivo creado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error creando dispositivo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📱 Actualizar dispositivo
   */
  async updateDevice(deviceId, deviceData) {
    try {
      console.log(`📱 Actualizando dispositivo: ${deviceId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}`, 'PUT', deviceData);
      
      if (response.success) {
        console.log('✅ Dispositivo actualizado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error actualizando dispositivo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📱 Eliminar dispositivo
   */
  async deleteDevice(deviceId) {
    try {
      console.log(`📱 Eliminando dispositivo: ${deviceId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}`, 'DELETE');
      
      if (response.success) {
        console.log('✅ Dispositivo eliminado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error eliminando dispositivo: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== GESTIÓN DE USUARIOS ====================
  
  /**
   * 👥 Obtener usuarios del dispositivo
   */
  async getDeviceUsers(deviceId) {
    try {
      console.log(`👥 Obteniendo usuarios del dispositivo: ${deviceId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users`);
      
      if (response.success) {
        console.log(`✅ Usuarios obtenidos: ${response.data?.data?.length || 0}`);
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error obteniendo usuarios: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Crear usuario
   */
  async createUser(deviceId, userData) {
    try {
      console.log(`👥 Creando usuario en dispositivo: ${deviceId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users`, 'POST', userData);
      
      if (response.success) {
        console.log('✅ Usuario creado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error creando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Actualizar usuario
   */
  async updateUser(deviceId, userId, userData) {
    try {
      console.log(`👥 Actualizando usuario: ${userId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users/${userId}`, 'PUT', userData);
      
      if (response.success) {
        console.log('✅ Usuario actualizado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error actualizando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 👥 Eliminar usuario
   */
  async deleteUser(deviceId, userId) {
    try {
      console.log(`👥 Eliminando usuario: ${userId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users/${userId}`, 'DELETE');
      
      if (response.success) {
        console.log('✅ Usuario eliminado exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error eliminando usuario: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== GESTIÓN DE EVENTOS ====================
  
  /**
   * 📊 Obtener eventos del dispositivo
   */
  async getDeviceEvents(deviceId, startTime, endTime) {
    try {
      console.log(`📊 Obteniendo eventos del dispositivo: ${deviceId}`);
      
      const params = new URLSearchParams({
        startTime: startTime,
        endTime: endTime
      });
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/events?${params}`);
      
      if (response.success) {
        console.log(`✅ Eventos obtenidos: ${response.data?.data?.length || 0}`);
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error obteniendo eventos: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== GESTIÓN DE FOTOS ====================
  
  /**
   * 📸 Obtener fotos del usuario
   */
  async getUserPhotos(deviceId, userId) {
    try {
      console.log(`📸 Obteniendo fotos del usuario: ${userId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users/${userId}/photos`);
      
      if (response.success) {
        console.log(`✅ Fotos obtenidas: ${response.data?.data?.length || 0}`);
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error obteniendo fotos: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * 📸 Subir foto del usuario
   */
  async uploadUserPhoto(deviceId, userId, photoData) {
    try {
      console.log(`📸 Subiendo foto del usuario: ${userId}`);
      
      const response = await this.makeRequest(`/v3/open/trust/v1/group/device/${deviceId}/users/${userId}/photos`, 'POST', photoData);
      
      if (response.success) {
        console.log('✅ Foto subida exitosamente');
        return response;
      }
      
    } catch (error) {
      console.log(`❌ Error subiendo foto: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // ==================== MÉTODOS AUXILIARES ====================
  
  /**
   * 🔧 Realizar petición HTTP
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const config = {
        method: method,
        url: url,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };

      // Agregar autenticación
      if (this.accessToken) {
        config.headers['Authorization'] = `Bearer ${this.accessToken}`;
      } else {
        config.auth = {
          username: this.email,
          password: this.password
        };
      }

      // Agregar datos si es POST/PUT
      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
      
    } catch (error) {
      if (error.response) {
        return { 
          success: false, 
          error: error.response.data?.message || error.message,
          status: error.response.status
        };
      } else {
        return { success: false, error: error.message };
      }
    }
  }

  /**
   * 🔧 Parsear challenge digest
   */
  parseDigestChallenge(wwwAuthenticate) {
    const challenge = {};
    const regex = /(\w+)="([^"]*)"/g;
    let match;
    
    while ((match = regex.exec(wwwAuthenticate)) !== null) {
      challenge[match[1]] = match[2];
    }
    
    return challenge;
  }

  /**
   * 🔧 Generar respuesta digest
   */
  generateDigestResponse(challenge, uri, method) {
    const realm = challenge.realm || '';
    const nonce = challenge.nonce || '';
    const qop = challenge.qop || '';
    
    const cnonce = crypto.randomBytes(16).toString('hex');
    const ha1 = crypto.createHash('md5').update(`${this.email}:${realm}:${this.password}`).digest('hex');
    const ha2 = crypto.createHash('md5').update(`${method}:${uri}`).digest('hex');
    
    let response;
    if (qop === 'auth') {
      response = crypto.createHash('md5').update(`${ha1}:${nonce}:00000001:${cnonce}:${qop}:${ha2}`).digest('hex');
    } else {
      response = crypto.createHash('md5').update(`${ha1}:${nonce}:${ha2}`).digest('hex');
    }
    
    let digestResponse = `username="${this.email}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}"`;
    
    if (qop) {
      digestResponse += `, qop=${qop}, nc=00000001, cnonce="${cnonce}"`;
    }
    
    if (challenge.opaque) {
      digestResponse += `, opaque="${challenge.opaque}"`;
    }
    
    return digestResponse;
  }
}

// ==================== FUNCIÓN DE PRUEBA ====================

async function testHikConnectAPI() {
  console.log('🔍 Probando Hik-Connect API Completa');
  console.log('====================================\n');
  
  const api = new HikConnectAPI('hikcasinoval@gmail.com', 'S0p0rt3S0p0rt3');
  
  // Probar autenticación
  console.log('🔄 Probando autenticación...');
  const authResult = await api.authenticateBasic();
  
  if (authResult.success) {
    console.log('✅ Autenticación exitosa');
    
    // Probar obtener dispositivos
    console.log('\n📱 Probando obtener dispositivos...');
    const devicesResult = await api.getDevices();
    
    if (devicesResult.success) {
      console.log('✅ Dispositivos obtenidos exitosamente');
      console.log('📊 Datos:', JSON.stringify(devicesResult.data, null, 2));
    } else {
      console.log(`❌ Error obteniendo dispositivos: ${devicesResult.error}`);
    }
    
  } else {
    console.log(`❌ Error de autenticación: ${authResult.error}`);
  }
}

// Ejecutar prueba
testHikConnectAPI();

module.exports = HikConnectAPI;



