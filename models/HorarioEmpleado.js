const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HorarioEmpleado = sequelize.define('HorarioEmpleado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'ID único del registro'
    },
    empleado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'empleados',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID del empleado'
    },
    horario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'horarios',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID del horario asignado'
    },
    primer_dia: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Fecha del primer día de trabajo con este horario'
    }
  }, {
    tableName: 'horarios_empleados',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['empleado_id', 'horario_id'],
        name: 'unique_empleado_horario'
      },
      {
        fields: ['empleado_id'],
        name: 'idx_horarios_empleados_empleado_id'
      },
      {
        fields: ['horario_id'],
        name: 'idx_horarios_empleados_horario_id'
      },
      {
        fields: ['primer_dia'],
        name: 'idx_horarios_empleados_primer_dia'
      }
    ]
  });

  return HorarioEmpleado;
};
