const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Llave = sequelize.define('Llave', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre de la llave'
    },
    sala_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'salas',
        key: 'id'
      },
      comment: 'ID de la sala a la que pertenece la llave'
    },
    activo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Estado de la llave: 1 = activa, 0 = borrada'
    }
  }, {
    tableName: 'llaves',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['sala_id']
      },
      {
        fields: ['activo']
      }
    ]
  });

  // Definir asociaciones
  Llave.associate = (models) => {
    // Una llave pertenece a una sala
    Llave.belongsTo(models.Sala, {
      foreignKey: 'sala_id',
      as: 'Sala'
    });
  };

  return Llave;
};
