const express = require("express");
const router = express.Router();
const baseModel = require("../models/baseModel");
const { auth, config } = require("../config/tools");
const { Console } = require("console");
const xlsx = require("xlsx");
const fs = require("fs");
const { Buffer } = require("buffer");
const { query, json } = require("express");
const os = require("os");

function ziroClear(obj) {
  return Object.entries(obj).reduce(
    (a, [k, v]) => (v ? ((a[k] = v), a) : a),
    {}
  );
}

// show all users payroll
router.get("/list", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_payroll INNER JOIN shc_projects ON shc_projects.project_id=shc_payroll._project_id " +
        "ORDER BY CONVERT(username USING utf8) COLLATE utf8_persian_ci",
      "shc_projects.project_name, shc_payroll.*",
      null
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

// projects list'
router.get("/projects", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_projects ORDER BY CONVERT(project_name USING utf8) COLLATE utf8_persian_ci",
      "project_id, project_name, DATE_FORMAT(start_date,'%Y/%m/%d') AS start_date, DATE_FORMAT(end_date,'%Y/%m/%d') AS end_date, contract_number ",
      null
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "access denied" });
});

// define a new project
router.post("/project", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let projectData = {
      project_name: req.body.project_name,
      start_date: req.body.start_date,
      end_date: req.body.end_date,
      contract_number: req.body.contract_number,
      _project_admin: adminData.national_id,
    };
    await baseModel.insert("shc_projects", projectData);
    res.send(
      " پروژه " +
        " ' " +
        req.body.project_name +
        " ' " +
        " با موفقیت ایجاد شد . "
    );
  } else {
    res.status(403);
    res.json({ message: "access denied" });
  }
});

// upload excel file of project!!!
// add users & payrolls from excel file
router.post("/newList", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    //recive & move input file
    let xlsxFile = req.files.payrollFile;
    let destAdr =
      "./config/" +
      // req.body.projectName +
      xlsxFile.name; //.substr(xlsxFile.name.lastIndexOf('.'));
    await xlsxFile.mv(destAdr);

    //read input excell file
    var buf = fs.readFileSync(destAdr);
    var wb = xlsx.read(buf, { type: "buffer", cellDates: true });
    var ws = wb.Sheets[wb.SheetNames[0]];

    var data = xlsx.utils.sheet_to_json(ws);

    const b = Object.keys(data[0]);
    const c = Object.values(data[0]);
    var mainKey = [];

    for (let index = 0; index < b.length; index++) {
      const element = b[index];
      !element.match(/__empty_?\d*2?/i)
        ? mainKey.push(element)
        : mainKey.push(mainKey[mainKey.length - 1]);
    }
    var headers = {};
    mainKey.forEach((key, i) => (headers[key] = []));
    mainKey.forEach((key, i) => headers[key].push(c[i]));

    var range = xlsx.utils.decode_range(ws["!ref"]);
    range.s.r = 1; // <-- zero-indexed, so setting to 1 will skip row 0
    ws["!ref"] = xlsx.utils.encode_range(range);

    data = xlsx.utils.sheet_to_json(ws);

    //insert excell data to database
    for (var i = 0; i < data.length; i++) {
      let payrollData = {
        username: data[i]["نام و نام خانوادگي"],
        date_monthly: data[i]["سال/ماه"],
        basic_salary: data[i]["حقوق پايه"],
        children_salary: data[i]["حق اولاد"],
        house_salary: data[i]["حق مسكن"],
        kharobar_salary: data[i]["حق خواروبار"],
        overtime: data[i]["اضافه كاري"],
        employee_insurance: data[i]["بيمه تامين اجتماعي سهم كارمند"],
        unimployment_insurance: data[i]["بيمه بيكاري"],
        tax: data[i]["ماليات"],
        _employee: data[i]["كد"],
        _project_id: req.body.project_id,
        full_data: JSON.stringify(data[i]),
        headers: JSON.stringify(headers),
      };
      let userData = {
        national_id: payrollData._employee,
        personnel_code: data[i]["کد ملی"],
        username: payrollData.username,
        password: data[i]["کد ملی"],
        phone: "09131231234",
      };
      if (!userData.username == "") {
        await baseModel.insert("shc_users", userData);
      }
      await baseModel.insert("shc_payroll", payrollData);
    }
    res.json("فایل با موفقیت ثبت شد.");
  }
});

