const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const IncidenciaGeneral = sequelize.define('IncidenciaGeneral', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    libro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Libros',
        key: 'id'
      }
    },
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    hora: {
      type: DataTypes.STRING(5), // Formato HH:MM
      allowNull: false
    },
  }, {
    tableName: 'incidencias_generales',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return IncidenciaGeneral;
};

