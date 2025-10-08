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
      onDelete: 'RESTRICT',
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
    marcaje_inicio: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Fecha y hora de inicio del marcaje en formato YYYY-MM-DDTHH:mm:ss'
    },
    marcaje_fin: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Fecha y hora de fin del marcaje en formato YYYY-MM-DDTHH:mm:ss'
    },
    cron_activo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Indica si el cron está activo (1) o inactivo (0)'
    },
    cron_tiempo: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: '24h',
      comment: 'Intervalo de tiempo para el cron (10s, 1m, 5m, 10m, 30m, 1h, 6h, 12h, 24h)'
    }
  }, {
    tableName: 'dispositivos',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Dispositivo;
};
