const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Libro = sequelize.define('Libro', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      }
    }
  }, {
    tableName: 'libros',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Libro;
};
