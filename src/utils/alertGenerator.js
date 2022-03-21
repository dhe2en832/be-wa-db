const alertShow = (messageAlert, status) => {
  return `
    <div class="alert alert-${status} alert-dismissible fade show mt-2" role="alert">
      ${messageAlert}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="close alert"></button>
    </div>
  `;
};

const alertDismiss = (timer, status) => {
  window.setTimeout(() => {
    const alertNode = document.querySelector('.alert-' + status);
    if (alertNode !== null) alertNode.querySelector('[aria-label="close alert"]').click();
  }, timer);
};

module.exports = { alertShow, alertDismiss };
