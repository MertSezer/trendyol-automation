Feature('E2E_SMOKE');

Scenario('open trendyol homepage', async ({ I }) => {
  I.say('starting trendyol e2e smoke...');
  I.amOnPage('/');
  I.wait(2);

  await I.dismissPopups();

  const url = await I.grabCurrentUrl();
  I.say('URL=' + url);

  const title = await I.grabTitle();
  I.say('TITLE=' + title);

  I.saveScreenshot('e2e_smoke_trendyol.png');
});
