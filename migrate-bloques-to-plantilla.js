const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, function (err) {
      if (err) return reject(err);
      resolve();
    });
  });
}

async function migrate() {
  
  try {
    await run('BEGIN TRANSACTION;');

    await run(`
      CREATE TABLE IF NOT EXISTS bloques_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        horario_id INTEGER NOT NULL,
        plantilla_horario_id INTEGER,
        orden INTEGER NOT NULL,
        created_at DATETIME,
        updated_at DATETIME,
        FOREIGN KEY(horario_id) REFERENCES horarios(id) ON DELETE RESTRICT,
        FOREIGN KEY(plantilla_horario_id) REFERENCES plantillas_horarios(id) ON DELETE RESTRICT
      );
    `);

    await run(`
      INSERT INTO bloques_new (id, horario_id, plantilla_horario_id, orden, created_at, updated_at)
      SELECT id, horario_id, NULL as plantilla_horario_id, orden, created_at, updated_at FROM bloques;
    `);

    await run('DROP TABLE bloques;');
    await run('ALTER TABLE bloques_new RENAME TO bloques;');

    await run('COMMIT;');
    
    process.exit(0);
  } catch (err) {
    
    try { await run('ROLLBACK;'); } catch {}
    process.exit(1);
  }
}

migrate();











