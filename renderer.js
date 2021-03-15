const { ipcRenderer } = require("electron");
const path = require("path");
const { home } = require("./scripts/views/home");
const { login } = require("./scripts/views/login");
const wrapperElm = document.querySelector("main");
const alertOnlineStatus = () => {
   navigator.onLine
      ? console.log("Anda sedang terkoneksi internet...")
      : window.alert("Anda sedang offline. Silahkan koneksikan internet anda dan buka ulang aplikasi ini..!");
};

ipcRenderer.on("dom-loaded", (event, port) => {
   window.addEventListener("online", alertOnlineStatus());
   window.addEventListener("offline", alertOnlineStatus());
   const base_url = "http://localhost:" + port;
   const socket = io.connect(base_url, {
      path: "/socket.io",
   });
   if (JSON.parse(localStorage.getItem("sessionID"))) home(ipcRenderer, socket, path, wrapperElm);
   else login(ipcRenderer, socket, path, wrapperElm, base_url, home);
});
