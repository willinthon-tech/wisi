const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NovedadMesaRegistro = sequelize.define('NovedadMesaRegistro', {
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
    mesa_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Mesas',
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
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    hora: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    tableName: 'novedades_mesas_registros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  });

  NovedadMesaRegistro.associate = (models) => {
    NovedadMesaRegistro.belongsTo(models.Libro, { foreignKey: 'libro_id', as: 'Libro' });
    NovedadMesaRegistro.belongsTo(models.Mesa, { foreignKey: 'mesa_id', as: 'Mesa' });
    NovedadMesaRegistro.belongsTo(models.Empleado, { foreignKey: 'empleado_id', as: 'Empleado' });
  };

  return NovedadMesaRegistro;
};
