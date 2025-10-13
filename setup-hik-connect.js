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
  
  

  try {
    // Solicitar credenciales de API
    
    
    
    
    

    const clientId = await askQuestion('🔑 Client ID: ');
    const clientSecret = await askQuestion('🔐 Client Secret: ');

    if (!clientId || !clientSecret) {
      
      rl.close();
      return;
    }

    

    // Probar autenticación
    const authResponse = await axios.post(`${HIK_CONNECT_CONFIG.tokenUrl}`, {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'device:read user:read event:read photo:read'
    });

    if (authResponse.data.access_token) {
      
      
      const accessToken = authResponse.data.access_token;
      
      // Obtener dispositivos
      
      
      try {
        const devicesResponse = await axios.get(`${HIK_CONNECT_CONFIG.baseUrl}/devices`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        
        
        
        if (devicesResponse.data.data && devicesResponse.data.data.length > 0) {
          
          devicesResponse.data.data.forEach((device, index) => {
            
            
            
            
            
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
        
        
        // Generar script de prueba
        const testScript = `// Script de prueba para Hik-Connect
const axios = require('axios');

const testHikConnect = async () => {
  try {
    const response = await axios.post('http://localhost:3000/api/hik-connect/devices');
    
  } catch (error) {
    
  }
};

testHikConnect();`;

        require('fs').writeFileSync('test-hik-connect.js', testScript);
        

      } catch (devicesError) {
        
        
        
      }

    } else {
      
      
    }

  } catch (error) {
    
    
    if (error.response) {
      
      
    }
  }

  rl.close();
}

// Ejecutar configuración
setupHikConnect();



