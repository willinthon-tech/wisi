const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Module = sequelize.define('Module', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    icono: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    ruta: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    page_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'pages',
        key: 'id'
      }
    }
  }, {
    tableName: 'modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Module;
};

