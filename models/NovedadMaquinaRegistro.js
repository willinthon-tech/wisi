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
      }
    },
    maquina_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'maquinas',
        key: 'id'
      }
    },
    novedad_maquina_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'novedades_maquinas',
        key: 'id'
      }
    },
    tecnico_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'tecnicos',
        key: 'id'
      }
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false
    },
    activo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'novedades_maquinas_registros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return NovedadMaquinaRegistro;
};

