require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
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
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de autenticação. Tente novamente em 15 minutos.' },
});

app.use('/api', defaultLimiter);
app.use('/api/admin/invite-user', authLimiter);
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas
app.use('/api/dashboard',  require('./routes/dashboard'));
app.use('/api',            require('./routes/entidades'));
app.use('/api/financeiro', require('./routes/financeiro'));
app.use('/api/admin',      require('./routes/admin'));
app.use('/api/empresas',   require('./routes/empresas'));
app.use('/api/billing',           require('./routes/billing'));
app.use('/api/contas-bancarias',  require('./routes/contasBancarias'));
app.use('/api/inter',             require('./routes/inter'));
app.use('/api/recebiveis-cartao', require('./routes/recebiveis'));
app.get('/api/health',            (req, res) => res.json({ status: 'ok' }));

// Só faz listen quando executado diretamente (não em serverless)
if (require.main === module) {
  app.listen(PORT, () => console.log(`FluxD server rodando na porta ${PORT}`));
}

module.exports = app;
