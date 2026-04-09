Feature("Trendyol - Top Colors Add/Remove Demo (POM)");

const PRODUCT_URLS = [
  "https://www.trendyol.com/dark-seer/beyaz-unisex-sneaker-p-42713792"
];

Scenario("Top colors -> select -> add to cart -> remove (per URL)", async ({ I }) => {
  I.say("TEST_STARTED");

  const validUrls = PRODUCT_URLS.filter(u => /^https?:\/\//i.test(u));
  if (!validUrls.length) {
    throw new Error("Gecerli URL yok.");
  }

  for (const url of validUrls) {
    I.say(`URL=${url}`);
    I.amOnPage(url);
    I.wait(5);

    const currentUrl = await I.grabCurrentUrl();
    const title = await I.grabTitle();

    I.say(`CURRENT_URL=${currentUrl}`);
    I.say(`PAGE_TITLE=${title}`);

    I.saveScreenshot(`pdp-debug-${Date.now()}.png`);
  }
});
