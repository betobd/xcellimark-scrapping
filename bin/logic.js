#!/usr/bin/env node
/* eslint-disable no-magic-numbers */
/* eslint-disable no-undef */
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());
const hubSpot = require("../components/hubspot");
const response = require("../network/response");
const { writeLog } = require("../components/logger/mongoLogger");
const { log } = require("winston");
// const chromium = require('chromium');

const parseListingsFromData = (data, sourceName = "Unknown") => {
  if (!data) return [];

  console.log(`[DEBUG] Attempting to parse listings from ${sourceName} (Length: ${data.length})...`);

  let listingsArray = [];
  try {
    // If it's a string, try to parse it as JSON
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    listingsArray = Array.isArray(parsed) ? parsed : (parsed.listings || []);
  } catch (err) {
    console.warn(`[WARN] Failed to parse JSON data from ${sourceName}. falling back to regex extraction.`);
    // Fallback to regex if JSON parsing fails
    const regex = /detailsURL\s*:\s*["']([^"']+)["']/g;
    let match;
    while ((match = regex.exec(data)) !== null) {
      listingsArray.push({ detailsURL: match[1] });
    }
  }

  const urls = listingsArray
    .map(item => item.detailsURL || item.url || item.listingURL)
    .filter(url => url && url.includes("/idx/details/listing"));

  console.log(`[DEBUG] From ${sourceName}: Found ${urls.length} valid listing URLs.`);

  const uniqueLinks = [...new Set(urls)];
  console.log(`[DEBUG] Unique links identified from ${sourceName}: ${uniqueLinks.length}`);

  return uniqueLinks;
};

