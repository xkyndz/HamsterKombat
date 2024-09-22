const fs = require('fs');
const fetch = require('node-fetch');
const chalk = require('chalk');

// Path to the file containing query_id
const queryFilePath = './query.txt';

// Initialize a variable to hold the grand total of token balances
let grandTotalTokenBalance = 0;

// Function to print the welcome message
function print_welcome_message() {
    console.log(`
 ____  __.       ________                       
|    |/ _|___.__.\\______ \\_______  ____ ______  
|      < <   |  | |    |  \\_  __ \\/  _ \\\\____ \\ 
|    |  \\ \\___  | |    \`   \\  | \\(  <_> )  |_> >
|____|__ \\/ ____|/_______  /__|   \\____/|   __/ 
        \\/\\/             \\/             |__|         
    `);

    console.log(chalk.green.bold("HamsterKombat Cek Allocation $HMSTR"));
    console.log(chalk.yellow.bold("Join Telegram Channel: https://t.me/KyDrop"));

}

// Function to get Bearer token using query_id as initDataRaw
async function getToken(initDataRaw) {
  const url = 'https://api.hamsterkombatgame.io/auth/auth-by-telegram-webapp';
  const headers = {
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
    'Origin': 'https://hamsterkombatgame.io',
    'Referer': 'https://hamsterkombatgame.io/',
    'User-Agent': 'Mozilla/5.0',
    'accept': 'application/json',
    'content-type': 'application/json',
  };
  const data = JSON.stringify({ initDataRaw });

  try {
    const res = await fetch(url, { method: 'POST', headers, body: data });
    if (res.ok) {
      const result = await res.json();
      return result.authToken;
    } else {
      console.error(chalk.red(`Error fetching token: ${res.status}`));
      const errorData = await res.json();
      console.error(chalk.red('Response body:'), errorData);
      return null;
    }
  } catch (error) {
    console.error(chalk.red('Error occurred while fetching token:'), error);
    return null;
  }
}

// Function to sync token data for a single Bearer token
async function syncTokenData(bearerToken) {
  try {
    const syncApiUrl = 'https://api.hamsterkombatgame.io/interlude/sync';
    const accountInfoApiUrl = 'https://api.hamsterkombatgame.io/auth/account-info';

    // First, fetch the account info and display the name
    const accountResponse = await fetch(accountInfoApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (accountResponse.ok) {
      const accountData = await accountResponse.json();
      if (accountData.accountInfo && typeof accountData.accountInfo.name !== 'undefined') {
        const name = accountData.accountInfo.name;
        console.log(chalk.blue.bold(`Success. ${name} ✔️`));
      } else {
        console.error(chalk.red('Account name not found in the response.'));
      }
    } else {
      console.error(chalk.red(`Failed to fetch account info: ${accountResponse.status} ${accountResponse.statusText}`));
      const errorData = await accountResponse.text();
      console.error(chalk.red('Response body:'), errorData);
    }

    // Now, sync token data from interlude/sync endpoint
    const syncResponse = await fetch(syncApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (syncResponse.ok) {
      const syncData = await syncResponse.json();
      if (syncData.interludeUser.tokenBalance && typeof syncData.interludeUser.tokenBalance.total !== 'undefined') {
        let totalTokenBalance = syncData.interludeUser.tokenBalance.total;
        const roundedTotalBalance = (totalTokenBalance / 1e9).toFixed(9);  // 9 decimal places
        console.log(chalk.green.bold(`\nTotal $HMSTR : ${roundedTotalBalance}`));

        // Display additional fields: claimed, unclaimed, nextUnlocked
        const claimedTokens = syncData.interludeUser.tokenBalance.claimed;
        const unclaimedTokens = syncData.interludeUser.tokenBalance.unclaimed;
        const nextUnlockedTokens = syncData.interludeUser.tokenBalance.nextUnlocked;

        // Convert and round the unclaimed and nextUnlocked tokens
        const roundedUnclaimed = (unclaimedTokens / 1e9).toFixed(9);
        const roundedNextUnlocked = (nextUnlockedTokens / 1e9).toFixed(9);

        console.log(chalk.green(`Claimed        : ${claimedTokens}`));
        console.log(chalk.green(`Next unlock    : ${roundedNextUnlocked}`));
        console.log(chalk.green(`Unclaimed      : ${roundedUnclaimed}`));

        grandTotalTokenBalance += totalTokenBalance;
      } else {
        console.error(chalk.red('Total token balance not found in the response.'));
      }
    } else {
      console.error(chalk.red(`Failed to sync token data: ${syncResponse.status} ${syncResponse.statusText}`));
      const syncErrorData = await syncResponse.text();
      console.error(chalk.red('Response body:'), syncErrorData);
    }
  } catch (error) {
    console.error(chalk.red('Error occurred:'), error);
  }
}

// Function to read multiple query_ids from query.txt file
function readQueryIdsFromFile() {
  try {
    const queryContent = fs.readFileSync(queryFilePath, 'utf-8');
    return queryContent.split('\n').map(query => query.trim()).filter(query => query);  // Ensure to remove extra newlines or spaces
  } catch (error) {
    console.error(chalk.red(`Error reading ${queryFilePath}:`), error);
    return [];
  }
}

// Main function to get token using query_ids and process them one by one
async function main() {
  // Call the welcome message function when the script starts
  print_welcome_message();

  const queryIds = readQueryIdsFromFile();

  if (queryIds.length === 0) {
    console.error(chalk.red('No query_ids found in query.txt'));
    return;
  }

  for (const [index, queryId] of queryIds.entries()) {
    console.log(chalk.yellow(`\n➤ Processing Account No-${index + 1} ⚡`));

    const bearerToken = await getToken(queryId);

    if (bearerToken) {
      await syncTokenData(bearerToken);
    } else {
      console.error(chalk.red('Failed to retrieve Bearer Token.'));
    }
  }

  // Once all tokens are processed, display the grand total (rounded to 3 decimal places)
  const roundedGrandTotal = (grandTotalTokenBalance / 1e9).toFixed(3);
  console.log(chalk.green.bold(`\nGrand Total Token Balance $HMSTR: ${roundedGrandTotal}`));
}

// Call the main function
main();
