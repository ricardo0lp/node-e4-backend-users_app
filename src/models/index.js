const EmailCode = require("./EmailCode");
const User = require("./User");

//! Relacion de Uno a Uno
EmailCode.belongsTo(User)   //! userId
User.hasOne(EmailCode)