const pageDetails = async (browser, url) => {
  console.log(`[DEBUG] Extracting details from: ${url}`);
  let page;
  try {
    page = await browser.newPage();

    // Memory optimization: Block unnecessary resources
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Stealth plugin handles UA better, but we can still set a high-quality one
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );

    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    // Diagnostic logging for LightSail
    if (response) {
      console.log(`[DEBUG] HTTP Status: ${response.status()} for ${url}`);
    }

    const pageTitle = await page.title();
    if (pageTitle.toLowerCase().includes("challenge") || pageTitle.toLowerCase().includes("robot")) {
      console.warn(`[BOT-DETECTED] Page title suggests challenge: "${pageTitle}"`);
    }

    const data = await page.evaluate(() => {
      const safeText = (el) => el?.innerText?.trim() ?? "";

      // Get firm name
      const firm = Array.from(document.querySelectorAll("div"))
        .map((field) => field.innerText)
        .find((text) => text.includes("Listed by"))
        ?.match(/Listed by:\s*([^0-9\n\r]+)/)?.[1]
        ?.trim() ?? "";

      // Find the property section names and IDs
      const listIdProperties = [];
      for (let id = 1; id <= 15; id++) { // Increased range just in case
        try {
          const selector = `#IDX-detailsContainer-d003--${id} > #IDX-panel-heading-d003--${id} > .IDX-panel-title > .IDX-panel-collapse-toggle`;
          const propertieName = document.querySelector(selector)?.innerText;
          if (propertieName) listIdProperties.push({ id, propertieName });
        } catch { }
      }

      const getSectionId = (name) =>
        listIdProperties.find((p) => p.propertieName === name);

      const primaryFeaturesId = getSectionId("PRIMARY FEATURES");
      const interiorId = getSectionId("INTERIOR");
      const externalId = getSectionId("EXTERNAL");
      const locationId = getSectionId("LOCATION");
      const financialId = getSectionId("FINANCIAL");

      const getKeyPropertie = (id, type) => {
        const base = `#IDX-fieldsWrapper > #IDX-detailsContainer-d003--${id} > .IDX-panel-collapse > .IDX-panel-body > .IDX-fieldContainerList > .IDX-field`;
        const selector = type === "key" ? `${base} > .IDX-label` : `${base} > .IDX-text`;
        return Array.from(document.querySelectorAll(selector)).map((el) => safeText(el));
      };

      const mainDetailsKeys = Array.from(
        document.querySelectorAll("#IDX-detailsMainInfo > .IDX-panel-body > .IDX-field > .IDX-label")
      ).map((el) => safeText(el));

      const mainDetailsValues = Array.from(
        document.querySelectorAll("#IDX-detailsMainInfo > .IDX-panel-body > .IDX-field > .IDX-text")
      ).map((el) => safeText(el));

      const extractSection = (keys, values) =>
        keys.reduce((acc, key, idx) => {
          acc[key] = values[idx] ?? "";
          return acc;
        }, {});

      const result = {
        data: {},
        path: "",
        name: "",
        debugInfo: ""
      };

      result.data["main_details"] = JSON.stringify(extractSection(mainDetailsKeys, mainDetailsValues));
      result.data["primary_features"] = JSON.stringify(
        extractSection(
          primaryFeaturesId ? getKeyPropertie(primaryFeaturesId.id, "key") : [],
          primaryFeaturesId ? getKeyPropertie(primaryFeaturesId.id, "value") : []
        )
      );
      result.data["interior"] = JSON.stringify(
        extractSection(
          interiorId ? getKeyPropertie(interiorId.id, "key") : [],
          interiorId ? getKeyPropertie(interiorId.id, "value") : []
        )
      );
      result.data["external"] = JSON.stringify(
        extractSection(
          externalId ? getKeyPropertie(externalId.id, "key") : [],
          externalId ? getKeyPropertie(externalId.id, "value") : []
        )
      );
      result.data["location"] = JSON.stringify(
        extractSection(
          locationId ? getKeyPropertie(locationId.id, "key") : [],
          locationId ? getKeyPropertie(locationId.id, "value") : []
        )
      );
      result.data["financial"] = JSON.stringify(
        extractSection(
          financialId ? getKeyPropertie(financialId.id, "key") : [],
          financialId ? getKeyPropertie(financialId.id, "value") : []
        )
      );

      // Safe DOM access
      result.data["firm"] = firm;
      result.data["description"] = document.querySelector("#IDX-description")?.innerText ?? "";
      result.data["property_sub_type"] = document.querySelector(".IDX-field-propSubType .IDX-text")?.innerText ?? "";
      result.data["subdivision"] = document.querySelector(".IDX-field-subdivision .IDX-text")?.innerText ?? "";
      const images = Array.from(document.querySelectorAll(".IDX-carouselWrapper > a > img"))
        .map((e) => e?.getAttribute("data-src")?.trim() || e?.getAttribute("src")?.trim())
        .filter(Boolean);

      result.data["images"] = images.join(",");
      result.data["main_image"] = images[0] ?? "";

      // Re-trying multiple path selectors (MLS ID or similar)
      const pathSelectors = [
        "#IDX-detailsMainInfo > .IDX-panel-heading > .IDX-field > .IDX-text",
        ".IDX-details-mls-id",
        ".IDX-field-mlsNumber .IDX-text",
        "#IDX-details-listing-id"
      ];

      for (const selector of pathSelectors) {
        const found = document.querySelector(selector);
        if (found && found.innerText.trim()) {
          result.path = found.innerText.trim();
          break;
        }
      }

      result.name = document.querySelector("title")?.innerText ?? "No Title";

      const address = [
        ...Array.from(
          document.querySelectorAll("#IDX-detailsAddress > .IDX-psudolink > .IDX-detailsAddressInfo")
        ).map((e) => safeText(e)),
        ...Array.from(
          document.querySelectorAll("#IDX-detailsAddress > .IDX-psudolink > .IDX-detailsAddressLocationInfo")
        ).map((e) => safeText(e)),
      ];

      const getValue = (label) => mainDetailsValues[mainDetailsKeys.indexOf(label)] ?? "";

      result.data["status"] = getValue("Status");

      const rawPrice = getValue("Price");
      const price = rawPrice.replace(/[^0-9.]/g, "");
      result.data["price"] = Number(price || 0);

      const beds = getValue("Bedrooms");
      const baths = getValue("Total Baths");
      const sqft = getValue("SqFt").replace(/[^0-9.]/g, "");

      result.data["bd"] = Number(beds || 0);
      result.data["bth"] = Number(baths || 0);
      result.data["sqft"] = Number(sqft || 0);

      const formattedSqft = result.data["sqft"].toLocaleString("en-US");

      result.data["size"] = `${beds ? beds + " bd, " : ""}${baths ? baths + " bth, " : ""}${formattedSqft} sq. ft.`;

      result.data["address"] = address.join(" ").trim();

      // If still no path, store some debug info
      if (!result.path) {
        result.debugInfo = "Body classes: " + document.body.className +
          " | HTML summary: " + document.documentElement.innerHTML.substring(0, 500).replace(/\s+/g, ' ');
      }

      return result;
    });

    if (data.error || !data.path) {
      const htmlSnippet = await page.evaluate(() => document.body.innerText.substring(0, 300));
      console.log(`[DEBUG] Page Title: "${pageTitle}"`);
      console.log(`[DEBUG] Content Snippet: "${htmlSnippet.replace(/\n/g, ' ')}"`);
    }

    return data;
  } catch (err) {
    console.error(`[ERROR] in pageDetails for ${url}: `, err.message);
    return { error: err.message };
  } finally {
    if (page) await page.close();
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

const logic = async () => {
  const startTime = performance.now();
  console.log("[START] Starting integration logic...");

  let browser;
  try {
    const widgetUrls = [
      "https://bellacollina.idxbroker.com/idx/widgets/22225",
      "https://bellacollina.idxbroker.com/idx/widgets/143850",
      "https://bellacollina.idxbroker.com/idx/widgets/143851",
      "https://bellacollina.idxbroker.com/idx/widgets/109258",
    ];

    const existingListings = await getAllRows();
    console.log(`[HUBDB] Loaded ${existingListings.length} existing listings.`);

    browser = await puppeteer.launch({
      headless: "new", // Use the improved headless mode
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
        "--disable-blink-features=AutomationControlled", // Extra stealth
        "--window-size=1920,1080"
      ],
      defaultViewport: { width: 1920, height: 1080 }
    });

    // WARM-UP Phase for LightSail initialization
    console.log("[LOGIC] Warming up browser to prevent initial CPU bottlenecks...");
    const warmUpPage = await browser.newPage();
    try {
      await warmUpPage.goto("about:blank", { timeout: 30000 });
      await new Promise(r => setTimeout(r, 5000));
    } finally {
      await warmUpPage.close();
      console.log("[LOGIC] Warm-up complete. Starting widget processing.");
    }

    const allFoundLinks = new Set();
    const stats = {
      total: 0,
      success: 0,
      updated: 0,
      created: 0,
      skipped: 0,
      retired: 0,
      failed: 0,
      retryPass: 0
    };

    for (const url of widgetUrls) {
      console.log(`[WIDGET] Processing URL: ${url}`);
      const page = await browser.newPage();

      try {
        // Use networkidle2 for widgets to ensure Cloudflare challenge completes if it appears
        // and increase timeout for slow server responses on Lightsail
        await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

        // Extra wait for any async hydration
        await new Promise(r => setTimeout(r, 8000));

        const content = await page.evaluate(() => document.body.innerText || document.body.textContent || document.documentElement.outerHTML);

        console.log(`[WIDGET] Content captured. Length: ${content.length}. Snippet: ${content.substring(0, 500).replace(/\s+/g, ' ')}`);

        // Target specifically the 'listings' key in the widgetAttributes variable
        // Looking for: [ 'listings', JSON.stringify([ ... ]) ]
        const listingsMatch = content.match(/\[\s*['"]listings['"]\s*,\s*JSON\.stringify\((.*?)\)\s*\]/is);

        if (listingsMatch && listingsMatch[1]) {
          console.log(`[WIDGET] SUCCESS: Found listings data in widgetAttributes variable.`);
          const links = parseListingsFromData(listingsMatch[1], "widgetAttributes");
          links.forEach(link => {
            // Ensure absolute URL
            const absoluteLink = link.startsWith('http') ? link : `https://bellacollina.idxbroker.com${link}`;
            allFoundLinks.add(absoluteLink);
          });
        } else {
          console.warn(`[WIDGET] JSON data not found in widgetAttributes for ${url}. Trying general fallback...`);

          // General fallback (existing regex)
          const links = parseListingsFromData(content, "Full Content Fallback");
          if (links.length > 0) {
            links.forEach(link => {
              const absoluteLink = link.startsWith('http') ? link : `https://bellacollina.idxbroker.com${link}`;
              allFoundLinks.add(absoluteLink);
            });
          } else {
            // Final fallback: search for anything that looks like a listing URL
            const urlRegex = /["']((?:https?:\/\/bellacollina\.idxbroker\.com)?\/idx\/details\/listing\/[^"']+)["']/g;
            let match;
            let foundCount = 0;
            while ((match = urlRegex.exec(content)) !== null) {
              const link = match[1];
              const absoluteLink = link.startsWith('http') ? link : `https://bellacollina.idxbroker.com${link}`;
              allFoundLinks.add(absoluteLink);
              foundCount++;
            }
            if (foundCount > 0) {
              console.log(`[WIDGET] SUCCESS: Found ${foundCount} listing URLs via raw regex fallback.`);
            } else {
              console.error(`[WIDGET] FAILED to extract any listings from ${url}`);
            }
          }
        }
      } catch (err) {
        console.error(`[ERROR] Failed to process URL ${url}:`, err.message);
      } finally {
        await page.close();
      }
    }

    const linksArray = Array.from(allFoundLinks);
    stats.total = linksArray.length;
    console.log(`[SUMMARY] Total unique listings to process: ${stats.total}`);

    const listingsToKeep = new Set();
    const retryQueue = [];

    // Helper to process a single URL
    const processListing = async (listingUrl, passName = "Main") => {
      try {
        const currentPage = await pageDetails(browser, listingUrl);

        if (!currentPage || !currentPage.path || currentPage.error) {
          if (passName === "Main") {
            console.warn(`[SKIP] Listing failed in ${passName} pass, adding to retry queue: ${listingUrl}`);
            retryQueue.push(listingUrl);
          } else {
            console.error(`[FAIL] Listing failed again in ${passName} pass: ${listingUrl}`);
            stats.failed++;
          }
          return;
        }

        const { path, name, data: listingData } = currentPage;
        listingsToKeep.add(path.toLowerCase());

        const currentListing = existingListings.find(
          (e) => e.path && e.path.toLowerCase() === path.toLowerCase()
        );

        if (currentListing) {
          console.log(`[UPDATE] Updating ${path} (${passName} pass)`);
          await hubSpot.hubDb.upsert(
            process.env.TABLE_ID,
            listingData,
            path,
            name,
            currentListing.id
          );
          stats.updated++;
        } else {
          console.log(`[CREATE] Creating ${path} (${passName} pass)`);
          await hubSpot.hubDb.upsert(
            process.env.TABLE_ID,
            listingData,
            path,
            name
          );
          stats.created++;
        }
        stats.success++;
        if (passName === "Retry") stats.retryPass++;
      } catch (err) {
        console.error(`[ERROR] Exception processing listing ${listingUrl} (${passName} pass):`, err.message);
        if (passName === "Main") retryQueue.push(listingUrl);
        else stats.failed++;
      }
    };

    // Parallel execution with low concurrency for memory safety
    const concurrency = 2;
    console.log(`[LOGIC] Starting parallel processing with concurrency: ${concurrency}`);

    for (let i = 0; i < linksArray.length; i += concurrency) {
      const chunk = linksArray.slice(i, i + concurrency);
      console.log(`[PROGRESS] Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(linksArray.length / concurrency)}`);
      await Promise.all(chunk.map(url => processListing(url, "Main")));
    }

    // Pass 2: Retry Queue
    if (retryQueue.length > 0) {
      console.log(`\n[RETRY] Starting retry pass for ${retryQueue.length} listings...`);
      // Retrying sequentially to be extra memory-safe in this phase
      for (const url of retryQueue) {
        await processListing(url, "Retry");
      }
    }

    // Clean up stale listings
    const toRemove = existingListings
      .filter(item => item.path && !listingsToKeep.has(item.path.toLowerCase()))
      .map(item => item.id);

    if (toRemove.length > 0) {
      console.log(`[CLEANUP] Removing ${toRemove.length} stale listings.`);
      await hubSpot.hubDb.remove(process.env.TABLE_ID, toRemove);
    }

    // Final publishing
    console.log("[HS] Publishing table changes...");
    await hubSpot.hubDb.publish(process.env.TABLE_ID);

    // Final Stats
    const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`
=========================================
          EXECUTION SUMMARY
=========================================
Total unique listings:   ${stats.total}
Successfully processed:  ${stats.success}
  - New created:         ${stats.created}
  - Existing updated:    ${stats.updated}
  - Recovered on retry:  ${stats.retryPass}
Skipped/Failed total:    ${stats.total - stats.success}
Stale removed:           ${toRemove.length}
Total Duration:          ${totalDuration}s
=========================================
`);

  } catch (err) {
    console.error("[CRITICAL] Error during logic execution:", err);
  } finally {
    if (browser) await browser.close();
  }

  const duration = (performance.now() - startTime) / 1000;
  console.log(`[END] Integration finished in ${duration.toFixed(2)}s`);
};


const main = async (req, res, next) => {
  logic();
  return response.success(req, res, "Integration in process...");
};

module.exports = {
  parseListingsFromData,
  pageDetails,
  getAllRows,
  main,
  logic,
};
