const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ExcepcionHorario = sequelize.define('ExcepcionHorario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    empleado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'empleados', key: 'id' },
      onDelete: 'RESTRICT'
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha a la que aplica la excepción'
    },
    plantilla_horario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'plantillas_horarios', key: 'id' },
      onDelete: 'RESTRICT'
    },
    motivo: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'excepciones_horario',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['empleado_id', 'fecha'], name: 'ux_excepcion_empleado_fecha' }
    ]
  });

  return ExcepcionHorario;
};









