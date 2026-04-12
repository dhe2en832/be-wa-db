const { MessageMedia } = require("whatsapp-web.js");
const { body, validationResult } = require("express-validator");
const { auth } = require("../middleware");
const { waState } = require("../whatsapp");
const errorLogger = require("../logger/error-logger");
const { phoneNumberFormatter } = require("../../utils/phoneNumberFormatter");
const { config, rootPath } = require("../system");

function messageRoutes(
  appExpress,
  waClient,
  win,
  sentFileHandle,
  SENT_FILE_PATH
) {
  const checkRegisteredNumber = async function (number) {
    try {
      const isRegistered = await waClient.isRegisteredUser(number);
      return isRegistered;
    } catch (error) {
      await errorLogger("messageRoutes #checkRegisteredNumber" + error, win);
    }
  };

  const saveToSentLog = async function (response, req) {
    try {
      if (response.fromMe) {
        const remark = req.body?.remark;
        response.remark = remark || "-";
        response.mediaKey = response.mediaKey || "-";
        await new Promise((resolve, reject) => {
          sentFileHandle(resolve, reject, response, "post", 1);
        }).then((success) => {
          if (success) {
            win.webContents.send("sent_message", 1);
          }
        });
      }
    } catch (error) {
      if (error.code === "ENOENT") {
        SENT_FILE_PATH = path.resolve(rootPath + "/wacsa-sent.json");
        config.FolderLog.SentLogFolder = rootPath;
        fs.writeFileSync(
          path.resolve(rootPath + "/wacsa.ini"),
          ini.stringify(config)
        );
      }
      await errorLogger("messageRoutes #sentMessageLog" + error, win);
    }
  };

  appExpress.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  appExpress.post(
    "/message/send-text",
    [auth, body("number").notEmpty(), body("message").notEmpty()],
    async (req, res) => {
      try {
        const isConnectedClient = await waState(waClient);
        if (isConnectedClient === "CONNECTED") {
          const errors = validationResult(req).formatWith(({ msg }) => {
            return msg;
          });

          if (!errors.isEmpty()) {
            return res.status(400).json({
              status: false,
              message: "Nomor Telepon Atau Pesan Masih Kosong",
            });
          }

          const rawNumber = req.body.number;
          const isGroupJid = typeof rawNumber === 'string' && (rawNumber.endsWith('@g.us') || rawNumber.endsWith('@broadcast'));
          const number = isGroupJid ? rawNumber : phoneNumberFormatter(rawNumber);
          if (!isGroupJid) {
            const isRegisteredNumber = await checkRegisteredNumber(number);
            if (!isRegisteredNumber) {
              return res.status(422).json({
                status: false,
                message: "Nomor Whatsapp tidak terdaftar",
              });
            }
          }
          const message = req.body.message;
          const quotedMessageId = req.body.quotedMessageId; // Optional: for reply/quoted message

          // console.log("[Reply Debug] quotedMessageId:", quotedMessageId);
          // console.log("[Reply Debug] Has quotedMessageId:", !!quotedMessageId);

          // If quotedMessageId is provided, send as reply (quoted message)
          if (quotedMessageId) {
            // console.log("[Reply] Attempting to send quoted message with ID:", quotedMessageId);
            try {
              // Extract _serialized string if quotedMessageId is an object
              let messageId = quotedMessageId;
              if (typeof quotedMessageId === 'object' && quotedMessageId._serialized) {
                messageId = quotedMessageId._serialized;
                // console.log("[Reply] Extracted _serialized:", messageId);
              }
              
              // Get the message to reply to
              // console.log("[Reply] Getting message by ID:", messageId);
              const quotedMsg = await waClient.getMessageById(messageId);
              // console.log("[Reply] Got quoted message:", quotedMsg ? "SUCCESS" : "NULL");
              if (quotedMsg) {
                // Send reply using message.reply()
                quotedMsg
                  .reply(message)
                  .then(async (response) => {
                    // console.log("[Reply] Message sent successfully");
                    // console.log("[Reply] Response hasQuotedMsg:", response.hasQuotedMsg);
                    
                    // Ensure quotedMsg data is included in response for database storage
                    if (response.hasQuotedMsg && !response.quotedMsg) {
                      try {
                        const qmMsg = await response.getQuotedMessage();
                        const qmMedia = qmMsg.hasMedia ? await qmMsg.downloadMedia() : null;
                        response.quotedMsg = {
                          qm_body: qmMsg,
                          body: qmMsg.body || "",
                          sender: qmMsg._data?.notifyName || "You",
                          qm_base64: qmMedia ? qmMedia.data : "-"
                        };
                        // console.log("[Reply] Added quotedMsg to response");
                      } catch (e) {
                        // console.log("[Reply] Error adding quotedMsg:", e.message);
                      }
                    }
                    
                    res.status(200).json({
                      status: true,
                      response: response,
                    });
                    return saveToSentLog(response, req);
                  })
                  .catch(async (error) => {
                    await errorLogger("messageRoutes #sendQuotedMessage" + error, win);
                    res.status(500).json({
                      status: false,
                      response: error,
                    });
                  });
              } else {
                // Quoted message not found, send as normal message
                waClient
                  .sendMessage(number, message)
                  .then((response) => {
                    res.status(200).json({
                      status: true,
                      response: response,
                    });
                    return saveToSentLog(response, req);
                  })
                  .catch(async (error) => {
                    await errorLogger("messageRoutes #sendMessageText" + error, win);
                    res.status(500).json({
                      status: false,
                      response: error,
                    });
                  });
              }
            } catch (error) {
              // Error getting quoted message, send as normal message
              waClient
                .sendMessage(number, message)
                .then((response) => {
                  res.status(200).json({
                    status: true,
                    response: response,
                  });
                  return saveToSentLog(response, req);
                })
                .catch(async (error) => {
                  await errorLogger("messageRoutes #sendMessageText" + error, win);
                  res.status(500).json({
                    status: false,
                    response: error,
                  });
                });
            }
          } else {
            // Normal message (no reply)
            // Check if this is a forwarded message
            const isForwarded = req.body.isForwarded || false;
            const options = isForwarded ? { isForwarded: true } : {};
            
            waClient
              .sendMessage(number, message, options)
              .then((response) => {
                // Add isForwarded flag to response for database storage
                if (isForwarded) {
                  response.isForwarded = true;
                  // Also set in _data for database storage
                  if (response._data) {
                    response._data.isForwarded = true;
                  }
                }
                
                res.status(200).json({
                  status: true,
                  response: response,
                });
                return saveToSentLog(response, req);
              })
              .catch(async (error) => {
                await errorLogger("messageRoutes #sendMessageText" + error, win);
                res.status(500).json({
                  status: false,
                  response: error,
                });
              });
          }
        } else {
          return res.status(400).json({
            status: false,
            message: "WACSA belum diinisialisasi atau belum terhubung",
          });
        }
      } catch (error) {
        await errorLogger(
          "messageRoutes #appExpressSendMediaText" + error,
          win
        );
        return res.status(400).json({
          status: false,
          message: "WACSA API mengalami masalah. " + error,
        });
      }
    }
  );

  // Endpoint untuk resolve LID ke nomor asli
  appExpress.post(
    "/api/lid-lookup",
    [auth, body("lid").notEmpty()],
    async (req, res) => {
      try {
        const isConnectedClient = await waState(waClient);
        if (isConnectedClient === "CONNECTED") {
          const errors = validationResult(req).formatWith(({ msg }) => {
            return msg;
          });

          if (!errors.isEmpty()) {
            return res.status(400).json({
              success: false,
              message: "LID tidak boleh kosong",
            });
          }

          const lid = req.body.lid;
          
          // Validate LID format — accept both @lid and @g.us (groups)
          if (!lid.endsWith('@lid') && !lid.endsWith('@g.us') && !lid.endsWith('@broadcast')) {
            return res.status(400).json({
              success: false,
              message: "Format LID tidak valid (harus diakhiri dengan @lid, @g.us, atau @broadcast)",
            });
          }

          try {
            // Get contact by LID
            const contact = await waClient.getContactById(lid);
            
            if (!contact) {
              return res.status(404).json({
                success: false,
                message: "Contact tidak ditemukan untuk LID ini",
              });
            }

            // Extract real phone number
            // Try multiple fields to get the real number
            let realNumber = null;
            
            if (contact.id && contact.id.user) {
              realNumber = contact.id.user;
            } else if (contact.number) {
              realNumber = contact.number;
            } else if (contact.id && contact.id._serialized) {
              // Extract from serialized format (e.g., "6281234567890@c.us")
              const serialized = contact.id._serialized;
              if (serialized.includes('@c.us')) {
                realNumber = serialized.replace('@c.us', '');
              }
            }

            if (!realNumber) {
              return res.status(404).json({
                success: false,
                message: "Tidak dapat mengekstrak nomor telepon dari contact",
              });
            }

            // Get server number from config to validate
            const serverNumber = config?.ServerWA?.Number || '';
            
            // Don't return server number
            if (serverNumber && realNumber === serverNumber) {
              return res.status(400).json({
                success: false,
                message: "LID ter-resolve ke nomor server (invalid)",
              });
            }

            return res.status(200).json({
              success: true,
              phone: realNumber,
              name: contact.name || contact.pushname || null,
              isGroup: contact.isGroup || false,
            });

          } catch (contactError) {
            await errorLogger("messageRoutes #lidLookupGetContact" + contactError, win);
            return res.status(500).json({
              success: false,
              message: "Gagal mengambil data contact: " + contactError.message,
            });
          }

        } else {
          return res.status(400).json({
            success: false,
            message: "WACSA belum diinisialisasi atau belum terhubung",
          });
        }
      } catch (error) {
        await errorLogger("messageRoutes #lidLookup" + error, win);
        return res.status(500).json({
          success: false,
          message: "WACSA API mengalami masalah: " + error.message,
        });
      }
    }
  );

  appExpress.post(
    "/message/send-media",
    [auth, body("number").notEmpty()],
    async (req, res) => {
      try {
        const isConnectedClient = await waState(waClient);
        if (isConnectedClient === "CONNECTED") {
          const errors = validationResult(req).formatWith(({ msg }) => {
            return msg;
          });

          if (!errors.isEmpty()) {
            return res.status(422).json({
              status: false,
              message: "Nomor Telepon Masih Kosong",
            });
          }

          const rawNumber = req.body.number;
          const isGroupJid = typeof rawNumber === 'string' && (rawNumber.endsWith('@g.us') || rawNumber.endsWith('@broadcast'));
          const number = isGroupJid ? rawNumber : phoneNumberFormatter(rawNumber);
          if (!isGroupJid) {
            const isRegisteredNumber = await checkRegisteredNumber(number);
            if (!isRegisteredNumber) {
              return res.status(422).json({
                status: false,
                message: "Nomor Whatsapp tidak terdaftar",
              });
            }
          }

          const caption = req.body.message;
          const file = req.files.file;
          const media = new MessageMedia(
            file.mimetype,
            file.data.toString("base64"),
            file.name
          );

          waClient
            .sendMessage(number, media, { caption: caption })
            .then((response) => {
              res.status(200).json({
                status: true,
                response: response,
              });

              return saveToSentLog(response, req);
            })
            .catch(async (error) => {
              await errorLogger("messageRoutes #sendMessageMedia" + error, win);
              res.status(500).json({
                status: false,
                response: error,
              });
            });
        } else {
          return res.status(400).json({
            status: false,
            message: "WACSA belum diinisialisasi atau belum terhubung",
          });
        }
      } catch (error) {
        await errorLogger(
          "messageRoutes #appExpressSendMediaMessage" + error,
          win
        );
        return res.status(400).json({
          status: false,
          message: "WACSA API mengalami masalah. " + error,
        });
      }
    }
  );
}

module.exports = messageRoutes;
