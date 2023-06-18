const catchError = require('../utils/catchError');
const User = require('../models/User');
const bcrypt = require("bcrypt");
const sendEmail = require('../utils/sendEmail');
const EmailCode = require('../models/EmailCode')
const jwt = require("jsonwebtoken")

const getAll = catchError(async (req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async (req, res) => {
    const { email, password, firstName, lastName, country, image, frontBaseUrl } = req.body   //! frontBaseUrl sale del frontEnd
    const hashPassword = await bcrypt.hash(password, 10)                                //!
    const body = { email, firstName, lastName, country, image, password: hashPassword }      //!  NO recibe el password, pasar el encriptado
    const result = await User.create(body);         // User.create(req.body);

    const code = require('crypto').randomBytes(64).toString('hex')                      //!
    const url = `${frontBaseUrl}/verify_email/${code}`                                  //!

    await sendEmail({
        to: `${email}`,
        subject: "Verificacion de creacion de cuenta",
        html: `
        <h2>Haz click en el siguiente enlace para verificar la cuenta: </h2>
        <a href=${url}>Click me!</a>
        `
    })

    const bodyCode = { code: code, userId: result.id }  //! Me relaciona el correo, con la Tabla de 1 a 1
    await EmailCode.create(bodyCode)

    return res.status(201).json(result);
});

const getOne = catchError(async (req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if (!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async (req, res) => {
    const { id } = req.params;
    await User.destroy({ where: { id } });
    return res.sendStatus(204);
});

const update = catchError(async (req, res) => {
    const { id } = req.params;
    const result = await User.update(
        req.body,
        { where: { id }, returning: true }
    );
    if (result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const verifyCode = catchError(async (req, res) => {     //! /users/verify/:code
    const { code } = req.params

    const codeUser = await EmailCode.findOne({ where: { code } })
    if (!codeUser) return res.sendStatus(401)

    const body = { isVerified: true }

    const userUpdate = await User.update(
        body,
        { where: { id: codeUser.userId }, returning: true }
    )

    await codeUser.destroy()    //! Destuyo todo el registro correspondiente de codeUser

    return res.json(userUpdate[1][0])
})

const login = catchError(async (req, res) => {      //! /users/login
    //! Paso 1: Buscar el usuario 
    const { email, password } = req.body
    const user = await User.findOne({ where: { email: email } })
    //! Paso 2: Verificar del usuario
    // if (!user) return res.status(401)
    if (!user) return res.status(401).json({ message: "Invalid credentials" })
    //! Paso 3: Verificar del password; y comparar
    const isValidPassword = await bcrypt.compare(password, user.password) // true or false
    if (!isValidPassword) return res.status(401).json({ message: "Invalid credentials" })
    if (!user.isVerified) return res.status(401).json({ message: "Invalid credentials" })
    //!Paso 4: Generar Token
    const token = jwt.sign(
        { user },
        process.env.TOKEN_SECRET,
        { expiresIn: "1d" }               // https://github.com/vercel/ms
    )

    return res.json({ user, token })
})

//! /users/me
const logged = catchError(async (req, res) => {
    const user = req.user
    return res.json(user)
})

const resetPassword = catchError(async (req, res) => {
    const { email, frontBaseUrl } = req.body
    const user = await User.findOne({ where: { email: email } })
    if (!user) return res.sendStatus(401)

    //! Genero un codigo
    const code = require('crypto').randomBytes(64).toString('hex')
    const url = `${frontBaseUrl}/reset_password/${code}`

    //! Correo
    await sendEmail({
        to: `${email}`,
        subject: "Solicitud de cambio de contraseña",
        html: `
        <h2>Haz click en el siguiente enlace para cambiar la contraseña: </h2>
        <a href=${url}>Click me!</a>
        `
    })

    //! Guardar codigo e id en EmailCode
    const body = { code, userId: user.id }
    await EmailCode.create(body)

    return res.json(user)
})

const updatePassword = catchError(async (req, res) => {  //! /users/reset_password/:code
    const { code } = req.params
    const { password } = req.body //postman o frontend

    const userCode = await EmailCode.findOne({ where: { code: code } })
    if (!userCode) return res.sendStatus(401)

    const hashPassword = await bcrypt.hash(password, 10)
    const body = { password: hashPassword }

    const user = await User.update(body, { where: { id: userCode.userId }})
    if(user[0] === 0) return res.sendStatus(404);   
    await userCode.destroy()

    return res.json(user[0])
})

module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    verifyCode,
    login,
    logged,
    resetPassword,
    updatePassword
}