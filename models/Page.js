const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Page = sequelize.define('Page', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    icono: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'file'
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
  }, {
    tableName: 'pages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Page;
};
