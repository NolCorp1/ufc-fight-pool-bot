function extractWinnerAndLoser(completedFight) {
    const match = completedFight.match(/\*\*(.*?)\*\* def\. (.*?) by (.*)$/);
    if (match && match.length === 4) {
      const winner = match[1];
      const loser = match[2];
      return { winner, loser };
    }
    return null;
  }
  
  module.exports = { extractWinnerAndLoser };
  