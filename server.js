const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/start-capture', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    let events = null;

    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('CrewSchedule')) {
        try {
          const text = await response.text();
          const eventsMatch = text.match(/var\s+Events\s*=\s*\[\{.*?\}\]/);
          if (eventsMatch) {
            events = JSON.parse(eventsMatch[0].replace(/var\s+Events\s*=\s*/, ''));
            fs.writeFileSync('Events.json', JSON.stringify(events, null, 2));
          }
        } catch (e) {
          console.error('Error processing response:', e);
        }
      }
    });

    await page.goto('https://crewroom.swiftair.com/eCrew', { waitUntil: 'networkidle2' });

    await new Promise((resolve) => {
      browser.on('disconnected', () => {
        resolve();
      });
    });

    await browser.close();
    return res.json({ success: !!events });
  } catch (error) {
    if (browser) await browser.close();
    return res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});