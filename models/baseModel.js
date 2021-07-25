const mysql = require("mysql");
const util = require("util");
const squel = require("squel");
const { config } = require("../config/tools");

const con = mysql.createConnection(config.dbConf);

con.connect(function (err) {
  if (err) throw err;
});

exports.insert = async function (tableName, data) {
  let sqlQuery = squel.insert().into(tableName).setFields(data).toString();

  const query = util.promisify(con.query).bind(con);

  try {
    return await query(sqlQuery);
  } catch (e) {
    return e;
  }
};

exports.update = async function (tableName, data, whereStr) {
  let sqlQuery = "UPDATE " + tableName + " SET " + data + " WHERE " + whereStr;

  const query = util.promisify(con.query).bind(con);

  try {
    return await query(sqlQuery);
  } catch (e) {
    return e;
  }
};

exports.select = async function (tableName, data, whereStr) {
  if (whereStr) {
    let sqlQuery =
      "SELECT " + data + " FROM " + tableName + " WHERE " + whereStr;

    const query = util.promisify(con.query).bind(con);

    try {
      return await query(sqlQuery);
    } catch (e) {
      return e;
    }
  } else {
    let sqlQuery = "SELECT " + data + " FROM " + tableName;
    const query = util.promisify(con.query).bind(con);

    try {
      return await query(sqlQuery);
    } catch (e) {
      return e;
    }
  }
};
