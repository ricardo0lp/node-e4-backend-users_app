const { getAll, create, getOne, remove, update, verifyCode, login, logged, resetPassword, updatePassword } = require('../controllers/user.controllers');
const express = require('express');
const verifyJWT = require('../utils/verifyJWT');

const routerUser = express.Router();

routerUser.route('/')
    .get(verifyJWT, getAll)             //! p
    .post(create);

routerUser.route('/login')
    .post(login)

routerUser.route('/me')                 
    .get(verifyJWT, logged)             //! p

routerUser.route('/reset_password')     //! Extra
    .post(resetPassword)

// ----------------------------------

routerUser.route('/:id')
    .get(verifyJWT, getOne)             //! p
    .delete(verifyJWT, remove)          //! p
    .put(verifyJWT, update);            //! p

routerUser.route('/verify/:code')
    .get(verifyCode)                    

routerUser.route("/reset_password/:code")
    .post(updatePassword)

module.exports = routerUser;