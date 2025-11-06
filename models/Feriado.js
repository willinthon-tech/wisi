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
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID de la sala asociada'
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha del feriado'
    }
  }, {
    tableName: 'feriados',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Feriado;
};

