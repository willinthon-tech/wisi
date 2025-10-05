const axios = require('axios');

// Configuración para probar conexión directa
const DEVICE_CONFIG = {
  deviceId: 'hik_86679035846912',
  possibleIPs: [
    '192.168.1.100',  // IP común en redes locales
    '192.168.0.100',
    '192.168.1.101',
    '192.168.0.101',
    '10.0.0.100',
    '172.16.0.100',
    '186.167.73.66',   // IP que ya tienes configurada
    '192.168.1.200',
    '192.168.0.200'
  ],
  ports: [80, 8080, 8000, 443, 8443],
  credentials: {
    username: 'admin',
    password: 'S0p0rt3S0p0rt3'  // Tu clave de cuenta
  }
};

async function testDeviceDirect() {
  console.log('🔍 Probando conexión directa con dispositivo');
  console.log('============================================\n');
  console.log(`📱 Device ID: ${DEVICE_CONFIG.deviceId}`);
  console.log(`👤 Usuario: ${DEVICE_CONFIG.credentials.username}`);
  console.log(`🔐 Clave: ${DEVICE_CONFIG.credentials.password}\n`);

  // Función para probar una IP y puerto
  async function testConnection(ip, port) {
    const protocol = port === 443 || port === 8443 ? 'https' : 'http';
    const baseUrl = `${protocol}://${ip}:${port}`;
    
    console.log(`🔄 Probando ${baseUrl}...`);
    
    try {
      // Probar endpoint básico de información del dispositivo
      const response = await axios.get(`${baseUrl}/ISAPI/System/deviceInfo`, {
        auth: {
          username: DEVICE_CONFIG.credentials.username,
          password: DEVICE_CONFIG.credentials.password
        },
        timeout: 5000
      });

      if (response.data && response.data.includes('deviceName')) {
        console.log('✅ ¡CONEXIÓN EXITOSA!');
        console.log(`🌐 URL: ${baseUrl}`);
        console.log(`📊 Respuesta: ${response.data.substring(0, 200)}...`);
        
        // Probar más endpoints
        await testAdditionalEndpoints(baseUrl);
        
        return { success: true, url: baseUrl, data: response.data };
      }
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`❌ Conexión rechazada`);
      } else if (error.code === 'ETIMEDOUT') {
        console.log(`❌ Timeout`);
      } else if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${error.response.statusText}`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
    
    return { success: false };
  }

  // Función para probar endpoints adicionales
  async function testAdditionalEndpoints(baseUrl) {
    console.log('\n🔍 Probando endpoints adicionales...');
    
    const endpoints = [
      '/ISAPI/System/capabilities',
      '/ISAPI/AccessControl/UserInfo/capabilities',
      '/ISAPI/AccessControl/UserInfo/Search?format=json',
      '/ISAPI/System/time',
      '/ISAPI/System/status'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${baseUrl}${endpoint}`, {
          auth: {
            username: DEVICE_CONFIG.credentials.username,
            password: DEVICE_CONFIG.credentials.password
          },
          timeout: 3000
        });

        console.log(`✅ ${endpoint} - OK (${response.status})`);
        
        // Si es el endpoint de usuarios, mostrar información
        if (endpoint.includes('UserInfo/Search')) {
          console.log(`   📊 Datos de usuarios disponibles`);
        }
        
      } catch (error) {
        if (error.response) {
          console.log(`❌ ${endpoint} - Error ${error.response.status}`);
        } else {
          console.log(`❌ ${endpoint} - ${error.message}`);
        }
      }
    }
  }

  // Probar todas las combinaciones de IP y puerto
  let foundDevice = false;
  
  for (const ip of DEVICE_CONFIG.possibleIPs) {
    for (const port of DEVICE_CONFIG.ports) {
      const result = await testConnection(ip, port);
      if (result.success) {
        foundDevice = true;
        
        // Generar configuración para el sistema
        const configContent = `# Configuración del dispositivo encontrado
DEVICE_ID=${DEVICE_CONFIG.deviceId}
DEVICE_IP=${ip}
DEVICE_PORT=${port}
DEVICE_URL=${result.url}
DEVICE_USERNAME=${DEVICE_CONFIG.credentials.username}
DEVICE_PASSWORD=${DEVICE_CONFIG.credentials.password}

# Configuración del servidor
PORT=3000
NODE_ENV=development`;

        require('fs').writeFileSync('device-config.env', configContent);
        console.log('\n✅ Archivo device-config.env creado');
        
        break;
      }
    }
    
    if (foundDevice) break;
  }

  if (!foundDevice) {
    console.log('\n❌ No se encontró el dispositivo en ninguna IP');
    console.log('\n💡 Sugerencias:');
    console.log('   1. Verifica que el dispositivo esté conectado a la red');
    console.log('   2. Confirma la IP del dispositivo en Hik-Connect');
    console.log('   3. Verifica que el puerto esté abierto');
    console.log('   4. Asegúrate de que las credenciales sean correctas');
    console.log('\n🔧 Alternativas:');
    console.log('   - Usar la IP que ya tienes configurada: 186.167.73.66');
    console.log('   - Verificar en Hik-Connect la IP real del dispositivo');
    console.log('   - Probar con diferentes puertos (80, 8080, 443)');
  }
}

// Ejecutar prueba
testDeviceDirect();



