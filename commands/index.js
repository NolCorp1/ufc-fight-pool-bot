const { scrapeUFCEvents } = require('./scrapeUFCEvents');
const { createFightPools } = require('./createFightPools');
const { showSelections } = require('./showSelections');
const { update } = require('./update');
const { whosin } = require('./whosin');

function load(client) {
  client.on('messageCreate', (message) => {
    if (message.content.startsWith('!scrapefights')) {
      scrapeUFCEvents(message);
    } else if (message.content.startsWith('!createfightpool')) {
      createFightPools(message);
    } else if (message.content.startsWith('!showselections')) {
      showSelections(message);
    } else if (message.content.startsWith('!update')) {
      update(message);
    } else if (message.content.startsWith('!whosin')) {
      whosin(message);
    }
  });
}

module.exports = { load };
