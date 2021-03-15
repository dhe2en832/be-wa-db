const { alertShow, alertDismiss } = require("../utils/alertGenerator");
const scriptsLogin = (ipcRenderer, socket, path, wrapperElm, base_url, home) => {
   document.querySelector("#showHidePassword a").addEventListener("click", (e) => {
      e.preventDefault();
      const showHideBtn = e.currentTarget.firstElementChild;
      if (showHideBtn.classList.contains("fa-eye-slash")) {
         showHideBtn.classList.remove("fa-eye-slash");
         showHideBtn.classList.add("fa-eye");
         showHideBtn.parentNode.parentNode.parentNode.firstElementChild.setAttribute("type", "text");
      } else {
         showHideBtn.classList.remove("fa-eye");
         showHideBtn.classList.add("fa-eye-slash");
         showHideBtn.parentNode.parentNode.parentNode.firstElementChild.setAttribute("type", "password");
      }
   });
   document.querySelector("#submitLogin").addEventListener("click", async (e) => {
      e.preventDefault();
      const alertContainer = document.querySelector("#alertContainer");
      const alertTimeout = 3000;
      const emailElm = document.querySelector("#inputEmail");
      const passwordElm = document.querySelector("#inputPassword");
      if (emailElm.value === "") {
         alertContainer.innerHTML = alertShow("Email anda masih kosong", "warning");
         alertDismiss(alertTimeout, "warning");
      } else if (passwordElm.value === "") {
         alertContainer.innerHTML = alertShow("Password anda masih kosong", "warning");
         alertDismiss(alertTimeout, "warning");
      } else {
         fetch(base_url + "/auth/login", {
            method: "POST",
            headers: {
               Accept: "application/json",
               "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: emailElm.value, password: passwordElm.value }),
         })
            .then((res) => res.json())
            .then((resJson) => {
               if (resJson.status === true) {
                  alertContainer.innerHTML = alertShow(resJson.response, "success");
                  alertDismiss(alertTimeout, "success");
                  localStorage.setItem("sessionID", Date.now());
                  home(ipcRenderer, socket, path, wrapperElm);
               } else {
                  alertContainer.innerHTML = alertShow(resJson.message, "danger");
                  alertDismiss(alertTimeout, "danger");
               }
            });
      }
   });
};

const login = (ipcRenderer, socket, path, wrapperElm, base_url, home) => {
   const pageLogin = path.join(__dirname, "../../pages", "/login.html");
   fetch(pageLogin)
      .then((res) => res.text())
      .then((resText) => {
         wrapperElm.innerHTML = resText;
         scriptsLogin(ipcRenderer, socket, path, wrapperElm, base_url, home);
      })
      .catch((err) => {
         console.log(err);
      });
};

module.exports = { login };
