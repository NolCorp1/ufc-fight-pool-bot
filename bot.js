// ID: 1153858339151806524
// Invite Link: https://discord.com/oauth2/authorize?client_id=1153858339151806524&scope=bot&permissions=1

//working bot for UFC fight pool pick em
const Discord = require("discord.js");
const { Client, GatewayIntentBits, MessageAttachment, ActionRowBuilder, ButtonBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const { createCanvas, loadImage } = require('canvas');
const urlShortener = require('node-url-shortener');
const { supabase } = require('./supabaseClient');

const { token } = require("./config.json");
const { prefix } = require("./config.json");
const app = express();
const port = process.env.PORT || 3000;
const googleCseId = '74d3744699a0a4ed8';
const googleApiKey = 'AIzaSyDkeE0zpcPt-oGrfhOq3Km1LLtcMTqE4GM';


// Gateway Intents are so bot developers can choose which events their bot receives
// based on which data it needs to function.
// Partials allow you to receive the full data of the objects returned from each event
const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.DirectMessages,
        Discord.GatewayIntentBits.MessageContent,
        Discord.GatewayIntentBits.Guilds
    ], partials: [
        Discord.Partials.Message,
        Discord.Partials.Channel,
        Discord.Partials.GuildMember,
        Discord.Partials.User,
        Discord.Partials.GuildScheduledEvent
    ]
})


// Create an empty array to store fight information
const fights = [];
// Declare fightCard as a global variable
let fightCard = [];
// Create an object to store users' selections
const userSelections = {};
const orderedSelections = {};
const selectedFighters = {};

async function scrapeUFCEvents() {
  const url = 'https://en.wikipedia.org/wiki/List_of_UFC_events';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);

  const events = [];
  $('table.wikitable tr').each((_, row) => {
      const cols = $(row).find('td');
      if (cols.length > 0) {
          const eventName = $(cols[1]).text().trim();
          const date = $(cols[2]).text().trim();

          // Convert date to YYYY-MM-DD format
          const formattedDate = new Date(date).toISOString().split('T')[0];
          events.push({ eventName, date: formattedDate });
      }
  });

  // Insert events into the database
  for (const event of events) {
      const { data, error } = await supabase
          .from('events')
          .upsert({ event_name: event.eventName, event_date: event.date }, { onConflict: 'event_name' });

      if (error) {
          console.error('Error inserting event:', error.message);
      } else {
          console.log(`Event "${event.eventName}" added to database.`);
      }
  }
}

module.exports = { scrapeUFCEvents };

async function createFightPools() {
    const now = new Date();
    const twelveHoursLater = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

    const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .gte('event_date', now.toISOString().split('T')[0])
        .lte('event_date', twelveHoursLater.split('T')[0]);

    if (error) {
        console.error('Error fetching upcoming events:', error.message);
        return;
    }

    for (const event of events) {
        // Send a message in Discord
        const message = `Would you like to create a fight pool for "${event.event_name}"?`;
        const channel = // Your logic to identify the Discord channel;
        const button = // Logic to create a Discord button;

        await channel.send({
            content: message,
            components: [button],
        });

        console.log(`Sent fight pool creation message for event: ${event.event_name}`);
    }
}

module.exports = { createFightPools };


client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

app.get('/', (req, res) => {
  res.send('Bot is running');
});

app.listen(port, () => {
  console.log(`Bot web server running on port ${port}`);
});

// URL of the Wikipedia page with the table you want to scrape
const url = 'https://en.wikipedia.org/wiki/UFC_311';

