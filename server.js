const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos (index.html)
app.use(express.static(path.join(__dirname)));

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/start-capture', async (req, res) => {
  let browser;
  try {
    console.log('Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome'
    });
    console.log('Browser launched successfully');

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
            console.log('Events captured and saved');
          }
        } catch (e) {
          console.error('Error processing response:', e);
        }
      }
    });

    console.log('Navigating to eCrew...');
    await page.goto('https://crewroom.swiftair.com/eCrew', { waitUntil: 'networkidle2' });

    // Esperar un tiempo limitado para capturar datos
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log('Capture timeout reached');
        resolve();
      }, 60000); // 60 segundos
    });

    await browser.close();
    console.log('Browser closed');
    return res.json({ success: !!events });
  } catch (error) {
    console.error('Error in /start-capture:', error);
    if (browser) await browser.close();
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
