const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PageModule = sequelize.define('PageModule', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    page_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'pages',
        key: 'id'
      }
    },
    module_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'modules',
        key: 'id'
      }
    },
    orden: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'page_modules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['page_id', 'module_id']
      }
    ]
  });

  return PageModule;
};









