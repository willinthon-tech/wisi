const axios = require('axios');
const readline = require('readline');

// Configuración de Hik-Connect
const HIK_CONNECT_CONFIG = {
  baseUrl: 'https://api.hik-connect.com/api/v1',
  authUrl: 'https://api.hik-connect.com/oauth/authorize',
  tokenUrl: 'https://api.hik-connect.com/oauth/token'
};

// Interfaz para entrada de usuario
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Función para hacer preguntas
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Función principal de configuración
async function setupHikConnect() {
  console.log('🔧 Configuración de Hik-Connect API');
  console.log('=====================================\n');

  try {
    // Solicitar credenciales de API
    console.log('📋 Necesitamos las credenciales de tu API de Hik-Connect:');
    console.log('   1. Ve a https://www.hik-connect.com/');
    console.log('   2. Inicia sesión con: hikcasinoval@gmail.com');
    console.log('   3. Busca la sección "Developer" o "API"');
    console.log('   4. Obtén tu Client ID y Client Secret\n');

    const clientId = await askQuestion('🔑 Client ID: ');
    const clientSecret = await askQuestion('🔐 Client Secret: ');

    if (!clientId || !clientSecret) {
      console.log('❌ Error: Client ID y Client Secret son requeridos');
      rl.close();
      return;
    }

    console.log('\n🔄 Probando autenticación con Hik-Connect...');

    // Probar autenticación
    const authResponse = await axios.post(`${HIK_CONNECT_CONFIG.tokenUrl}`, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'device:read user:read event:read photo:read'
    });

    if (authResponse.data.access_token) {
      console.log('✅ Autenticación exitosa!');
      
      const accessToken = authResponse.data.access_token;
      
      // Obtener dispositivos
      console.log('\n📱 Obteniendo dispositivos registrados...');
      
      try {
        const devicesResponse = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ Dispositivos obtenidos exitosamente!');
        console.log(`📊 Total de dispositivos: ${devicesResponse.data.data?.length || 0}`);
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          console.log('\n📋 Dispositivos encontrados:');
          devicesResponse.data.data.forEach((device, index) => {
            console.log(`   ${index + 1}. ${device.deviceName || device.name || 'Sin nombre'}`);
            console.log(`      ID: ${device.deviceId || device.id}`);
            console.log(`      Estado: ${device.online ? '🟢 Online' : '🔴 Offline'}`);
            console.log(`      Tipo: ${device.deviceType || 'Desconocido'}`);
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
        console.log('✅ Archivo .env creado con la configuración');
        
        // Generar script de prueba
        const testScript = `// Script de prueba para Hik-Connect
const axios = require('axios');

const testHikConnect = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/hik-connect/devices');
    console.log('Dispositivos:', response.data);
  } catch (error) {
    console.error('Error:', error.message);
  }
};

testHikConnect();`;

        require('fs').writeFileSync('test-hik-connect.js', testScript);
        console.log('✅ Script de prueba creado: test-hik-connect.js');

      } catch (devicesError) {
        console.log('⚠️  No se pudieron obtener los dispositivos:', devicesError.message);
        console.log('   Esto puede ser normal si no tienes dispositivos registrados o');
        console.log('   si la API tiene restricciones adicionales.');
      }

    } else {
      console.log('❌ Error en la autenticación');
      console.log('   Verifica que las credenciales sean correctas');
    }

  } catch (error) {
    console.log('❌ Error durante la configuración:', error.message);
    
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', error.response.data);
    }
  }

  rl.close();
}

// Ejecutar configuración
setupHikConnect();



