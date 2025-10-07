const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre_apellido: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    usuario: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    password_plain: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    nivel: {
      type: DataTypes.ENUM('TODO', 'ADMINISTRADOR', 'USUARIO_ACCESO'),
      allowNull: false
    },
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return User;
};



