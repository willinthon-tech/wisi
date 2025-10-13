const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');



const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    
    return;
  }
  
});

// Habilitar foreign keys
db.run("PRAGMA foreign_keys = ON;", (err) => {
  if (err) {
    
    return;
  }
  
});

// Verificar si ya existen foreign keys
db.all("PRAGMA foreign_key_list(dispositivos);", (err, rows) => {
  if (err) {
    
    return;
  }
  
  if (rows.length > 0) {
    
    
    db.close();
    return;
  }
  
  
  
  
  db.close();
});


