const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Feriado = sequelize.define('Feriado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del feriado'
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'salas',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID de la sala asociada'
    },
    // REEMPLAZO DE FECHA POR MES Y DIA
    mes: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 12
      },
      comment: 'Mes del feriado (1-12)'
    },
    dia: {
      type: DataTypes.TINYINT,
      allowNull: false,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Día del feriado (1-31)'
    }
  }, {
    tableName: 'feriados',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Feriado;
};