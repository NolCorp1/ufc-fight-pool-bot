const { scrapeCompletedFights } = require('../utils/scrapeCompletedFights');
const { calculateUserRecords } = require('../utils/calculateUserRecords');

async function update(message, userSelections, client) {
  try {
    const completedFights = await scrapeCompletedFights();

    if (completedFights.length === 0) {
      message.channel.send('No completed fights found.');
    } else {
      const userRecords = calculateUserRecords(completedFights, userSelections, client);

      const resultsMessage = `__**Results:**__\n${completedFights.join('\n')}\n\n__**Leaderboard:**__\n${userRecords.join('\n')}`;
      message.channel.send(resultsMessage);
    }
  } catch (error) {
    console.error('Error updating and calculating user records:', error);
    message.channel.send('Failed to update and calculate user records.');
  }
}

module.exports = { update };
