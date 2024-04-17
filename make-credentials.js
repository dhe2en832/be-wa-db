const fs = require("fs/promises");

async function makeCredentials() {
  try {
    const credentials = {
      token: process.env.ACCESS_TOKEN,
      id: process.env.ACCESS_ID,
      password: process.env.ACCESS_PWD,
      wwebVersion: process.env.WWEB_VER,
    };
    await fs.writeFile("./src/credentials.json", JSON.stringify(credentials));
    process.exit(0);
  } catch (err) {
    console.log(err);
  }
}

makeCredentials();
