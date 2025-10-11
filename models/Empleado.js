const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Empleado = sequelize.define('Empleado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    foto: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      comment: 'Foto del empleado en formato base64'
    },
    nombre: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nombre completo del empleado'
    },
    cedula: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Cédula de identidad del empleado'
    },
    fecha_ingreso: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha de ingreso a la empresa'
    },
    fecha_cumpleanos: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Fecha de cumpleaños del empleado'
    },
    sexo: {
      type: DataTypes.ENUM('Masculino', 'Femenino'),
      allowNull: false,
      comment: 'Sexo del empleado'
    },
    cargo_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cargos',
        key: 'id'
      },
      onDelete: 'RESTRICT',
      comment: 'ID del cargo al que pertenece el empleado'
    },
  }, {
    tableName: 'empleados',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Empleado;
};
