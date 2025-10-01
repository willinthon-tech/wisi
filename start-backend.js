const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando servidor backend...');

const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ Error iniciando servidor:', error);
});

serverProcess.on('close', (code) => {
  console.log(`Servidor cerrado con código: ${code}`);
});

// Manejar cierre del proceso
process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Cerrando servidor...');
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

