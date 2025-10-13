const axios = require('axios');

// Configuración para Hik-Connect con Serial Number
const HIKCONNECT_CONFIG = {
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3',
  deviceSerial: 'AE6504225',
  possibleAPIs: [
    'https://api.hik-connect.com/api/v1',
    'https://api.hik-connect.com',
    'https://open.hik-connect.com/api',
    'https://api.hikvision.com/hik-connect',
    'https://api.hikvision.com/api/v1',
    'https://open.hikvision.com/api',
    'https://api.hikvision.com/openapi'
  ]
};

async function testHikConnectWithSerial() {
  
  
  
  
  

  // Función para probar autenticación
  async function testAuthentication(apiUrl) {
    try {
      
      
      // Intentar diferentes métodos de autenticación
      const authMethods = [
        {
          name: 'OAuth2 Client Credentials',
          data: {
            grant_type: 'client_credentials',
            client_id: HIKCONNECT_CONFIG.email,
            client_secret: HIKCONNECT_CONFIG.password,
            scope: 'device:read user:read event:read photo:read'
          }
        },
        {
          name: 'OAuth2 Password',
          data: {
            grant_type: 'password',
            username: HIKCONNECT_CONFIG.email,
            password: HIKCONNECT_CONFIG.password,
            scope: 'device:read user:read event:read photo:read'
          }
        },
        {
          name: 'Basic Auth',
          data: {
            username: HIKCONNECT_CONFIG.email,
            password: HIKCONNECT_CONFIG.password
          }
        }
      ];

      for (const method of authMethods) {
        try {
          
          
          let authResponse;
          if (method.name === 'Basic Auth') {
            authResponse = await axios.get(`${apiUrl}/devices`, {
              auth: {
                username: method.data.username,
                password: method.data.password
              },
              timeout: 10000
            });
          } else {
            authResponse = await axios.post(`${apiUrl}/oauth/token`, method.data, {
              timeout: 10000
            });
          }

          if (authResponse.data.access_token || authResponse.data.token || authResponse.data) {
            
            
            const token = authResponse.data.access_token || authResponse.data.token;
            
            if (token) {
              
              
              // Probar obtener dispositivos
              await testGetDevices(apiUrl, token);
              return true;
            } else {
              
              // Probar obtener dispositivos directamente
              await testGetDevices(apiUrl);
              return true;
            }
          }
          
        } catch (methodError) {
          if (methodError.response) {
            
          } else {
            
          }
        }
      }
      
    } catch (error) {
      if (error.response) {
        
      } else {
        
      }
    }
    
    return false;
  }

  // Función para probar obtener dispositivos
  async function testGetDevices(apiUrl, token = null) {
    try {
      
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const devicesResponse = await axios.get(`${apiUrl}/devices`, {
        headers: headers,
        timeout: 10000
      });

      
      
      
      const devices = devicesResponse.data.data || devicesResponse.data;
      
      if (devices && devices.length > 0) {
        
        devices.forEach((device, index) => {
          
          
          
          
          
          
          
          
          // Verificar si es nuestro dispositivo
          if (device.serialNumber === HIKCONNECT_CONFIG.deviceSerial || 
              device.deviceSerial === HIKCONNECT_CONFIG.deviceSerial) {
            
            
            // Probar obtener usuarios de este dispositivo
            testGetDeviceUsers(apiUrl, device.deviceId || device.id, token);
          }
        });
      }

      return true;
      
    } catch (error) {
      
      return false;
    }
  }

  // Función para probar obtener usuarios del dispositivo
  async function testGetDeviceUsers(apiUrl, deviceId, token = null) {
    try {
      
      
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const usersResponse = await axios.get(`${apiUrl}/devices/${deviceId}/users`, {
        headers: headers,
        timeout: 10000
      });

      
      
      
      const users = usersResponse.data.data || usersResponse.data;
      
      if (users && users.length > 0) {
        
        users.slice(0, 5).forEach((user, index) => {
          
          
          
          
          
        });
        
        if (users.length > 5) {
          
        }
      }

      return true;
      
    } catch (error) {
      
      return false;
    }
  }

  // Probar todas las APIs posibles
  let success = false;
  
  for (const apiUrl of HIKCONNECT_CONFIG.possibleAPIs) {
    
    
    
    const result = await testAuthentication(apiUrl);
    if (result) {
      success = true;
      break;
    }
    
     // Línea en blanco entre APIs
  }

  if (!success) {
    
    
    
    
    
    
  }
}

// Ejecutar prueba
testHikConnectWithSerial();
