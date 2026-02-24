const puppeteer = require("puppeteer");
const logger = require("./components/logger/mongoLogger");

(async () => {
  // logger.writeLog("Test log", "info");

  const browser = await puppeteer.launch();
  const [page] = await browser.pages();
  await page.goto(
    "https://bellacollina.idxbroker.com/idx/details/listing/d003/G5063790/16046-Volterra-Point-Montverde-FL-34756?widgetReferer=true",
    { waitUntil: "domcontentloaded" }
  );
  const data = await page.evaluate(() => {
    search = Array.from(document.querySelectorAll("div")).map(
      (field) => field.innerText
    );

    return search
      .filter((e) => e.includes("Listed by"))[2]
      .split("\n")[0]
      .split(":")[1]
      .trim();
  });
  await browser.close();
  console.log(data);
})();
