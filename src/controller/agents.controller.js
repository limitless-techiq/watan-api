var { code, token, body } = require("../functions/auth");
const agentModel = require("../model/agents.model"),
  model = agentModel,
  MCModel = require("../model/membershipcodes.model"),
  serviceModel = require("../model/services.model"),
  employeesModel = require("../model/employees.model"),
  validationResult = require("express-validator").validationResult,
  { genToken } = require("../config/jwt"),
  { send, genCode } = require("../mail/mail"),
  getLanguage = require("../localization/language"),
  { auth, hashString, compareString } = require("../functions/auth"),
  verify = async (req, res) => {
    var { email } = req.body,
      reqType = req.params.type,
      lang = getLanguage(req.body.language),
      validateData = validationResult(req).array();
    auth(res, lang, validateData, { email, reqType }, async () => {
      existAgent = await model.findOne({ email });
      if (existAgent != null && reqType == "register") {
        body = {
          success: false,
          msg: lang.exist,
        };
        code = 200;
      } else {
        var msg_code = genCode(),
          subject;
        if (reqType == "register") {
          subject = lang.register_msgSubject;
        } else {
          subject = lang.forgot_msgSubject;
        }
        var mail = await send(email, subject, msg_code, lang, "a"),
          msgStatus = mail.response.includes("OK");
        if (msgStatus) {
          body = {
            success: true,
            email: email,
            code: msg_code,
          };
          code = 200;
        } else {
          body = {
            success: false,
            msg: lang.ea,
          };
          code = 400;
        }
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  checkMC = async (req, res) => {
    var { MC, email } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { MC, email }, async () => {
      var existMC = await MCModel.findOne({ MC });
      if (existMC != null && email == existMC["email"]) {
        body = {
          success: true,
          _id: existMC["_id"],
          MC: existMC["MC"],
          email: existMC["email"],
          name: existMC["name"],
          createdAt: existMC["createdAt"],
          updatedAt: existMC["updatedAt"],
          __v: existMC["__v"],
        };
        code = 200;
      } else {
        body = {
          success: false,
          msg: lang.not_found,
        };
        code = 404;
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  register = async (req, res) => {
    var {
      MC,
      email,
      password,
      businessName,
      desc,
      nameowner,
      nicknameowner,
      employees,
      discount,
      country,
      governorate,
      services,
      currency,
      location,
      numbers,
      logo,
    } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(
      res,
      lang,
      validateData,
      {
        MC,
        email,
        password,
        businessName,
        desc,
        nameowner,
        nicknameowner,
        employees,
        discount,
        country,
        governorate,
        services,
        currency,
        location,
        numbers,
        logo,
      },
      async () => {
        var existAgent = await model.findOne({ email });
        if (existAgent != null) {
          body = {
            success: false,
            msg: lang.exist,
          };
          code = 200;
        } else {
          var existMC = await MCModel.findOne({ MC });
          if (existMC != null && existMC["email"] == email) {
            var checkServices = await serviceModel.find(),
              numbersCount = 0;
            numbers.forEach((value) => {
              checkServices.forEach((service) => {
                service["numbers"].forEach((phone) => {
                  if (phone["number"] == value["number"]) numbersCount++;
                });
              });
            });
            if (numbersCount == 0) {
              var hashpass = await hashString(password);
              password = hashpass;
              var newAgent = await model.create({
                MC,
                email,
                password,
                nameowner,
                nicknameowner,
              });
              if (newAgent != null) {
                var newService = await serviceModel.create({
                  agent_id: newAgent["id"],
                  businessName,
                  desc,
                  numbers,
                  services,
                  country,
                  governorate,
                  employees,
                  location,
                  discount,
                  currency,
                  logo,
                });
                if (newService != null) {
                  var usedMC = await MCModel.findOneAndUpdate(
                    { MC },
                    {
                      agent_id: newAgent["id"],
                    },
                    { new: true }
                  );
                  if (usedMC != null) {
                    body = {
                      success: true,
                      id: newAgent["id"],
                      MC,
                      service: newService["id"],
                    };
                    code = 200;
                  }
                  else {
                    body = {
                      success: false,
                      msg: lang.unknown_error,
                    };
                    code = 500;
                  }
                } else {
                  body = {
                    success: false,
                    msg: lang.unknown_error,
                  };
                  code = 500;
                }
              } else {
                await findOneAndDelete({ _id: newAgent["id"] });
                body = {
                  success: false,
                  msg: lang.unknown_error,
                };
                code = 500;
              }
            } else {
              body = {
                success: false,
                msg: lang.exist_number,
              };
              code = 200;
            }
          } else {
            body = {
              success: false,
              msg: lang.mc_check,
            };
            code = 200;
          }
        }
        token = genToken(body);
        res.status(code).json({ token });
      }
    );
  },
  checkEmployees = async (req, res) => {
    var { email } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { email }, async () => {
      var existAgent = await model.findOne({ email });
      if (existAgent != null) {
        var agent_id = existAgent["id"],
          serviceData = await serviceModel.findOne({ agent_id }),
          uc = parseInt(serviceData["employees"]),
          au = serviceData["availableEmployees"];
        if (uc > au.length) {
          body = {
            success: true,
          };
          code = 200;
        } else {
          body = {
            success: false,
            msg: lang.employees_maximum,
          };
          code = 200;
        }
      } else {
        body = {
          success: false,
          msg: lang.not_found,
        };
        code = 404;
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  login = async (req, res) => {
    var { email, password } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { email, password }, async () => {
      var agentCheck = await model.findOne({ email });
      if (agentCheck != null) {
        var serviceData = await serviceModel.findOne({
          agent_id: agentCheck["id"],
        }),
          isMatch = await compareString(password, agentCheck["password"]);
        if (isMatch && serviceData != null) {
          body = {
            success: true,
            id: agentCheck["id"],
            MC: agentCheck["MC"],
            service: serviceData["id"],
          };
          code = 200;
        } else {
          body = {
            success: false,
            msg: lang.password_not_correct,
          };
          code = 400;
        }
      } else {
        body = {
          success: false,
          msg: lang.not_found,
        };
        code = 404;
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  forgot = async (req, res) => {
    var { email, password } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { email, password }, async () => {
      var oldPassword = await model.findOne({ email });
      if (oldPassword != null) {
        const isMatch = await compareString(password, oldPassword["password"]);
        if (!isMatch) {
          var hashpass = await hashString(password);
          password = hashpass;
          var updateAgent = await model.findByIdAndUpdate(
            { _id: oldPassword["id"] },
            {
              password,
            },
            { new: true }
          );
          if (updateAgent != null) {
            body = {
              success: true,
              msg: lang.updated,
            };
          } else {
            body = {
              success: false,
              msg: lang.ce,
            };
          }
        } else {
          body = {
            success: false,
            msg: lang.used_password,
          };
        }
        code = 200;
      } else {
        body = {
          success: false,
          msg: lang.not_found,
        };
        code = 404;
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  getInfo = async (req, res) => {
    var { id } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { id }, async () => {
      var agentData = await model.findById({ _id: id });
      if (agentData == null) {
        body = { success: false, msg: lang.not_found };
        code = 404;
      } else {
        var agentService = await serviceModel
          .findOne({
            agent_id: agentData["_id"],
          })
          .populate("availableEmployees").populate("commerce.commerce_id"),
          agentMC = await MCModel.findOne({ agent_id: agentData["_id"] });
        console.log(agentService);
        if (agentService != null && agentMC != null) {
          body = {
            success: true,
            agent: agentData,
            service: agentService,
            mc: agentMC,
          };
          code = 200;
        } else {
          body = {
            success: false,
            msg: lang.unknown_error,
          };
          code = 500;
        }
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  },
  deleteAccount = async (req, res) => {
    var { id } = req.body,
      validateData = validationResult(req).array(),
      lang = getLanguage(req.body.language);
    auth(res, lang, validateData, { id }, async () => {
      var agentData = await model.findById({ _id: id });
      if (agentData == null) {
        body = { success: false, msg: lang.not_found };
        code = 404;
      } else {
        var agentService = await serviceModel.findOne({
          agent_id: agentData["_id"],
        }),
          agentMC = await MCModel.findOne({ agent_id: agentData["_id"] });
        if (agentService != null && agentMC != null) {
          var availableEmployees = agentService["availableEmployees"],
            agentEmployees;
          if (availableEmployees.length > 0) {
            availableEmployees.forEach(async (id, index) => {
              agentEmployees = await employeesModel.findOneAndDelete({
                _id: id,
              });
            });
          }
          agentMC = await MCModel.findOneAndDelete({
            agent_id: agentData["_id"],
          });
          agentService = await serviceModel.findOneAndDelete({
            agent_id: agentData["_id"],
          });
          agentData = await model.findOneAndDelete({ _id: id });
          body = {
            success: true,
            agentData,
            agentService,
            agentMC,
            agentEmployees,
          };
          code = 200;
        } else {
          body = { success: false, msg: lang.unknown_error };
          code = 500;
        }
      }
      token = genToken(body);
      res.status(code).json({ token });
    });
  };

module.exports = {
  verify,
  checkMC,
  register,
  checkEmployees,
  login,
  forgot,
  getInfo,
  deleteAccount,
};
