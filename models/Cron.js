const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Cron = sequelize.define('Cron', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    value: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'Desactivado',
      comment: 'Intervalo de tiempo para el cron global (Desactivado, 1m, 5m, 10m, 30m, 1h, 6h, 12h, 24h)'
    }
  }, {
    tableName: 'cron',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Cron;
};
