const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://en.wikipedia.org/wiki/List_of_UFC_events'; // Replace with the actual URL

async function scrapeCompletedFights() {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const table = $('table.toccolours').first();
    const completedFights = [];

    table.find('tr').each((index, row) => {
      const columns = $(row).find('td');
      const vsText = $(columns[2]).text().trim();

      if (vsText === 'def.') {
        const winner = $(columns[1]).text().trim();
        const loser = $(columns[3]).text().trim();
        const method = $(columns[4]).text().trim();
        completedFights.push(`**${winner}** def. ${loser} by ${method}`);
      }
    });

    return completedFights;
  } catch (error) {
    console.error('Error scraping completed fights:', error);
    return [];
  }
}

module.exports = { scrapeCompletedFights };