// payrolls list divide by project name
router.post("/showPayrollsList", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_payroll INNER JOIN shc_projects ON shc_projects.project_id=shc_payroll._project_id ",
      "shc_projects.project_name, shc_payroll.*",
      " shc_projects.project_name LIKE '%" + req.body.prj_name + "%'"
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

// download payrolls file with project name
router.post("/dlPayrolls", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_payroll",
      "full_data",
      "_project_id LIKE '" + req.body.project_id + "' "
    );

    let jsFile = [];
    for (i = 0; i < data.length; i++) {
      jsFile.push(JSON.parse(data[i].full_data));
    }

    var newWB = xlsx.utils.book_new();
    var newWS = await xlsx.utils.json_to_sheet(jsFile);
    xlsx.utils.book_append_sheet(newWB, newWS, "newSheet");
    xlsx.writeFile(newWB, "DownloadFile.xlsx");

    var oldPath = "./DownloadFile.xlsx";
    var newPath = "./public/excelFile/DownloadFile.xlsx";
    await fs.rename(oldPath, newPath, function (err) {
      if (err) throw err;
    });

    var dllink = "http://arkaapi.nodedotjs.ir/excelFile/DownloadFile.xlsx";
    //var dllink = "http://192.168.1.3:3000/excelFile/DownloadFile.xlsx";

    res.send(dllink);

    setTimeout(() => {
      fs.unlink(newPath, function (err) {
        if (err) throw err;
      });
    }, 60000);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

// change password
router.put("/changePass", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let oldPass = await baseModel.select(
      "shc_admins ",
      "password ",
      "national_id LIKE '" + adminData.national_id + "' "
    );
    if (oldPass[0].password === req.body.oldPassword) {
      await baseModel.update(
        "shc_admins ",
        "password = '" + req.body.newPassword + "' ",
        "national_id LIKE '" + adminData.national_id + "' "
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

// change project name
router.put("/editProjectName", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    await baseModel.update(
      "shc_projects ",
      "project_name = '" +
        req.body.newName +
        "', " +
        "start_date = '" +
        req.body.newStartDate +
        "', " +
        "end_date = '" +
        req.body.newEndDate +
        "', " +
        "contract_number = '" +
        req.body.newContractNumber +
        "' ",
      "project_id LIKE '" + req.body.project_ID + "' "
    );
    res.json({ message: "اطلاعات پروژه با موفقیت به روز رسانی شد." });
    return;
  }
  res.status(403);
  res.json({ message: "can not change password" });
});

// show a payroll summery
router.get("/viewItem/:id", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_payroll INNER JOIN shc_users ON shc_users.national_id=shc_payroll._employee ",
      "shc_users.username, shc_users.national_id, shc_payroll.full_data, shc_payroll.headers",
      " id LIKE '" + req.params.id + "'"
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
    // console.log(fullData);
    res.json(fullData);
    return;
  }
  res.status(403);
  res.json({ message: "access denied" });
});

// show users list
router.get("/getuserslist", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_users ",
      "national_id , username",
      null
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

// change users password
router.put("/edituserpass", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    await baseModel.update(
      "shc_users ",
      "password = '" + req.body.new_password + "' ",
      "national_id LIKE '" + req.body.national_id + "' "
    );
    res.json({ message: "رمز عبور با موفقیت تغییر کرد." });
    return;
  }

  res.status(403);
  res.json({ message: "can not change password" });
});

// users list divide by national id && name
router.post("/finduser", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  var str = req.body.national_id;
  str = str.replace("ی", "ي").replace("ک", "ك").replace("ة", "ه");
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_users ",
      "national_id , username",
      " national_id LIKE '" +
        req.body.national_id +
        "' OR username LIKE '%" +
        str +
        "%'"
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

router.post("/findProject", async function (req, res, next) {
  let adminData = auth.verifyToken(req);
  if (adminData && adminData.national_id == 67890) {
    let data = await baseModel.select(
      "shc_projects",
      "project_id, project_name, DATE_FORMAT(start_date,'%Y/%m/%d') AS start_date, DATE_FORMAT(end_date,'%Y/%m/%d') AS end_date, contract_number ",
      "project_name LIKE '%" + req.body.project_Name + "%'"
    );
    res.json(data);
    return;
  }
  res.status(403);
  res.json({ message: "Admin data is not valid" });
});

module.exports = router;
