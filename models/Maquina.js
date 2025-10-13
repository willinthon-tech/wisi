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
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    rango_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rangos',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    activo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Estado de la máquina: 1 = activa, 0 = borrada'
    }
  }, {
    tableName: 'maquinas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Maquina;
};
