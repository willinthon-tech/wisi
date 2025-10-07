const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Drop = sequelize.define('Drop', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'libros',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    mesa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'mesas',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    denominacion_100: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    denominacion_50: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    denominacion_20: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    denominacion_10: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    denominacion_5: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    denominacion_1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
  }, {
    tableName: 'drops',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Drop;
};
