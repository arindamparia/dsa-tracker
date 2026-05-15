const https = require('https');

const HOST = 'algotracker.xyz';
const KEY = 'f1d2c3b4a5e64f7a8b9c0d1e2f3a4b5c';
const URL_TO_INDEX = `https://${HOST}/`;

const indexNowUrl = `https://www.bing.com/indexnow?url=${encodeURIComponent(URL_TO_INDEX)}&key=${KEY}`;

console.log(`Pinging IndexNow: ${indexNowUrl}`);

https.get(indexNowUrl, (res) => {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    console.log(`✅ Successfully pinged IndexNow for ${URL_TO_INDEX} (Status: ${res.statusCode})`);
  } else {
    console.error(`❌ Failed to ping IndexNow. Status code: ${res.statusCode}`);
  }
}).on('error', (e) => {
  console.error(`❌ Error pinging IndexNow: ${e.message}`);
});
