function updaterCustom(ipcRenderer, updateSVG, restartSVG) {
    const componentUpdater = `
        <div class="position-fixed top-15 end-0 p-1" style="z-index: 11">
            <button type="button" class="btn btn-sm" id="updateBtn">
            <img src="${updateSVG}" alt="updater" />
            </button>
            <button id="loadingBtn" class="btn btn-sm d-none text-center" readonly>
                <div class="spinner-border text-primary" role="status">
                    <span class="sr-only"></span>
                </div>
            </button>
            <button type="button" class="btn btn-sm d-none" id="restartLaterBtn">
            <img src="${restartSVG}" alt="updater" />
            </button>
        </div>

        <div class="position-fixed bottom-0 end-0 p-3" style="z-index: 11">
            <div
                id="updateToast"
                class="toast hide fade-in"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                data-bs-autohide="false"
            >
                <div class="toast-header">
                    <strong class="me-auto text-primary">Pembaruan Tersedia...</strong>
                    <small class="updateVersion">v0.0.0</small>
                </div>
                <div class="toast-body">
                    <p class="p-0 m-0">WACSA versi terbaru telah rilis.</p>
                    <p class="p-0 m-0">Unduh pembaruan sekarang?</p>
                    <div class="d-flex justify-content-end mx-2 mt-3">
                        <button class="btn btn-sm btn-secondary me-2" id="downloadBtn">UNDUH</button>
                        <button class="btn btn-sm btn" type="button" id="downloadCancelBtn">BATAL</button>
                    </div>
                </div>
            </div>
            <div
                id="restartToast"
                class="toast hide fade-in"
                role="alert"
                aria-live="assertive"
                aria-atomic="true"
                data-bs-autohide="false"
            >
                <div class="toast-header">
                    <strong class="me-auto text-success">Pembaruan Terunduh...</strong>
                    <small class="updateVersion">v0.0.0</small>
                </div>
                <div class="toast-body">
                    <p class="p-0 m-0">WACSA versi terbaru telah diunduh.</p>
                    <p class="p-0 m-0">Restart aplikasi untuk menerapkan pembaruan sekarang?</p>
                    <div class="d-flex justify-content-end mx-2 mt-3">
                        <button class="btn btn-sm btn-secondary me-2" id="restartBtn">RESTART</button>
                        <button class="btn btn-sm" type="button" id="restartCancelBtn">NANTI</button>
                    </div>
                </div>
            </div>
        </div>
    `
    const elementHeader = document.querySelector('header');
    const scriptsUpdater = () => {
        const updateToastEl = document.getElementById('updateToast');
        const updateToast = {
            show: () => {
                updateToastEl.classList.add('show');
                updateToastEl.classList.remove('hide');
            },
            hide: () => {
                updateToastEl.classList.add('hide');
                updateToastEl.classList.remove('show');
            }
        }
        const restartToastEl = document.getElementById('restartToast');
        const restartToast = {
            show: () => {
                restartToastEl.classList.add('show');
                restartToastEl.classList.remove('hide');
            },
            hide: () => {
                restartToastEl.classList.add('hide');
                restartToastEl.classList.remove('show');
            }
        };
        const updateBtn = document.getElementById('updateBtn');
        const loadingBtn = document.getElementById('loadingBtn')
        const downloadBtn = document.getElementById('downloadBtn');
        const downloadCancelBtn = document.getElementById('downloadCancelBtn');
        const restartBtn = document.getElementById('restartBtn');
        const restartCancelBtn = document.getElementById('restartCancelBtn');
        const restartLaterBtn = document.getElementById('restartLaterBtn');

        updateBtn.addEventListener('click', () => {
            ipcRenderer.send('check-for-update');
            updateBtn.classList.add('d-none');
            loadingBtn.classList.remove('d-none');
        });
        downloadBtn.addEventListener('click', () => {
            ipcRenderer.send('download-update');
            updateToast.hide();
            loadingBtn.classList.remove('d-none');
        });
        downloadCancelBtn.addEventListener('click', () => {
            updateToast.hide();
            updateBtn.classList.remove('d-none');
        });
        restartBtn.addEventListener('click', () => {
            ipcRenderer.send('restart-for-update');
        });
        restartCancelBtn.addEventListener('click', () => {
            restartLaterBtn.classList.remove('d-none');
            restartToast.hide();
        });
        restartLaterBtn.addEventListener('click', () => {
            restartToast.show();
        });

        ipcRenderer.on('update_available', (event, info) => {
            loadingBtn.classList.add('d-none');
            document.querySelectorAll('.updateVersion').forEach((val) => (val.innerText = 'v' + info.version));
            updateToast.show();
        });
        ipcRenderer.on('update_not_available', (event, info) => {
            loadingBtn.classList.add('d-none');
            updateBtn.classList.remove('d-none');
            setTimeout(() => alert(`Update tidak ditemukan.\nWACSA v${info.version} adalah versi yang terbaru.`), 500);
        });
        ipcRenderer.on('update_downloaded', () => {
            loadingBtn.classList.add('d-none');
            restartToast.show();
        });
        ipcRenderer.on('update_error', (event, error) => {
            let errorMsg;
            error.toString().includes('Cannot find channel')
                ? errorMsg = 'Belum ada server update yang tersedia.'
                : errorMsg = error;
            loadingBtn.classList.add('d-none');
            updateBtn.classList.remove('d-none');
            setTimeout(() => alert(errorMsg), 500);
        });
    }

    elementHeader.innerHTML = componentUpdater;
    scriptsUpdater();
}

module.exports = { updaterCustom };