// Function to scrape and process the UFC fight card data
async function scrapeUFCCard() {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Locate the specific table you want to scrape
    const table = $('table.toccolours').first();

    // Clear the existing data in the global fightCard array
    fightCard.length = 0;

    // Process the table rows to extract fight card data
    table.find('tr').each((index, row) => {
      if (index === 0) {
        // Skip the header row
        return;
      }

      const columns = $(row).find('td');
      const weightClass = $(columns[0]).text().trim();
      const fighter1 = $(columns[1]).text().trim();
      const vs = $(columns[2]).text().trim();
      const fighter2 = $(columns[3]).text().trim();

      // Check if all columns have content before adding to the fight card
      if (weightClass && fighter1 && vs && fighter2) {
        // You can customize this part to structure and store the data as needed
        fightCard.push({ weightClass, fighter1, vs, fighter2 });
      }
    });

    // Now fightCard contains an array of objects representing the scraped UFC fight card data
    return fightCard;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Function to fetch fighter image URL using Google Custom Search API
async function fetchFighterImageURL(query, retryCount = 3) {
  try {
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: googleApiKey,
        cx: googleCseId,
        q: query,
        searchType: 'image',
        num: 1, // Number of results (you can adjust as needed)
      },
      timeout: 10000, // Set a higher timeout value (in milliseconds)
    });

    // Extract the image URL from the API response
    const imageItems = response.data.items;
    if (imageItems && imageItems.length > 0) {
      return imageItems[0].link;
    } else {
      // Handle the case where no image is found
      return 'https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQERwdX1B0GvyUFYlnJb01K-sb0rrS2kaFQfKVlVbCB6px-hu7JRsJOMKfxgRPsmv5PYIJHUKio7Cgre4Y'; // You can use a placeholder image
    }
  } catch (error) {
    console.error('Error fetching image:', error);

    if (retryCount > 0 && error.response && error.response.status === 429) {
      console.log(`Retrying in ${Math.pow(2, 4 - retryCount)} seconds...`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, 4 - retryCount) * 1000));
      return fetchFighterImageURL(query, retryCount - 1);
    } else {
      // Handle errors gracefully
      return 'https://encrypted-tbn2.gstatic.com/licensed-image?q=tbn:ANd9GcQERwdX1B0GvyUFYlnJb01K-sb0rrS2kaFQfKVlVbCB6px-hu7JRsJOMKfxgRPsmv5PYIJHUKio7Cgre4Y';
    }
  }
}


async function recordPick(userId, serverId, fightId, selectedFighter, method = null) {
  // Insert or update the user's pick in the Supabase database
  const { error } = await supabase.from('picks').upsert({
    user_id: userId,
    server_id: serverId,
    fight_id: fightId,
    selected_fighter: selectedFighter,
    method,
  }, { onConflict: ['user_id', 'server_id', 'fight_id'] });

  if (error) {
    console.error('Error recording pick:', error.message);
    return 'Failed to record pick.';
  }

  return 'Pick recorded successfully!';
}

module.exports = { recordPick };


