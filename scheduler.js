require('dotenv').config();
const axios = require('axios');

(async () => {
  try {
    const url = process.env.URL;
    console.log(await axios.get(url));
  } catch (e) {
    e.message === "HTTP request failed"
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e);
  }
})();
