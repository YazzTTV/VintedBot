const https = require('https');

https.get('https://fr.shein.com/pdsearch/sz2305296151462952/', (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  if (res.statusCode >= 300 && res.statusCode < 400) {
      console.log('Redirects to:', res.headers.location);
  } else {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
          const match = data.match(/url=(.*?)"/i);
          if (match) console.log('Meta refresh URL:', match[1]);
          else {
              // Try to find goods-p- in html
              const pMatch = data.match(/(https:\/\/fr\.shein\.com\/.*?p-\d+\.html)/i);
              if (pMatch) console.log('Found product URL:', pMatch[1]);
              else console.log('No URL found in HTML output length:', data.length);
          }
      });
  }
}).on('error', console.error);
