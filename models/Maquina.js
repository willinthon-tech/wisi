const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Maquina = sequelize.define('Maquina', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      }
    },
    rango_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rangos',
        key: 'id'
      }
    }
  }, {
    tableName: 'maquinas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Maquina;
};
