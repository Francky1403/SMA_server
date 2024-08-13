'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    
    static associate(models) {
      Payment.belongsTo(models.Demande, { foreignKey: 'demandeId' });
    }
  }
  Payment.init({
    requestId: DataTypes.INTEGER,
    amount: DataTypes.FLOAT,
    paymentMethod: DataTypes.STRING,
    statut: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Payment',
  });
  return Payment;
};