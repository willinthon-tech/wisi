const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuración de credenciales TPP Hikvision');
console.log('===============================================\n');

console.log('📋 Pasos para obtener credenciales:');
console.log('1. Ve a: https://tpp.hikvision.com/');
console.log('2. Inicia sesión con tu cuenta TPP');
console.log('3. Ve a "Applications" o "Aplicaciones"');
console.log('4. Haz clic en "Create Application"');
console.log('5. Completa los datos:');
console.log('   - Application Name: WISI System Integration');
console.log('   - Description: Sistema de integración biométrica para WISI');
console.log('   - Application Type: Web Application');
console.log('   - Redirect URI: http://localhost:3000/auth/tpp/callback');
console.log('6. Copia el App Key y App Secret generados\n');

rl.question('📝 Ingresa tu App Key (Client ID): ', (appKey) => {
  rl.question('🔐 Ingresa tu App Secret (Client Secret): ', (appSecret) => {
    
    if (!appKey || !appSecret) {
      console.log('❌ Error: App Key y App Secret son requeridos');
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
      
      console.log('\n✅ Credenciales TPP configuradas exitosamente!');
      console.log(`📁 Archivo actualizado: ${configPath}`);
      console.log('\n🚀 Próximos pasos:');
      console.log('1. Reinicia el servidor: npm start');
      console.log('2. Prueba la autenticación TPP');
      console.log('3. Verifica que las APIs funcionen correctamente');
      
    } catch (error) {
      console.log('❌ Error actualizando config.env:', error.message);
    }
    
    rl.close();
  });
});

rl.on('close', () => {
  console.log('\n👋 ¡Configuración completada!');
  process.exit(0);
});



