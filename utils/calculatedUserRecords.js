const { extractWinnerAndLoser } = require('./extractWinnerAndLoser');

function calculateUserRecords(completedFights, userSelections, client) {
  const userRecords = {};

  completedFights.forEach((completedFight) => {
    const { winner } = extractWinnerAndLoser(completedFight);

    if (!winner) {
      return;
    }

    for (const fightId in userSelections) {
      const userIds = Object.keys(userSelections[fightId]);

      userIds.forEach((userId) => {
        const userSelection = userSelections[fightId][userId].winner;

        if (userSelection === winner) {
          userRecords[userId] = userRecords[userId] || { wins: 0, losses: 0 };
          userRecords[userId].wins++;
        }
      });
    }
  });

  const userRecordsArray = [];
  for (const userId in userRecords) {
    const { wins } = userRecords[userId];
    const user = client.users.cache.get(userId);

    if (user) {
      userRecordsArray.push({ user, wins });
    }
  }

  userRecordsArray.sort((a, b) => b.wins - a.wins);

  return userRecordsArray.map((record) => `${record.user.username}: ${record.wins}`);
}

module.exports = { calculateUserRecords };