// Function to create fight pool polls
async function createPoll(channel, fightCard) {
  if (fightCard.length === 0) {
    channel.send('Error scraping UFC fight card. Please try again later.');
  } else {
    try {
      // Fetch image URLs for all fighters in parallel
      const fetchImagePromises = fightCard.map(async (fightInfo) => {
        const fighter1ImageURL = await fetchFighterImageURL(fightInfo.fighter1);
        const fighter2ImageURL = await fetchFighterImageURL(fightInfo.fighter2);
        return { ...fightInfo, fighter1ImageURL, fighter2ImageURL };
      });

      const allFightersData = await Promise.all(fetchImagePromises);

      // Create polls for each fight in the 'fightCard' array
      const pollMessages = [];

      // Declare variables outside the loop
      let fighterPollMessage, methodPollMessage;

      for (const fightInfo of allFightersData) {
        const weightclass = fightInfo.weightClass;
        const fighter1 = fightInfo.fighter1;
        const fighter2 = fightInfo.fighter2;
        const status = fightInfo.vs;
        const fighter1ImageURL = fightInfo.fighter1ImageURL;
        const fighter2ImageURL = fightInfo.fighter2ImageURL;

        // Load images using the canvas library
        const canvas = createCanvas(305, 200); // Adjust the size as needed
        const ctx = canvas.getContext('2d');

        // Load image 1
        const image1 = await loadImage(fighter1ImageURL);
        ctx.drawImage(image1, 0, 0, 150, 200); // Adjust the position and size as needed

        // Load image 2
        const image2 = await loadImage(fighter2ImageURL);
        ctx.drawImage(image2, 152, 0, 150, 200); // Adjust the position and size as needed

        // Create a buffer from the canvas
        const buffer = canvas.toBuffer();

        // Create a poll for this fight with buttons for fighter selection
        const fighterRow = new Discord.ActionRowBuilder().addComponents(
          new Discord.ButtonBuilder()
            .setCustomId(`${fightInfo.fighter1}`)
            .setLabel(`${fightInfo.fighter1}`)
            .setStyle('Primary'), // Blue
          new Discord.ButtonBuilder()
            .setCustomId(`${fightInfo.fighter2}`)
            .setLabel(`${fightInfo.fighter2}`)
            .setStyle('Danger') // Red
        );

        // Create a poll for this fight with buttons for method of victory selection
        const methodRow = new Discord.ActionRowBuilder().addComponents(
          new Discord.ButtonBuilder()
            .setCustomId(`${fightInfo.fightid}_KO`)
            .setLabel(`KO`)
            .setStyle('Secondary') // Gray
            .setEmoji('👊'),
          new Discord.ButtonBuilder()
            .setCustomId(`${fightInfo.fightid}_Sub`)
            .setLabel(`Sub`)
            .setStyle('Success') // Green
            .setEmoji('🥋'),
          new Discord.ButtonBuilder()
            .setCustomId(`${fightInfo.fightid}_Dec`)
            .setLabel(`Dec`)
            .setStyle('Secondary') // Gray
            .setEmoji('👨‍🏫')
        );

        // Create a poll for this fight with buttons for fighter selection
        fighterPollMessage = await channel.send({
          embeds: [
            {
              color: 0x0099ff,
              title: `${fighter1} vs ${fighter2}`,
              description: `${weightclass}`,
            },
          ],
          components: [fighterRow],
          files: [{ attachment: buffer, name: `${fightInfo.fightid}_image.png` }],
        });

        methodPollMessage = await channel.send({ components: [methodRow] });

        pollMessages.push(fighterPollMessage, methodPollMessage);

        // Collect button interactions for fighter selection and prevent users from seeing others' choices
        const fighterFilter = (interaction) => interaction.customId;
        const fighterCollector = fighterPollMessage.createMessageComponentCollector({
          filter: fighterFilter,
        });

        fighterCollector.on('collect', async (interaction) => {
          const selectedFighter = interaction.customId;
          const userId = interaction.user.id;
          const fightId = `${fightInfo.fighter1} vs ${fightInfo.fighter2}`;
          const serverId = interaction.guild.id;
        
          // Save the pick in the database
          const result = await recordPick(userId, serverId, fightId, selectedFighter);
        
          console.log(result); // Log success or failure
        
          // Acknowledge the user's choice
          interaction.deferUpdate();
        });
        

        fighterCollector.on('end', () => {
          // Disable the buttons when the poll ends (if needed)
          fighterRow.components.forEach((button) => button.setDisabled(true));
          fighterPollMessage.edit({ components: [fighterRow] });
        });

        // Collect button interactions for method of victory selection and prevent users from seeing others' choices
        const methodFilter = (interaction) =>
          interaction.customId.includes('_KO') ||
          interaction.customId.includes('_Sub') ||
          interaction.customId.includes('_Dec');
        const methodCollector = methodPollMessage.createMessageComponentCollector({
          filter: methodFilter,
        });

        methodCollector.on('collect', async (interaction) => {
          const selectedMethod = interaction.customId.split('_')[1];
          const userId = interaction.user.id;
          const fightId = `${fightInfo.fighter1} vs ${fightInfo.fighter2}`;
          const serverId = interaction.guild.id;
        
          // Save the pick in the database
          const result = await recordPick(userId, serverId, fightId, null, selectedMethod);
        
          console.log(result); // Log success or failure
        
          // Acknowledge the user's choice
          interaction.deferUpdate();
        });
        

        methodCollector.on('end', () => {
          // Disable the buttons when the poll ends (if needed)
          methodRow.components.forEach((button) => button.setDisabled(true));
          methodPollMessage.edit({ components: [methodRow] });
        });
      }

    // Send the "View My Picks" button after all fight polls
    const viewMyPicksButton = new Discord.ActionRowBuilder().addComponents(
      new Discord.ButtonBuilder()
        .setCustomId('viewMyPicks')
        .setLabel('View My Picks')
        .setStyle('Secondary')
    );
    channel.send({ content: 'Click the button below to view your picks:', components: [viewMyPicksButton] });

    // Add the rules message after the "View My Picks" button
    const rulesMessage = '**__Rules__**\n**- Leaderboard goes by number of fight winners picked correctly**\n**- Tiebreaker is determined by amount of \'method of victories\' picked correctly**\n**- Make sure to click \'View My Picks\' button to confirm you made all Fighter and Method selections**';
    channel.send(rulesMessage);

    // Handle the "View My Picks" button interaction
    client.on('interactionCreate', async (interaction) => {
      if (interaction.isButton() && interaction.customId === 'viewMyPicks') {
        const userId = interaction.user.id;
        const serverId = interaction.guild.id;

        // Fetch the user's selections from Supabase
        const { data: userPicks, error } = await supabase
          .from('picks')
          .select('fight_id, selected_fighter, method')
          .eq('user_id', userId)
          .eq('server_id', serverId);

        if (error) {
          console.error('Error fetching picks:', error.message);
          interaction.reply({ content: 'Failed to fetch your picks.', ephemeral: true });
          return;
        }

        // Format the selections for display
        const orderedSelections = fightCard.map((fightInfo) => {
          const fightId = `${fightInfo.fighter1} vs ${fightInfo.fighter2}`;
          const userPick = userPicks.find((pick) => pick.fight_id === fightId);

          if (userPick) {
            return `${userPick.selected_fighter} - ${userPick.method || 'No Method'}`;
          } else {
            return 'No Selection';
          }
        });

        console.log('orderedSelections:', orderedSelections);

        // Count the number of fight winners and methods selected
        const winnersSelected = orderedSelections.filter(selection => selection !== 'No Selection').length;
        const methodsSelected = orderedSelections.filter(selection => selection.includes(' - ') && !selection.includes('No Method')).length;

        // Create a concise list of selections
        const selectionList = orderedSelections.join('\n');

        // Create the message content with the number of picks made and the total picks
        const messageContent = `**${winnersSelected}** out of **${fightCard.length}** Fight Winners selected.\n**${methodsSelected}** out of **${fightCard.length}** Winning Methods selected.\n\n${selectionList}`;

        // Send an ephemeral message with the user's selections and pick count
        if (winnersSelected > 0 || methodsSelected > 0) { // This checks if the user made any selections
          interaction.reply({
            content: messageContent,
            ephemeral: true,
          });
        } else {
          interaction.reply({
            content: 'You have not made any picks yet.',
            ephemeral: true,
          }).catch(console.error);
        }
      }
    });
        } catch (error) {
          console.error('Error:', error);
        }
      }
    }


