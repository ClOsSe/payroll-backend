const express = require("express");
const router = express.Router();
const baseModel = require("../models/baseModel");
const { auth } = require("../config/tools");

router.post("/", async function (req, res, next) {
  let role = "";
  let data = await baseModel.select(
    "shc_users",
    "*",
    "personnel_code LIKE '" + req.body.username + "' "
  );
  if (data.length > 0) {
    if (data[0].password === req.body.password) {
      role = "user";
      let userData = data[0];
      res.json({
        message: "Ok",
        token: auth.createToken(userData),
        role: role,
      });
      return;
    }
  } else {
    data = await baseModel.select(
      "shc_admins",
      "*",
      "national_id LIKE '" + req.body.username + "' "
    );
    if (data.length > 0) {
      if (data[0].password === req.body.password) {
        role = "admin";
        let userData = data[0];
        res.json({
          message: "Ok",
          token: auth.createToken(userData),
          role: role,
        });
        return;
      }
    }
  }
  res.status(403);
  res.json({ message: "username or password is not valid" });
});

module.exports = router;
