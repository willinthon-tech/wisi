const axios = require('axios');

// Configuración para TPP Hikvision
const TPP_CONFIG = {
  baseUrl: 'https://tpp.hikvision.com/api',
  authUrl: 'https://cloudsso.hikvision.com/login',
  loginUrl: 'https://tpp.hikvision.com/Login/TppLogin',
  partnerId: 'hik_86679035846912',
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3'
};

async function testTPPHikvision() {
  console.log('🔍 Probando TPP (Technology Partner Program) de Hikvision');
  console.log('========================================================\n');
  console.log(`🏢 Partner ID: ${TPP_CONFIG.partnerId}`);
  console.log(`📧 Email: ${TPP_CONFIG.email}`);
  console.log(`🔐 Password: ${TPP_CONFIG.password}\n`);

  try {
    // Paso 1: Obtener token de autenticación
    console.log('🔄 Paso 1: Obteniendo token de autenticación...');
    
    const authResponse = await axios.post(`${TPP_CONFIG.authUrl}`, {
      service: 'https://tpp.hikvision.com/Login/TppLogin',
      username: TPP_CONFIG.email,
      password: TPP_CONFIG.password
    });

    if (authResponse.data.token || authResponse.data.access_token) {
      console.log('✅ Token de autenticación obtenido');
      const token = authResponse.data.token || authResponse.data.access_token;
      
      // Paso 2: Obtener dispositivos desde TPP
      console.log('\n🔄 Paso 2: Obteniendo dispositivos desde TPP...');
      
      try {
        const devicesResponse = await axios.get(`${TPP_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Partner-ID': TPP_CONFIG.partnerId
          }
        });

        console.log('✅ Dispositivos obtenidos exitosamente!');
        console.log(`📊 Total dispositivos: ${devicesResponse.data.data?.length || 0}`);
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          console.log('\n📋 Dispositivos encontrados:');
          devicesResponse.data.data.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.deviceName || device.name || 'Sin nombre'}`);
            console.log(`      ID: ${device.deviceId || device.id}`);
            console.log(`      Serial: ${device.serialNumber || 'N/A'}`);
            console.log(`      Estado: ${device.online ? '🟢 Online' : '🔴 Offline'}`);
            console.log(`      Tipo: ${device.deviceType || 'Desconocido'}`);
            console.log(`      IP: ${device.ipAddress || 'N/A'}`);
            console.log(`      Ubicación: ${device.location || 'N/A'}`);
            console.log('');
          });
        }

        // Generar configuración
        const configContent = `# TPP Hikvision Configuration
TPP_PARTNER_ID=${TPP_CONFIG.partnerId}
TPP_EMAIL=${TPP_CONFIG.email}
TPP_PASSWORD=${TPP_CONFIG.password}
TPP_ACCESS_TOKEN=${token}
TPP_BASE_URL=${TPP_CONFIG.baseUrl}

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wisi_system
DB_USER=postgres
DB_PASSWORD=tu_password_db

# JWT Configuration
JWT_SECRET=tu_jwt_secret_aqui
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development`;

        require('fs').writeFileSync('.env', configContent);
        console.log('✅ Archivo .env creado con configuración TPP');
        
      } catch (devicesError) {
        console.log('⚠️  No se pudieron obtener dispositivos:', devicesError.message);
        console.log('   Pero la autenticación funcionó, así que las credenciales son correctas');
      }

    } else {
      console.log('❌ No se obtuvo token de autenticación');
    }
    
  } catch (error) {
    console.log('❌ Error en autenticación TPP');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Error desconocido'}`);
      console.log(`   Description: ${error.response.data?.error_description || 'Sin descripción'}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    // Intentar con diferentes endpoints de TPP
    console.log('\n🔄 Probando diferentes endpoints de TPP...');
    
    const possibleEndpoints = [
      'https://tpp.hikvision.com/api/v1',
      'https://tpp.hikvision.com/api',
      'https://api.tpp.hikvision.com',
      'https://partner-api.hikvision.com',
      'https://open-api.hikvision.com'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔄 Probando ${endpoint}...`);
        
        const testResponse = await axios.get(`${endpoint}/devices`, {
          headers: {
            'X-Partner-ID': TPP_CONFIG.partnerId,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        console.log(`✅ Endpoint funcional: ${endpoint}`);
        break;
        
      } catch (endpointError) {
        if (endpointError.response) {
          console.log(`❌ ${endpoint} - Status ${endpointError.response.status}`);
        } else {
          console.log(`❌ ${endpoint} - ${endpointError.message}`);
        }
      }
    }
  }
}

// Ejecutar prueba
testTPPHikvision();



