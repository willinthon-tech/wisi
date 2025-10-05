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
  console.log('🔍 Probando Hik-Connect con Device Serial Number');
  console.log('================================================\n');
  console.log(`📧 Email: ${HIKCONNECT_CONFIG.email}`);
  console.log(`🔐 Password: ${HIKCONNECT_CONFIG.password}`);
  console.log(`📱 Device Serial: ${HIKCONNECT_CONFIG.deviceSerial}\n`);

  // Función para probar autenticación
  async function testAuthentication(apiUrl) {
    try {
      console.log(`🔄 Probando autenticación en: ${apiUrl}`);
      
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
          console.log(`   🔄 Probando ${method.name}...`);
          
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
            console.log(`✅ ¡AUTENTICACIÓN EXITOSA con ${method.name}!`);
            
            const token = authResponse.data.access_token || authResponse.data.token;
            
            if (token) {
              console.log(`🎉 Token obtenido: ${token.substring(0, 30)}...`);
              
              // Probar obtener dispositivos
              await testGetDevices(apiUrl, token);
              return true;
            } else {
              console.log(`✅ Autenticación exitosa, pero sin token`);
              // Probar obtener dispositivos directamente
              await testGetDevices(apiUrl);
              return true;
            }
          }
          
        } catch (methodError) {
          if (methodError.response) {
            console.log(`   ❌ ${method.name} - Status ${methodError.response.status}: ${methodError.response.data?.error || 'Error desconocido'}`);
          } else {
            console.log(`   ❌ ${method.name} - ${methodError.message}`);
          }
        }
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${error.response.data?.error || 'Error desconocido'}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    return false;
  }

  // Función para probar obtener dispositivos
  async function testGetDevices(apiUrl, token = null) {
    try {
      console.log(`\n📱 Obteniendo dispositivos desde: ${apiUrl}`);
      
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

      console.log('✅ Dispositivos obtenidos exitosamente!');
      console.log(`📊 Total dispositivos: ${devicesResponse.data.data?.length || devicesResponse.data.length || 0}`);
      
      const devices = devicesResponse.data.data || devicesResponse.data;
      
      if (devices && devices.length > 0) {
        console.log('\n📋 Dispositivos encontrados:');
        devices.forEach((device, index) => {
          console.log(`   ${index + 1}. ${device.deviceName || device.name || 'Sin nombre'}`);
          console.log(`      Serial: ${device.serialNumber || device.deviceSerial || 'N/A'}`);
          console.log(`      ID: ${device.deviceId || device.id || 'N/A'}`);
          console.log(`      Estado: ${device.online ? '🟢 Online' : '🔴 Offline'}`);
          console.log(`      Tipo: ${device.deviceType || 'Desconocido'}`);
          console.log(`      IP: ${device.ipAddress || 'N/A'}`);
          console.log('');
          
          // Verificar si es nuestro dispositivo
          if (device.serialNumber === HIKCONNECT_CONFIG.deviceSerial || 
              device.deviceSerial === HIKCONNECT_CONFIG.deviceSerial) {
            console.log(`🎯 ¡ENCONTRADO! Este es tu dispositivo ${HIKCONNECT_CONFIG.deviceSerial}`);
            
            // Probar obtener usuarios de este dispositivo
            testGetDeviceUsers(apiUrl, device.deviceId || device.id, token);
          }
        });
      }

      return true;
      
    } catch (error) {
      console.log(`❌ Error obteniendo dispositivos: ${error.message}`);
      return false;
    }
  }

  // Función para probar obtener usuarios del dispositivo
  async function testGetDeviceUsers(apiUrl, deviceId, token = null) {
    try {
      console.log(`\n👥 Obteniendo usuarios del dispositivo ${deviceId}...`);
      
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

      console.log('✅ Usuarios obtenidos exitosamente!');
      console.log(`📊 Total usuarios: ${usersResponse.data.data?.length || usersResponse.data.length || 0}`);
      
      const users = usersResponse.data.data || usersResponse.data;
      
      if (users && users.length > 0) {
        console.log('\n👤 Usuarios encontrados:');
        users.slice(0, 5).forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.name || user.userName || 'Sin nombre'}`);
          console.log(`      ID: ${user.id || user.userId || 'N/A'}`);
          console.log(`      Estado: ${user.status || user.active ? '🟢 Activo' : '🔴 Inactivo'}`);
          console.log(`      Tipo: ${user.userType || 'Usuario'}`);
          console.log('');
        });
        
        if (users.length > 5) {
          console.log(`   ... y ${users.length - 5} usuarios más`);
        }
      }

      return true;
      
    } catch (error) {
      console.log(`❌ Error obteniendo usuarios: ${error.message}`);
      return false;
    }
  }

  // Probar todas las APIs posibles
  let success = false;
  
  for (const apiUrl of HIKCONNECT_CONFIG.possibleAPIs) {
    console.log(`\n🌐 Probando API: ${apiUrl}`);
    console.log('='.repeat(50));
    
    const result = await testAuthentication(apiUrl);
    if (result) {
      success = true;
      break;
    }
    
    console.log(''); // Línea en blanco entre APIs
  }

  if (!success) {
    console.log('\n❌ No se encontró una API funcional');
    console.log('\n💡 Sugerencias:');
    console.log('   1. Verifica que el dispositivo esté registrado en Hik-Connect');
    console.log('   2. Confirma que las credenciales sean correctas');
    console.log('   3. Asegúrate de que el dispositivo esté online');
    console.log('   4. Verifica que la API esté habilitada en tu cuenta');
  }
}

// Ejecutar prueba
testHikConnectWithSerial();
