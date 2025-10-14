const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Sala = sequelize.define('Sala', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    logo: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Logo de la sala en base64'
    },
    rif: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'RIF de la sala'
    },
    ubicacion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Ubicación física de la sala'
    },
    correo: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Correo electrónico de la sala'
    },
    telefono: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Teléfono de la sala'
    },
    nombre_comercial: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre comercial de la sala'
    },
  }, {
    tableName: 'salas',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Sala;
};

