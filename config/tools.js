const jwt = require("jsonwebtoken");

let conf = {
  jwtCode: "ABCdArka12345",
  dbConf: {
    host: "localhost",
    user: "nodedotj_ArkaAdmin",
    password: "0etzNaDvy,{K",
    database: "nodedotj_arka",
  },
};

let auth = {
  createToken: function (userData) {
    delete userData.password;
    delete userData.phone;
    // delete userData.username;
    return jwt.sign({ userData: userData }, conf.jwtCode);
  },
  verifyToken: function (req) {
    try {
      return jwt.verify(req.headers.authorization, conf.jwtCode).userData;
    } catch (e) {
      return null;
    }
  },
};

exports.config = conf;
exports.auth = auth;
