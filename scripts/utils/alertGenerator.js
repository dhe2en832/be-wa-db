const alertShow = (messageAlert, status) => {
   return `
    <div class="alert alert-${status} alert-dismissible fade show mt-2" role="alert">
      ${messageAlert}
      <button type="button" class="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
      </button>
    </div>
  `;
};

const alertDismiss = (timer, status) => {
   window.setTimeout(function () {
      $(".alert-" + status)
         .fadeTo(500, 0)
         .slideUp(500, function () {
            $(this).remove();
         });
   }, timer);
};

module.exports = { alertShow, alertDismiss };
