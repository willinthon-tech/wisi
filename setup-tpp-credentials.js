const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
















rl.question('📝 Ingresa tu App Key (Client ID): ', (appKey) => {
  rl.question('🔐 Ingresa tu App Secret (Client Secret): ', (appSecret) => {
    
    if (!appKey || !appSecret) {
      
      rl.close();
      return;
    }

    // Actualizar config.env
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.join(__dirname, 'config.env');
    
    try {
      let configContent = fs.readFileSync(configPath, 'utf8');
      
      // Reemplazar o agregar las credenciales TPP
      configContent = configContent.replace(
        /TPP_CLIENT_ID=.*/g, 
        `TPP_CLIENT_ID=${appKey}`
      );
      configContent = configContent.replace(
        /TPP_CLIENT_SECRET=.*/g, 
        `TPP_CLIENT_SECRET=${appSecret}`
      );
      
      // Si no existen las líneas, agregarlas
      if (!configContent.includes('TPP_CLIENT_ID=')) {
        configContent += `\nTPP_CLIENT_ID=${appKey}`;
      }
      if (!configContent.includes('TPP_CLIENT_SECRET=')) {
        configContent += `\nTPP_CLIENT_SECRET=${appSecret}`;
      }
      
      fs.writeFileSync(configPath, configContent);
      
      
      
      
      
      
      
      
    } catch (error) {
      
    }
    
    rl.close();
  });
});

rl.on('close', () => {
  
  process.exit(0);
});



