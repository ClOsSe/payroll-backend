const express = require("express");
const { auth } = require("../config/tools");
const router = express.Router();
const baseModel = require("../models/baseModel");
const pdf = require("html-pdf");
const fs = require("fs");
const jade = require("jade");

function ziroClear(obj) {
  return Object.entries(obj).reduce(
    (a, [k, v]) => (v ? ((a[k] = v), a) : a),
    {}
  );
}

router.get("/:id", async function (req, res, next) {
  // let pdfValid = auth.verifyToken(req);
  if (1) {
    let data = await baseModel.select(
      "shc_payroll",
      "full_data , headers",
      "id LIKE '" + req.params.id + "' "
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

    var jsFile = JSON.parse(data[0].full_data);
    var headers = JSON.parse(data[0].headers);
        
    var username = jsFile['نام و نام خانوادگي'];
    var national_id = jsFile['كد'];
    
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
      karkard,
      kosorat,
      aghsat,
      sums,
    };
    // res.render("payroll", { list2: fullData });

    // console.log(fullData);
    var html = jade.renderFile("./views/payroll.jade", {
      list2: fullData,
    });

    const fileName = `${req.params.id}-${+new Date()}.pdf`
    let filePath = './public/pdfFiles/' + fileName;
    var options1 = { format: 'A4', orientation: "landscape" };
    pdf.create(html, options1).toFile(filePath, function (err, { filename }) {

        var dllink = "http://arkaapi.nodedotjs.ir/pdfFiles/" + fileName;
        // var dllink = "http://192.168.43.242:3000/pdfFiles/" + fileName;
        res.send(dllink);

        
        setTimeout(() => {
            console.log("deleted!");
            fs.unlink(filename, function (err) {
                if (err) throw err;
            });
        }, 60000);
        if (err) return console.log(err);
    });

    return;
  }

  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

module.exports = router;
