const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Juego = sequelize.define('Juego', {
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
    }
  }, {
    tableName: 'juegos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Juego;
};
