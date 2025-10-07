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
      }
    },
    juego_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'juegos',
        key: 'id'
      }
    }
  }, {
    tableName: 'mesas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Mesa;
};