// Command to show each user that has made selections and how many fight winner and method selections they have made
client.on('messageCreate', (message) => {
  if (message.content.startsWith(`${prefix}whosin`)) {
    let whosinMessage = '**Fellas who have made selections:**\n';
    
    // Create an object to store user selection counts
    const userSelectionCounts = {};

    for (const fightId in userSelections) {
      for (const userId in userSelections[fightId]) {
        const userSelection = userSelections[fightId][userId];

        if (!userSelectionCounts[userId]) {
          userSelectionCounts[userId] = { winners: 0, methods: 0 };
        }

        if (userSelection.winner) {
          userSelectionCounts[userId].winners++;
        }
        
        if (userSelection.method) {
          userSelectionCounts[userId].methods++;
        }
      }
    }

    // Format the user selection counts for output
    for (const userId in userSelectionCounts) {
      const { winners, methods } = userSelectionCounts[userId];
      const user = message.guild.members.cache.get(userId);
      
      if (user) {
        whosinMessage += `${user.displayName}: ${winners} Fight Winner picks, ${methods} Method picks\n`;
      }
    }

    if (whosinMessage === '**Fellas who have made selections:**\n') {
      whosinMessage += 'No selections made yet.';
    }

    message.channel.send(whosinMessage);
  }
});    



// Command to scrape fights
client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${prefix}scrapefights`) && message.member.permissions.has('ADMINISTRATOR')) {
    // Call the function to start scraping the UFC fight card
    const fightCard = await scrapeUFCCard();

    if (fightCard.length === 0) {
      message.channel.send('Error scraping UFC fight card. Please try again later.');
    } else {
      message.channel.send(`Scraped UFC fight card with ${fightCard.length} fights.`);
    }
  }
});

// Command to call create fight pool function
client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${prefix}createfightpool`) && message.member.permissions.has('ADMINISTRATOR')) {
    // Clear the fightCard and userSelections variables before creating new polls
    fightCard.splice(0, fightCard.length);
    for (const fightid in userSelections) {
      delete userSelections[fightid];
    }

    // Call a function to get the fight card data
      const scrapedFightCard = await scrapeUFCCard();

      if (scrapedFightCard.length === 0) {
        message.channel.send('Error scraping UFC fight card. Please try again later.');
      } else {
        // Call a function to create the poll with the endTime parameter and fightCard
        createPoll(message.channel, scrapedFightCard);
      }    
  }
});


