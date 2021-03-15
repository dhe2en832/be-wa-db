module.exports = (appExpress, body, validationResult) => {
   appExpress.post("/auth/login", [body("email").notEmpty(), body("password").notEmpty()], async (req, res) => {
      try {
         const errors = validationResult(req).formatWith(({ msg }) => {
            return msg;
         });
         if (!errors.isEmpty()) {
            return res.status(422).json({
               status: false,
               message: "Email atau Password Masih Kosong",
            });
         } else {
            if (req.body.email === "wa@csacomputer.com" && req.body.password === "12345") {
               return res.status(200).json({
                  status: true,
                  response: "Email dan Password Cocok. Login Telah Berhasil",
               });
            } else {
               return res.status(422).json({
                  status: false,
                  message: "Email atau Password Tidak Cocok",
               });
            }
         }
      } catch (error) {
         return res.status(500).json({
            status: false,
            response: error,
         });
      }
   });
};
