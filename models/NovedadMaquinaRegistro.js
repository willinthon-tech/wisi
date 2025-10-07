const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NovedadMaquinaRegistro = sequelize.define('NovedadMaquinaRegistro', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'libros',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    maquina_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'maquinas',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    novedad_maquina_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'novedades_maquinas',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    empleado_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'empleados',
        key: 'id'
      },
      onDelete: 'RESTRICT'
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false
    },
  }, {
    tableName: 'novedades_maquinas_registros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return NovedadMaquinaRegistro;
};