// Command to show all users' selections for all fight polls
client.on('messageCreate', (message) => {
  if (message.content.startsWith(`${prefix}showselections`)&& message.member.permissions.has('ADMINISTRATOR')) {
    // Create an array to store all the fightids in order
    const allFightIds = [...new Set(fightCard.map((fight) => `${fight.fighter1} vs ${fight.fighter2}`))];

    const chunkSize = 5; // Number of fightids to display per message
    const totalChunks = Math.ceil(allFightIds.length / chunkSize);

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const startIndex = chunkIndex * chunkSize;
      const endIndex = startIndex + chunkSize;
      const currentChunk = allFightIds.slice(startIndex, endIndex);

      let selectionsMessage = '';

      // Iterate through the current chunk of fightids
      for (const fightid of currentChunk) {
        // Check if there are any selections for this fightid
        if (userSelections[fightid]) {
          selectionsMessage += `**\n${fightid}:\n**`;

          for (const userId in userSelections[fightid]) {
            const { winner, method } = userSelections[fightid][userId];
            const user = message.guild.members.cache.get(userId);
          
            if (user) {
              selectionsMessage += `${user.displayName} **: ** ${winner} - ${method}\n`;
            }
          }
        } else {
          // If there are no selections for this fightid, still include it in the message
          selectionsMessage += `**\n${fightid}:\n** No selections made yet\n`;
        }
      }

      // Send the selections message to the channel
      message.channel.send(selectionsMessage);
    }
  }
});

// Command to update and calculate user records
client.on('messageCreate', async (message) => {
  if (message.content.startsWith(`${prefix}update`)) {
    try {
      // Scrape the Wikipedia page to get the completed fight results
      const completedFights = await scrapeCompletedFights();

      if (completedFights.length === 0) {
        message.channel.send('No completed fights found.');
      } else {
        // Calculate user records based on the completed fights
        const userRecords = calculateUserRecords(completedFights, userSelections);

        // Output the completed fight results and user records
        const resultsMessage = `__**Results:**__\n${completedFights.join('\n')}\n\n__**Leaderboard:**__\n${userRecords.join('\n')}`;
        message.channel.send(resultsMessage);
      }
    } catch (error) {
      console.error('Error updating and calculating user records:', error);
    }
  }
});

// Function to scrape completed fight results from the Wikipedia page
async function scrapeCompletedFights() {
  try {
    const response = await axios.get(url); // Use the same URL as before
    const $ = cheerio.load(response.data);

    // Locate the specific table containing the fight results
    const table = $('table.toccolours').first();

    const completedFights = [];

    // Process the table rows to extract completed fight results
    table.find('tr').each((index, row) => {
      const columns = $(row).find('td');
      const vsText = $(columns[2]).text().trim();

      // Check if the fight is completed (column 2 contains "def.")
      if (vsText === 'def.') {
        const winner = $(columns[1]).text().trim();
        const loser = $(columns[3]).text().trim();
        const method = $(columns[4]).text().trim();
        completedFights.push(`**${winner}** def. ${loser} by ${method}`);
      }
    });

    return completedFights;
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

// Function to calculate user records based on completed fights
function calculateUserRecords(completedFights, userSelections) {
  const userRecords = {};

  // Iterate through completed fights
  completedFights.forEach((completedFight) => {
    const { winner } = extractWinnerAndLoser(completedFight);

    if (!winner) {
      return; // Skip incomplete fight results
    }

    // Iterate through user selections for this specific fight
    for (const fightId in userSelections) {
      const userIds = Object.keys(userSelections[fightId]);

      // Check if the winner's name matches any user's selection for this specific fight
      userIds.forEach((userId) => {
        const userSelection = userSelections[fightId][userId].winner;

        if (userSelection === winner) {
          // Update user's wins
          userRecords[userId] = userRecords[userId] || { wins: 0, losses: 0 };
          userRecords[userId].wins++;
        } else {
          // Update user's losses
          //userRecords[userId] = userRecords[userId] || { wins: 0, losses: 0 };
          //userRecords[userId].losses++;
        }
      });
    }
  });

  // Format user records as an array of objects
  const userRecordsArray = [];
  for (const userId in userRecords) {
    const { wins, losses } = userRecords[userId];
    const user = client.users.cache.get(userId);

    if (user) {
      userRecordsArray.push({ user, wins });
    }
  }

  // Sort user records by wins in descending order
  userRecordsArray.sort((a, b) => b.wins - a.wins);

  // Create a formatted result array
  const formattedUserRecords = userRecordsArray.map((record) => {
    return `${record.user.displayName}: ${record.wins}`;
  });

  return formattedUserRecords;
}



// Function to extract winner and loser from a completed fight string
function extractWinnerAndLoser(completedFight) {
  const match = completedFight.match(/\*\*(.*?)\*\* def\. (.*?) by (.*)$/);
  if (match && match.length === 4) {
    const winner = match[1];
    const loser = match[2];
    return { winner, loser };
  }
  return null;
}




client.login(token);