const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cargo = sequelize.define('Cargo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false
    },
    departamento_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'departamentos',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    }
  }, {
    tableName: 'cargos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Cargo;
};





