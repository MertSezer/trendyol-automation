const movieUrl =
  process.env.MOVIE_URL || 'https://www.imdb.com/title/tt0468569/';

Feature('IMDb live exploration');

Scenario('open the real page and let me interact in real time', ({ I }) => {
  I.amOnPage(movieUrl);
  pause();
});
