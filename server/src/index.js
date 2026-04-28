require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
];
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

// Rotas
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api',           require('./routes/entidades'));
app.use('/api/financeiro',require('./routes/financeiro'));
app.use('/api/admin',     require('./routes/admin'));
app.get('/api/health',    (req, res) => res.json({ status: 'ok' }));

// Serve o build do frontend em produção
const distIndex = path.join(__dirname, '../../client/dist/index.html');
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (req, res) => {
  if (fs.existsSync(distIndex)) res.sendFile(distIndex);
  else res.send('Dev mode: acesse http://localhost:5173');
});

app.listen(PORT, () => console.log(`FluxD server rodando na porta ${PORT}`));
