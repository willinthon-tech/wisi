const { spawn } = require('child_process');
const path = require('path');



const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  
});

serverProcess.on('close', (code) => {
  
});

// Manejar cierre del proceso
process.on('SIGINT', () => {
  
  serverProcess.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  
  serverProcess.kill('SIGTERM');
  process.exit(0);
});

