const express = require("express");
const router = express.Router();
const baseModel = require("../models/baseModel");
const { auth } = require("../config/tools");

function ziroClear(obj) {
  return Object.entries(obj).reduce(
    (a, [k, v]) => (v ? ((a[k] = v), a) : a),
    {}
  );
}

router.get("/list", async function (req, res, next) {
  let userData = auth.verifyToken(req);
  if (userData) {
    let data = await baseModel.select(
      "shc_payroll INNER JOIN shc_projects ON shc_projects.project_id=shc_payroll._project_id ",
      " id " +
      "," +
      " date_monthly" +
      "," +
      " basic_salary" +
      "," +
      "project_name",
      "_employee LIKE '" + userData.national_id + "' "
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "access denied" });

  // res.send('show list of payrolls');
});

router.put("/changePass", async function (req, res, next) {
  let userData = auth.verifyToken(req);
  if (userData) {
    let oldPass = await baseModel.select(
      "shc_users ",
      "password ",
      "national_id LIKE '" + userData.national_id + "' "
    );
    if (oldPass[0].password === req.body.oldPassword) {
      await baseModel.update(
        "shc_users ",
        "password = '" + req.body.newPassword + "' ",
        "national_id LIKE '" + userData.national_id + "' "
      );
      res.json({ message: "رمز عبور با موفقیت تغییر کرد." });
      return;
    } else {
      res.json({ message: "رمز عبور فعلی اشتباه است.." });
      return;
    }
  }
  res.status(403);
  res.json({ message: "can not change password" });
});

router.get("/viewItem/:id", async function (req, res, next) {
  let userValid = auth.verifyToken(req);
  if (userValid) {
    let data = await baseModel.select(
      "shc_payroll INNER JOIN shc_users ON shc_users.national_id=shc_payroll._employee ",
      "shc_users.username, shc_users.national_id, shc_payroll.full_data, shc_payroll.headers",
      "_employee LIKE '" +
      userValid.national_id +
      "' " +
      " AND id LIKE '" +
      req.params.id +
      "'"
    );
    var information = {};
    var karkard = {};
    var mazaya = {};
    var kosorat = {};
    var aghsat = {};
    let informationHeader = [];
    let karkardHeader = [];
    let mazayaHeader = [];
    let kosoratHeader = [];
    let aghsatHeader = [];

    var username = data[0].username;
    var national_id = data[0].national_id;

    var jsFile = JSON.parse(data[0].full_data);
    var headers = JSON.parse(data[0].headers);

    informationHeader = headers["مشخصات"];
    karkardHeader = headers["کارکرد"];
    mazayaHeader = headers["مزایا"];
    kosoratHeader = headers["کسورات"];
    aghsatHeader = headers["اقساط"];
    
    var sums = {
      "خالص پرداختنی": jsFile["خالص پرداختي"],
      "جمع كسور": jsFile["جمع كسور"],
      "كل حقوق و مزايا": jsFile["كل حقوق و مزايا"],
    };

    for (key in informationHeader) {
      information[informationHeader[key]] = jsFile[informationHeader[key]];
    }
    for (key in karkardHeader) {
      if( jsFile[karkardHeader[key]] != '00'){
        karkard[karkardHeader[key]] = jsFile[karkardHeader[key]];
      }
    }
    for (key in mazayaHeader) {
      mazaya[mazayaHeader[key]] = jsFile[mazayaHeader[key]];
    }
    for (key in kosoratHeader) {
      kosorat[kosoratHeader[key]] = jsFile[kosoratHeader[key]];
    }
    for (key in aghsatHeader) {
      aghsat[aghsatHeader[key]] = jsFile[aghsatHeader[key]];
    }
    information = ziroClear(information);
    karkard = ziroClear(karkard);
    mazaya = ziroClear(mazaya);
    kosorat = ziroClear(kosorat);
    aghsat = ziroClear(aghsat);

    const fullData = {
      username,
      national_id,
      information,
      karkard,
      mazaya,
      kosorat,
      aghsat,
      sums,
    };

    res.json(fullData);
    return;
  }

  res.status(403);
  res.json({ message: "access denied" });

  // show chosen payroll;
});

module.exports = router;
