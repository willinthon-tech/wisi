const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Bloque = sequelize.define('Bloque', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    horario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'horarios',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    plantilla_horario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'plantillas_horarios',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'Referencia a la plantilla de horario seleccionada para este bloque'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Orden del bloque en la secuencia (1, 2, 3, etc.)'
    },
    
  }, {
    tableName: 'bloques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Bloque;
};
