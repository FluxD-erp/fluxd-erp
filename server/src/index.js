require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const fs        = require('fs');
const rateLimit = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(process.env.APP_URL
    ? process.env.APP_URL.split(',').map(u => u.trim()).filter(Boolean)
    : []),
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS bloqueado: ${origin}`));
  },
  credentials: true,
}));

// Rate limiting — limites por IP
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

// Endpoints de auth/login mais restritivos
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.' },
});

app.use('/api', defaultLimiter);
app.use('/api/admin/invite-user', authLimiter);
// Webhook Stripe precisa de raw body — montar ANTES do express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Rotas
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api',            require('./routes/entidades'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/empresas',   require('./routes/empresas'));
app.use('/api/billing',    require('./routes/billing'));
app.get('/api/health',     (req, res) => res.json({ status: 'ok' }));

// Serve o build do frontend em produção
const distIndex = path.join(__dirname, '../../client/dist/index.html');
app.use(express.static(path.join(__dirname, '../../client/dist')));
app.get('*', (req, res) => {
  if (fs.existsSync(distIndex)) res.sendFile(distIndex);
  else res.send('Dev mode: acesse http://localhost:5173');
});

app.listen(PORT, () => console.log(`FluxD server rodando na porta ${PORT}`));
