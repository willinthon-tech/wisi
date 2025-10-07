const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rango = sequelize.define('Rango', {
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
    }
  }, {
    tableName: 'rangos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Rango;
};
