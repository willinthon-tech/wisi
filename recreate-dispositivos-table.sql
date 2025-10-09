-- Crear tabla temporal con la estructura correcta
CREATE TABLE dispositivos_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre VARCHAR(255) NOT NULL,
    sala_id INTEGER NOT NULL,
    ip_local VARCHAR(255) NOT NULL,
    ip_remota VARCHAR(255),
    usuario VARCHAR(255),
    clave VARCHAR(255),
    marcaje_inicio VARCHAR(255),
    marcaje_fin VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sala_id) REFERENCES salas(id) ON DELETE RESTRICT
);

-- Copiar datos de la tabla original
INSERT INTO dispositivos_new (id, nombre, sala_id, ip_local, ip_remota, usuario, clave, marcaje_inicio, marcaje_fin, created_at, updated_at)
SELECT id, nombre, sala_id, ip_local, ip_remota, usuario, clave, marcaje_inicio, marcaje_fin, created_at, updated_at
FROM dispositivos;

-- Eliminar tabla original
DROP TABLE dispositivos;

-- Renombrar tabla nueva
ALTER TABLE dispositivos_new RENAME TO dispositivos;

-- Habilitar foreign keys
PRAGMA foreign_keys = ON;
