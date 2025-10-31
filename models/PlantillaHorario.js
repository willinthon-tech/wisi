const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PlantillaHorario = sequelize.define('PlantillaHorario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre de la plantilla de horario'
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    codigo: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Código identificador de la plantilla'
    },
    hora_entrada: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de entrada'
    },
    hora_salida: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de salida'
    },
    hora_descanso_entrada: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de entrada del descanso'
    },
    hora_descanso_salida: {
      type: DataTypes.TIME,
      allowNull: true,
      comment: 'Hora de salida del descanso'
    },
    color: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: '#ffffff',
      comment: 'Color para identificar la plantilla'
    }
  }, {
    tableName: 'plantillas_horarios',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return PlantillaHorario;
};
