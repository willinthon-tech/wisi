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
    hora_entrada: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hora de entrada del bloque (Formato HH:MM)'
    },
    hora_salida: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Hora de salida del bloque (Formato HH:MM)'
    },
    turno: {
      type: DataTypes.ENUM('DIURNO', 'NOCTURNO', 'LIBRE'),
      allowNull: false,
      comment: 'Tipo de turno del bloque'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Orden del bloque en la secuencia (1, 2, 3, etc.)'
    },
    hora_entrada_descanso: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hora de entrada del descanso (Formato HH:MM)'
    },
    hora_salida_descanso: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Hora de salida del descanso (Formato HH:MM)'
    },
    tiene_descanso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Indica si el bloque tiene descanso'
    }
  }, {
    tableName: 'bloques',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Bloque;
};
