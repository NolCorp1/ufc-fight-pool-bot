const supabase = require('../supabaseClient');

async function whosin(message) {
  try {
    // Fetch all users who have joined the pool
    const { data: picks, error } = await supabase.from('picks').select('*');

    if (error) throw error;

    if (!picks || picks.length === 0) {
      message.channel.send('No one has joined the pool yet.');
      return;
    }

    // Group users by event or fight
    const usersByEvent = {};
    picks.forEach((pick) => {
      if (!usersByEvent[pick.event_id]) {
        usersByEvent[pick.event_id] = new Set();
      }
      usersByEvent[pick.event_id].add(pick.user_id);
    });

    // Format the response
    let response = '**Fight Pool Participants:**\n';
    for (const [eventId, users] of Object.entries(usersByEvent)) {
      response += `\n**Event:** ${eventId}\nParticipants:\n`;
      response += [...users].map((userId) => `- <@${userId}>`).join('\n');
    }

    message.channel.send(response);
  } catch (error) {
    console.error('Error fetching participants:', error);
    message.channel.send('Failed to fetch participants.');
  }
}

module.exports = { whosin };
