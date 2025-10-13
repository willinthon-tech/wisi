const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Mesa = sequelize.define('Mesa', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
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
    juego_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'juegos',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    activo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Estado de la mesa: 1 = activa, 0 = borrada'
    }
  }, {
    tableName: 'mesas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Mesa;
};
