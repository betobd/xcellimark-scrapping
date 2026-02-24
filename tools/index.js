/* eslint-disable no-undef */
const puppeteer = require('puppeteer');
// const chromium = require('chromium');

const parseListings = html => {
  const splitted = html
    // eslint-disable-next-line no-magic-numbers
    .split('"')[15]
    .split('&quot;')
    .filter(e =>
      e.includes('https://bellacollina.idxbroker.com/idx/details/listing')
    );
  return splitted;
};

const pageDetails = async url => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    const [page] = await browser.pages();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 0 });
    const data = await page.evaluate(() => {
      let keys = Array.from(
        document.querySelectorAll(
          '.IDX-panel > .IDX-panel-body > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      keys = keys.concat(
        Array.from(
          document.querySelectorAll(
            '#IDX-fieldsWrapper > .IDX-panel > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
          )
        ).map(field => field.innerText)
      );

      let values = Array.from(
        document.querySelectorAll(
          '.IDX-panel > .IDX-panel-body > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      values = values.concat(
        Array.from(
          document.querySelectorAll(
            '#IDX-fieldsWrapper > .IDX-panel > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
          )
        ).map(field => field.innerText)
      );

      const description = document.querySelector('#IDX-description').innerText;

      const images = Array.from(
        document.querySelectorAll('.IDX-carouselWrapper > a > img')
      ).map(e => e.getAttribute('data-src').trim());

      const result = keys.reduce((acumulator, current) => {
        acumulator[current] = values[keys.indexOf(current)];
        return acumulator;
      }, {});

      result['description'] = description;
      result['images'] = images;
      return result;
    });

    await browser.close();
    return data;
  } catch (err) {
    console.error(err);
  }
};

(async function main() {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    const [page] = await browser.pages();

    await page.goto(
      'https://bellacollina.idxbroker.com/idx/widgetpreview.php?widgetid=22225&prime=true',
      { waitUntil: 'networkidle0', timeout: 0 }
    );
    const data = await page.evaluate(
      () => document.querySelector('.body-container-wrapper').outerHTML
    );

    const parsedListings = parseListings(data);

    for (const listing of parsedListings) {
      const currentPage = await pageDetails(listing);
      console.log(JSON.stringify(currentPage));
    }

    await browser.close();
  } catch (err) {
    console.error(err);
  }
})();
