const axios = require('axios');

// Configuración de Hik-Connect
const HIK_CONNECT_CONFIG = {
  baseUrl: 'https://api.hik-connect.com/api/v1',
  tokenUrl: 'https://api.hik-connect.com/oauth/token'
};

async function testHikConnectCredentials() {
  console.log('🔍 Probando credenciales de Hik-Connect...');
  console.log('==========================================\n');

  const clientId = 'hik_86679035846912';
  
  // Intentar diferentes combinaciones de credenciales
  const possibleSecrets = [
    'S0p0rt3S0p0rt3',  // Tu clave de cuenta
    'hik_86679035846912',  // Mismo que el ID
    '86679035846912',  // Solo números
    'hikcasinoval',  // Tu email sin @gmail.com
    'casinoval',  // Parte del email
    'hikconnect',  // Nombre del servicio
    'default',  // Valor por defecto
    ''  // Vacío
  ];

  for (const clientSecret of possibleSecrets) {
    console.log(`🔄 Probando Client ID: ${clientId}`);
    console.log(`🔐 Probando Client Secret: ${clientSecret || '(vacío)'}`);
    
    try {
      const response = await axios.post(`${HIK_CONNECT_CONFIG.tokenUrl}`, {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'device:read user:read event:read photo:read'
      });

      if (response.data.access_token) {
        console.log('✅ ¡AUTENTICACIÓN EXITOSA!');
        console.log(`🎉 Access Token obtenido: ${response.data.access_token.substring(0, 20)}...`);
        console.log(`📊 Scope: ${response.data.scope || 'N/A'}`);
        console.log(`⏰ Expires in: ${response.data.expires_in || 'N/A'} segundos`);
        
        // Probar obtener dispositivos
        console.log('\n📱 Probando obtener dispositivos...');
        try {
          const devicesResponse = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices`, {
            headers: {
              'Authorization': `Bearer ${response.data.access_token}`,
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
              console.log('');
            });
          }

          // Generar archivo de configuración
          const configContent = `# Hik-Connect API Configuration
HIK_CONNECT_CLIENT_ID=${clientId}
HIK_CONNECT_CLIENT_SECRET=${clientSecret}
HIK_CONNECT_REDIRECT_URI=http://localhost:3000/auth/hik-connect/callback

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
          console.log('✅ Archivo .env creado con la configuración exitosa');
          
        } catch (devicesError) {
          console.log('⚠️  No se pudieron obtener dispositivos:', devicesError.message);
          console.log('   Pero la autenticación funcionó, así que las credenciales son correctas');
        }

        return; // Salir del bucle si encontramos credenciales válidas
        
      } else {
        console.log('❌ No se obtuvo access token');
      }
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ Error ${error.response.status}: ${error.response.data?.error_description || error.response.data?.error || 'Error desconocido'}`);
      } else {
        console.log(`❌ Error de conexión: ${error.message}`);
      }
    }
    
    console.log(''); // Línea en blanco entre intentos
  }

  console.log('❌ No se encontraron credenciales válidas');
  console.log('\n💡 Sugerencias:');
  console.log('   1. Verifica que el Client ID sea correcto');
  console.log('   2. Busca el Client Secret en tu cuenta Hik-Connect');
  console.log('   3. Asegúrate de que la API esté habilitada en tu cuenta');
}

// Ejecutar prueba
testHikConnectCredentials();



