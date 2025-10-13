const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ControlLlaveRegistro = sequelize.define('ControlLlaveRegistro', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    libro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Libros',
        key: 'id',
      },
      onDelete: 'RESTRICT',
    },
    llave_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Llaves',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    empleado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Empleados',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    hora: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'control_llaves_registros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  ControlLlaveRegistro.associate = (models) => {
    ControlLlaveRegistro.belongsTo(models.Libro, { foreignKey: 'libro_id', as: 'Libro' });
    ControlLlaveRegistro.belongsTo(models.Llave, { foreignKey: 'llave_id', as: 'Llave' });
    ControlLlaveRegistro.belongsTo(models.Empleado, { foreignKey: 'empleado_id', as: 'Empleado' });
  };

  return ControlLlaveRegistro;
};
