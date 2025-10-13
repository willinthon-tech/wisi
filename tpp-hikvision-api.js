const axios = require('axios');

class TPPHikvisionAPI {
  constructor() {
    this.baseURL = process.env.TPP_BASE_URL || 'https://open.hikvision.com';
    this.apiVersion = process.env.TPP_API_VERSION || 'v1';
    this.clientId = process.env.TPP_CLIENT_ID;
    this.clientSecret = process.env.TPP_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Autenticación OAuth 2.0 con TPP
  async authenticate() {
    try {
      
      
      const response = await axios.post(`${this.baseURL}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
        
        return { success: true, token: this.accessToken };
      } else {
        
        return { success: false, error: 'No se pudo obtener token de acceso' };
      }
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Verificar si el token está válido
  isTokenValid() {
    return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
  }

  // Obtener token válido (renovar si es necesario)
  async getValidToken() {
    if (!this.isTokenValid()) {
      
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error('No se pudo autenticar con TPP');
      }
    }
    return this.accessToken;
  }

  // Hacer petición autenticada a TPP
  async makeAuthenticatedRequest(endpoint, method = 'GET', data = null) {
    try {
      const token = await this.getValidToken();
      
      const config = {
        method,
        url: `${this.baseURL}/${this.apiVersion}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Obtener dispositivos del usuario
  async getDevices() {
    try {
      
      const result = await this.makeAuthenticatedRequest('/devices');
      
      if (result.success) {
        
        return {
          success: true,
          data: {
            message: 'Dispositivos obtenidos desde TPP',
            devices: result.data.devices || [],
            total: result.data.devices?.length || 0
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Obtener usuarios de un dispositivo específico
  async getDeviceUsers(deviceId) {
    try {
      
      const result = await this.makeAuthenticatedRequest(`/devices/${deviceId}/users`);
      
      if (result.success) {
        
        return {
          success: true,
          data: {
            message: 'Usuarios obtenidos desde TPP',
            deviceId: deviceId,
            users: result.data.users || [],
            total: result.data.users?.length || 0
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Obtener eventos de un dispositivo
  async getDeviceEvents(deviceId, startTime = null, endTime = null) {
    try {
      
      
      let endpoint = `/devices/${deviceId}/events`;
      if (startTime && endTime) {
        endpoint += `?startTime=${startTime}&endTime=${endTime}`;
      }
      
      const result = await this.makeAuthenticatedRequest(endpoint);
      
      if (result.success) {
        
        return {
          success: true,
          data: {
            message: 'Eventos obtenidos desde TPP',
            deviceId: deviceId,
            events: result.data.events || [],
            total: result.data.events?.length || 0
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Obtener foto de usuario desde TPP
  async getUserPhoto(deviceId, userId) {
    try {
      
      const result = await this.makeAuthenticatedRequest(`/devices/${deviceId}/users/${userId}/photo`);
      
      if (result.success) {
        
        return {
          success: true,
          data: {
            message: 'Foto obtenida desde TPP',
            deviceId: deviceId,
            userId: userId,
            photoUrl: result.data.photoUrl,
            photoData: result.data.photoData
          }
        };
      } else {
        return result;
      }
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }

  // Sincronizar datos entre TPP e ISAPI
  async syncWithISAPI(deviceId, isapiClient) {
    try {
      
      
      // Obtener datos desde TPP
      const tppUsers = await this.getDeviceUsers(deviceId);
      const tppEvents = await this.getDeviceEvents(deviceId);
      
      // Obtener datos desde ISAPI
      const isapiUsers = await isapiClient.getUsers();
      const isapiEvents = await isapiClient.getEvents();
      
      return {
        success: true,
        data: {
          message: 'Sincronización completada',
          tpp: {
            users: tppUsers.success ? tppUsers.data.users : [],
            events: tppEvents.success ? tppEvents.data.events : []
          },
          isapi: {
            users: isapiUsers.success ? isapiUsers.data.users : [],
            events: isapiEvents.success ? isapiEvents.data.events : []
          }
        }
      };
    } catch (error) {
      
      return { success: false, error: error.message };
    }
  }
}

module.exports = TPPHikvisionAPI;



