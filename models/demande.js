'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Demande extends Model {
    
    static associate(models) {
      Demande.hasMany(models.Payment, { foreignKey: 'demandeId' });
    }
  }
  Demande.init({
    type: DataTypes.STRING,
    photo: DataTypes.STRING,
    name: DataTypes.STRING,
    firstName: DataTypes.STRING,
    email: DataTypes.STRING,
    country: DataTypes.STRING,
    phone: DataTypes.STRING,
    intention: DataTypes.TEXT,
    prix: DataTypes.FLOAT,
    payment: DataTypes.STRING,
    traité: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'Demande',
  });
  return Demande;
};