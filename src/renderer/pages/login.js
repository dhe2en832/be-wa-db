const { alertShow, alertDismiss } = require('../../utils/alertGenerator');
const { setElemText } = require('../../utils/stylesGenerator');

function login(ipcRenderer, wrapperElm, base_url, version, icons, home) {
  const pageLogin = `
    <div class="container-fluid">
      <div class="row">
        <div class="col-md-4"></div>
        <div class="col-md-4">
            <div class="text-center error-login"></div>
            <div class="text-center p-4 m-4">
              <form class="form-group">
                  <img class="mb-4" src="./images/icon.ico" alt="CSA-Logo" width="72" height="72" />
                  <h1 class="h3 mb-4 font-weight-normal">Login Prompt</h1>
                  <input type="email" id="inputEmail" class="form-control mb-2" placeholder="Email" required autofocus />
                  <div class="input-group" id="showHidePassword">
                    <input class="form-control" type="password" id="inputPassword" placeholder="Password" required />
                    <span class="input-group-text text-decoration-none"><img src="${icons.hideSVG}" class="hidePassword" aria-hidden="true"></img></span>
                  </div>
                  <div class="d-grid mx-auto mt-4">
                    <button id="submitLogin" class="btn btn-sm btn-primary" type="submit">Submit</button>
                  </div>
                  <p class="text-muted fst-italic font-smaller p-0 m-0 mt-4">WACSA v<span id="versionTagLogin"></span></p>
                  <p class="text-muted small p-0 m-0">Copyright &copy; ${new Date().getFullYear()} CSA Computer. All Right Reserved</p>
              </form>
            </div>
        </div>
        <div class="col-md-4"></div>
        <div class="col-md-12 text-center">
            <div id="alertContainer"></div>
        </div>
      </div>
    </div>
  `;

  const scriptsLogin = () => {
    setElemText('#versionTagLogin', version);
    document.querySelector('#showHidePassword span').addEventListener('click', (e) => {
      e.preventDefault();
      const showHideBtn = e.currentTarget.firstElementChild;
      if (showHideBtn.classList.contains('hidePassword')) {
        showHideBtn.classList.remove('hidePassword');
        showHideBtn.classList.add('showPassword');
        showHideBtn.setAttribute('src', icons.showSVG);
        showHideBtn.parentNode.parentNode.firstElementChild.setAttribute('type', 'text');
      } else {
        showHideBtn.classList.remove('showPassword');
        showHideBtn.classList.add('hidePassword');
        showHideBtn.setAttribute('src', icons.hideSVG);
        showHideBtn.parentNode.parentNode.firstElementChild.setAttribute('type', 'password');
      }
    });
    document.querySelector('#submitLogin').addEventListener('click', (e) => {
      e.preventDefault();
      const alertContainer = document.querySelector('#alertContainer');
      const alertTimeout = 3000;
      const emailElm = document.querySelector('#inputEmail');
      const passwordElm = document.querySelector('#inputPassword');
      if (emailElm.value === '') {
        alertContainer.innerHTML = alertShow('Email anda masih kosong', 'warning');
        alertDismiss(alertTimeout, 'warning');
      } else if (passwordElm.value === '') {
        alertContainer.innerHTML = alertShow('Password anda masih kosong', 'warning');
        alertDismiss(alertTimeout, 'warning');
      } else {
        fetch(base_url + '/auth/login', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailElm.value, password: passwordElm.value }),
        })
          .then((res) => res.json())
          .then((resJson) => {
            if (resJson.status === true) {
              alertContainer.innerHTML = alertShow(resJson.message, 'success');
              alertDismiss(alertTimeout, 'success');
              // Token sudah disimpan di credentials.json oleh auth service
              // Tidak perlu session management, langsung ke home
              home(ipcRenderer, wrapperElm, base_url, version);
            } else {
              alertContainer.innerHTML = alertShow(resJson.message, 'danger');
              alertDismiss(alertTimeout, 'danger');
            }
          })
          .catch((error) => {
            alertContainer.innerHTML = alertShow('Login failed: ' + error.message, 'danger');
            alertDismiss(alertTimeout, 'danger');
          });
      }
    });
  };

  wrapperElm.innerHTML = pageLogin;
  scriptsLogin();
}

module.exports = { login };
