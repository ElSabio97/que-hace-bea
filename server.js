const express = require('express');
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

// Ruta para iniciar la captura (respuesta dummy para mantener compatibilidad)
app.post('/start-capture', (req, res) => {
  console.log('Capture process started');
  return res.json({ success: true });
});

// Ruta para guardar los eventos enviados por el script inyectado
app.post('/save-events', (req, res) => {
  try {
    const { events } = req.body;
    if (events) {
      fs.writeFileSync('Events.json', JSON.stringify(events, null, 2));
      console.log('Events captured and saved');
      return res.json({ success: true });
    } else {
      console.log('No events received');
      return res.status(400).json({ success: false, error: 'No events provided' });
    }
  } catch (error) {
    console.error('Error saving events:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
