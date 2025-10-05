const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Dispositivo = sequelize.define('Dispositivo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre del dispositivo'
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      },
      comment: 'ID de la sala donde está ubicado el dispositivo'
    },
    ip_local: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Dirección IP local del dispositivo'
    },
    ip_remota: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Dirección IP remota del dispositivo'
    },
    usuario: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Usuario para acceso al dispositivo'
    },
    clave: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Clave de acceso al dispositivo (texto plano)'
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'dispositivos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Dispositivo;
};
