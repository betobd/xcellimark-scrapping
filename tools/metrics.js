#!/usr/bin/env node
/* eslint-disable no-undef */
const puppeteer = require('puppeteer');
const hubSpot = require('../components/hubspot');
const { performance } = require('perf_hooks');
// const chromium = require('chromium');
// const os = require('os');
// const utils = require('os-utils');

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
      const mainDetailsKeys = Array.from(
        document.querySelectorAll(
          '#IDX-detailsMainInfo > .IDX-panel-body > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const mainDetailsValues = Array.from(
        document.querySelectorAll(
          '#IDX-detailsMainInfo > .IDX-panel-body > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const primaryFeaturesKeys = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--1 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const primaryFeaturesValues = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--1 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const interiorKeys = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--2 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const interiorValues = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--2 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const externalKeys = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--6 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const externalValues = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--6 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const locationKeys = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--3 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const locationValues = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--3 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const financialKeys = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--5 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-label'
        )
      ).map(field => field.innerText);

      const financialValues = Array.from(
        document.querySelectorAll(
          '#IDX-fieldsWrapper > #IDX-detailsContainer-d003--5 > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field > .IDX-text'
        )
      ).map(field => field.innerText);

      const description = document.querySelector('#IDX-description').innerText;

      const images = Array.from(
        document.querySelectorAll('.IDX-carouselWrapper > a > img')
      ).map(e => e.getAttribute('data-src').trim());

      const listingID = document.querySelector(
        '#IDX-detailsMainInfo > .IDX-panel-heading > .IDX-field > .IDX-text'
      ).innerText;

      const name = document.querySelector('title').innerText;

      let address = Array.from(
        // eslint-disable-next-line no-undef
        document.querySelectorAll(
          '#IDX-detailsAddress > .IDX-psudolink > .IDX-detailsAddressInfo'
        )
      ).map(e => e.innerText);

      address = address.concat(
        Array.from(
          document.querySelectorAll(
            '#IDX-detailsAddress > .IDX-psudolink > .IDX-detailsAddressLocationInfo'
          )
        ).map(e => e.innerText)
      );

      const result = {};

      result['main_details'] = `${JSON.stringify(
        mainDetailsKeys.reduce((acumulator, current) => {
          acumulator[current] =
            mainDetailsValues[mainDetailsKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['primary_features'] = `${JSON.stringify(
        primaryFeaturesKeys.reduce((acumulator, current) => {
          acumulator[current] =
            primaryFeaturesValues[primaryFeaturesKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['interior'] = `${JSON.stringify(
        interiorKeys.reduce((acumulator, current) => {
          acumulator[current] = interiorValues[interiorKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['external'] = `${JSON.stringify(
        externalKeys.reduce((acumulator, current) => {
          acumulator[current] = externalValues[externalKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['location'] = `${JSON.stringify(
        locationKeys.reduce((acumulator, current) => {
          acumulator[current] = locationValues[locationKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['financial'] = `${JSON.stringify(
        financialKeys.reduce((acumulator, current) => {
          acumulator[current] = financialValues[financialKeys.indexOf(current)];
          return acumulator;
        }, {})
      )}`;

      result['description'] = description;
      result['images'] = `${images}`;
      result['path'] = listingID;
      result['status'] = mainDetailsValues[mainDetailsKeys.indexOf('Status')];
      // eslint-disable-next-line no-magic-numbers
      result['main_image'] = images[0];
      result['price'] = mainDetailsValues[mainDetailsKeys.indexOf('Price')];
      const beds = mainDetailsValues[mainDetailsKeys.indexOf('Bedrooms')];

      result['name'] = name;

      let size = '';
      if (beds) size = beds + ' bd, ';
      const baths = mainDetailsValues[mainDetailsKeys.indexOf('Total Baths')];
      if (baths) size += baths + ' bth, ';
      size += mainDetailsValues[mainDetailsKeys.indexOf('SqFt')] + 'sq. ft.';
      result['size'] = size;

      result['address'] = address.reduce(
        (acumulator, current) => acumulator + current,
        ''
      );

      return result;
    });

    await browser.close();
    return data;
  } catch (err) {
    console.error(err);
  }
};

const getAllRows = async () => {
  let after;
  let existingListings = [];

  do {
    const rows = await hubSpot.hubDb.read(process.env.TABLE_ID, undefined, {
      after,
    });

    existingListings = existingListings.concat(await rows.results);

    after = rows.paging?.next?.after;
  } while (after);

  return existingListings;
};

// eslint-disable-next-line no-unused-vars
const setMark = name => {
  performance.mark('goto');
  // const cpuUsage = utils.cpuUsage(function (v) {
  //   console.log("CPU Usage (%): " + v);
  //   return v;
  // });

  // console.log(ramUsage);

  // return { cpuUsage, ramUsage };
};

(async function main() {
  try {
    console.log(process.pid);

    const existingListings = await getAllRows();
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });
    const [page] = await browser.pages();

    await page.goto(
      'https://bellacollina.idxbroker.com/idx/widgetpreview.php?widgetid=22225&prime=true',
      { waitUntil: 'domcontentloaded', timeout: 0 }
    );

    setMark('goto');

    const data = await page.evaluate(
      // eslint-disable-next-line no-undef
      () => document.querySelector('.body-container-wrapper').outerHTML
    );

    console.log(data);

    const parsedListings = parseListings(data);

    console.log(parsedListings);

    for (const listing of parsedListings) {
      const currentPage = await pageDetails(listing);
      const currentListing = existingListings.find(
        e => e.path.toLowerCase() === currentPage.path.toLowerCase()
      );

      const path = currentPage.path;
      delete currentPage.path;

      const name = currentPage.name;
      delete currentPage.name;

      if (currentListing) {
        hubSpot.hubDb.upsert(
          process.env.TABLE_ID,
          currentPage,
          path,
          name,
          currentListing.id
        );

        const index = existingListings.indexOf(currentListing);
        // eslint-disable-next-line no-magic-numbers
        if (index > -1) existingListings.splice(index, 1);
      } else {
        hubSpot.hubDb.upsert(process.env.TABLE_ID, currentPage, path, name);
      }

      setMark('pageDetails');
    }

    const toRemove = existingListings.map(e => e.id);

    hubSpot.hubDb.remove(process.env.TABLE_ID, toRemove);

    setMark('end');

    console.log(performance.now());

    console.log(performance.getEntries());

    // console.log(cpuUsage);
    // console.log(ramUsage);

    browser.close();
  } catch (err) {
    console.log(err);
  }
})();
