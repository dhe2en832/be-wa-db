const { dateTimeGeneratorClient } = require("../utils/dateTimeGenerator");
const { durationGenerator } = require("../utils/durationGenerator");
const { alertShow, alertDismiss } = require("../utils/alertGenerator");
const scriptsHome = (ipcRenderer, socket) => {
   $("#loading").show();
   $("#app").hide();
   $("#content").hide();

   ipcRenderer.send("login-succeed");

   // Reload Then Exit
   window.addEventListener("beforeunload", () => {
      const totalRev = parseInt($("#rev_counter").text());
      const totalSen = parseInt($("#sen_counter").text());
      ipcRenderer.send("windows-closed", [totalRev, totalSen]);
   });

   // Web Socket
   socket.on("fatal-error", function (error) {
      $("#loading").hide();
      $("#app").hide();
      $("#content").hide();
      const timeout = 86400000;
      const errMsg = "UPDATE DIBUTUHKAN ATAU TERJADI ERROR : " + error + "<br /> HARAP HUBUNGI CSA COMPUTER SUPPORT";
      const errCatch = alertShow(errMsg, "danger");
      $("#alertContainer").append(errCatch);
      alertDismiss(timeout, "danger");
   });

   socket.on("error", function (error) {
      const timeout = error.code === "ENOENT" ? 100000 : 80000;
      const errMsg = error.code === "ENOENT" ? error.code + " : TIDAK DITEMUKAN ENTITAS " + error.path || " " : error.code;
      const errCatch = alertShow(errMsg, "danger");
      $("#alertContainer").append(errCatch);
      alertDismiss(timeout, "danger");
   });

   socket.on("logs", function (msg) {
      $(".logs").append($("<li>").text(msg));
   });

   socket.on("qr", function (src) {
      $("#qrcode").attr("src", src);
      $("#loading").hide();
      $("#app").show();
      $("#content").hide();
   });

   socket.on("ready", function (data) {
      $("#loading").hide();
      $("#app").hide();
      $("#content").show();
      $(".logs").html("");
   });

   socket.on("authenticated", function (data) {
      // Clock With Date Time Generator and Duration Generator
      window.setInterval(() => {
         const lastTime = $("#onlineFromHidden").text();
         const duration = durationGenerator(lastTime);
         $("#onlineDuration").text(duration);
      }, 1000);
      const authCatch = alertShow("Anda telah terhubung dengan QR Code.", "success");
      $("#alertContainer").append(authCatch);
      alertDismiss(5000, "success");
   });

   socket.on("disconnected", function () {
      $("#loading").show();
      $("#app").hide();
      $("#content").hide();
   });

   socket.on("received_message", function (data) {
      const currentReceived = parseInt($("#rev_counter").text()) + data;
      $("#rev_counter").text(currentReceived);
   });

   socket.on("sent_message", function (data) {
      const currentSent = parseInt($("#sen_counter").text()) + data;
      $("#sen_counter").text(currentSent);
   });

   socket.on("info", function (pNumber, pName, pPlatform, pVersion) {
      $("#onlineFrom").text();
      $("#onlineNumber").text(pNumber);
      $("#onlineName").text(pName);
      $("#onlinePlatform").text(pPlatform);
      $("#onlineVersion").text(pVersion);
      $("#onlineFrom").text(dateTimeGeneratorClient());
      $("#onlineFromHidden").text(new Date());
   });
};

const home = (ipcRenderer, socket, path, wrapperElm) => {
   const pageHome = path.join(__dirname, "../../pages", "/home.html");
   fetch(pageHome)
      .then((res) => res.text())
      .then((resText) => {
         wrapperElm.innerHTML = resText;
         scriptsHome(ipcRenderer, socket);
      })
      .catch((err) => {
         console.log(err);
      });
};

module.exports = { home };
