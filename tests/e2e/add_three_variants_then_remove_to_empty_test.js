const fs = require('fs');
const path = require('path');

const {
  dismissBlockingOverlays,
  addCurrentVariantToCart,
  openCart,
  dumpCartState,
  assertCartPageLoaded,
  saveNamedScreenshot,
  assertCartHasAtLeastItems,
  assertCartLooksEmpty,
  removeCartItemsUntilCount,
  selectTopNColorVariants,
  selectColorVariantByIndex
} = require('../helpers/trendyol_variant_shared');

Feature('Trendyol - Add 3 variants then remove to empty');

function readDatasetFile() {
  const datasetEnv = process.env.DATASET || 'datasets/demo.txt';
  const abs = path.resolve(datasetEnv);

  if (!fs.existsSync(abs)) {
    throw new Error(`DATASET_NOT_FOUND=${abs}`);
  }

  const lines = fs
    .readFileSync(abs, 'utf8')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => x.startsWith('http'));

  if (lines.length === 0) {
    throw new Error(`DATASET_EMPTY=${abs}`);
  }

  return {
    abs,
    urls: lines
  };
}

Scenario('Add three variants, remove one, then empty cart', async ({ I }) => {
  const { abs, urls } = readDatasetFile();

  I.say(`DATASET=${abs}`);
  I.say(`URL_COUNT=${urls.length}`);

  let executed = false;

  for (let u = 0; u < urls.length; u++) {
    const url = urls[u];

    I.say(`OPEN [${u + 1}/${urls.length}] ${url}`);
    I.amOnPage(url);
    I.wait(2);

    await dismissBlockingOverlays(I);

    const currentUrl = await I.grabCurrentUrl();
    const title = await I.grabTitle();

    I.say(`CURRENT=${currentUrl}`);
    I.say(`TITLE=${title}`);

    if (!currentUrl.includes('-p-')) {
      I.say(`SKIP_NOT_PRODUCT=${currentUrl}`);
      continue;
    }

    saveNamedScreenshot(I, `variants3_${u + 1}_product.png`);

    const topVariants = await selectTopNColorVariants(I, 3);

    I.say(`TOP_VARIANTS_FOUND=${topVariants.length}`);
    I.say(`TOP_VARIANTS_SAMPLE=${topVariants.map(v => v.label).join(' | ')}`);

    if (!Array.isArray(topVariants) || topVariants.length < 3) {
      I.say('SKIP_NOT_ENOUGH_VARIANTS=true');
      continue;
    }

    executed = true;

    for (let i = 0; i < 3; i++) {
      I.say(`SELECT_VARIANT_${i + 1}=${topVariants[i].label}`);
      await selectColorVariantByIndex(I, i);
      await addCurrentVariantToCart(I);

      if (i < 2) {
        I.amOnPage(url);
        I.wait(2);
        await dismissBlockingOverlays(I);
      }
    }

    await openCart(I);
    await assertCartPageLoaded(I);
    await dumpCartState(I, 'after_three_variant_adds');
    await assertCartHasAtLeastItems(I, 3);
    saveNamedScreenshot(I, 'after_three_variants_in_cart.png');

    await removeCartItemsUntilCount(I, 2, 5);
    await dumpCartState(I, 'after_remove_one_variant');
    await assertCartHasAtLeastItems(I, 2);
    saveNamedScreenshot(I, 'after_remove_one_left_two.png');

    await removeCartItemsUntilCount(I, 0, 10);
    await dumpCartState(I, 'after_remove_to_empty');
    await assertCartLooksEmpty(I);
    saveNamedScreenshot(I, 'after_remove_to_empty.png');

    break;
  }

  if (!executed) {
    throw new Error('NO_SUITABLE_PRODUCT_WITH_3_VARIANTS_FOUND');
  }
});
