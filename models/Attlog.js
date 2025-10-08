const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attlog = sequelize.define('Attlog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    dispositivo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'dispositivos',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID del dispositivo que generó el evento'
    },
    employee_no: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Número de empleado que realizó el marcaje'
    },
    event_time: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: 'Fecha y hora del evento de marcaje'
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Nombre del empleado que realizó el marcaje'
    }
  }, {
    tableName: 'attlogs',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Attlog;
};
