const axios = require('axios');

// Configuración para HIK Partner API
const HIK_PARTNER_CONFIG = {
  baseUrl: 'https://api.hik-partner.com/api/v1',
  authUrl: 'https://api.hik-partner.com/oauth/token',
  partnerId: 'hik_86679035846912',
  email: 'hikcasinoval@gmail.com',
  password: 'S0p0rt3S0p0rt3'
};

async function testHikPartner() {
  console.log('🔍 Probando HIK Partner API');
  console.log('============================\n');
  console.log(`🏢 Partner ID: ${HIK_PARTNER_CONFIG.partnerId}`);
  console.log(`📧 Email: ${HIK_PARTNER_CONFIG.email}`);
  console.log(`🔐 Password: ${HIK_PARTNER_CONFIG.password}\n`);

  try {
    // Intentar autenticación con HIK Partner
    console.log('🔄 Intentando autenticación con HIK Partner...');
    
    const authResponse = await axios.post(`${HIK_PARTNER_CONFIG.authUrl}`, {
      grant_type: 'password',
      client_id: HIK_PARTNER_CONFIG.partnerId,
      username: HIK_PARTNER_CONFIG.email,
      password: HIK_PARTNER_CONFIG.password,
      scope: 'device:read user:read event:read photo:read'
    });

    if (authResponse.data.access_token) {
      console.log('✅ ¡AUTENTICACIÓN HIK PARTNER EXITOSA!');
      console.log(`🎉 Access Token: ${authResponse.data.access_token.substring(0, 30)}...`);
      console.log(`📊 Scope: ${authResponse.data.scope || 'N/A'}`);
      console.log(`⏰ Expires in: ${authResponse.data.expires_in || 'N/A'} segundos`);
      
      const accessToken = authResponse.data.access_token;
      
      // Probar obtener dispositivos
      console.log('\n📱 Obteniendo dispositivos desde HIK Partner...');
      
      try {
        const devicesResponse = await axios.get(`${HIK_PARTNER_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Dispositivos obtenidos exitosamente!');
        console.log(`📊 Total dispositivos: ${devicesResponse.data.data?.length || 0}`);
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          console.log('\n📋 Dispositivos encontrados:');
          devicesResponse.data.data.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.deviceName || device.name || 'Sin nombre'}`);
            console.log(`      ID: ${device.deviceId || device.id}`);
            console.log(`      Estado: ${device.online ? '🟢 Online' : '🔴 Offline'}`);
            console.log(`      Tipo: ${device.deviceType || 'Desconocido'}`);
            console.log(`      IP: ${device.ipAddress || 'N/A'}`);
            console.log(`      Serial: ${device.serialNumber || 'N/A'}`);
            console.log('');
          });
        }

        // Generar configuración
        const configContent = `# HIK Partner API Configuration
HIK_PARTNER_ID=${HIK_PARTNER_CONFIG.partnerId}
HIK_PARTNER_EMAIL=${HIK_PARTNER_CONFIG.email}
HIK_PARTNER_PASSWORD=${HIK_PARTNER_CONFIG.password}
HIK_PARTNER_ACCESS_TOKEN=${accessToken}

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
        console.log('✅ Archivo .env creado con configuración HIK Partner');
        
      } catch (devicesError) {
        console.log('⚠️  No se pudieron obtener dispositivos:', devicesError.message);
        console.log('   Pero la autenticación funcionó, así que las credenciales son correctas');
      }

    } else {
      console.log('❌ No se obtuvo access token');
    }
    
  } catch (error) {
    console.log('❌ Error en autenticación HIK Partner');
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Error: ${error.response.data?.error || 'Error desconocido'}`);
      console.log(`   Description: ${error.response.data?.error_description || 'Sin descripción'}`);
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    // Intentar con diferentes endpoints de HIK Partner
    console.log('\n🔄 Probando diferentes endpoints de HIK Partner...');
    
    const possibleEndpoints = [
      'https://api.hik-partner.com',
      'https://partner.hikvision.com/api',
      'https://open.hikvision.com/api',
      'https://api.hikvision.com/partner',
      'https://developer.hikvision.com/api'
    ];
    
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`🔄 Probando ${endpoint}...`);
        
        const testResponse = await axios.get(`${endpoint}/devices`, {
          headers: {
            'Authorization': `Bearer ${HIK_PARTNER_CONFIG.partnerId}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        console.log(`✅ Endpoint funcional: ${endpoint}`);
        break;
        
      } catch (endpointError) {
        console.log(`❌ ${endpoint} - ${endpointError.message}`);
      }
    }
  }
}

// Ejecutar prueba
testHikPartner();



