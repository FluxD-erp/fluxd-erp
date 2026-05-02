const express = require('express');
const router  = express.Router();
const { db }  = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// Stripe só inicializa se a chave existir (dev sem chave não quebra)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const PLANOS = {
  essencial: {
    priceId : process.env.STRIPE_PRICE_ESSENCIAL || 'price_placeholder_essencial',
    nome    : 'FluxD Essencial',
    valor   : 4700,
  },
  pro: {
    priceId : process.env.STRIPE_PRICE_PRO || 'price_placeholder_pro',
    nome    : 'FluxD Pro',
    valor   : 9700,
  },
  multi: {
    priceId : process.env.STRIPE_PRICE_MULTI || 'price_placeholder_multi',
    nome    : 'FluxD Multi',
    valor   : 19700,
  },
};

// ----------------------------------------------------------------
// POST /api/billing/create-checkout
// Cria sessão de checkout Stripe para o plano pro
// ----------------------------------------------------------------
router.post('/create-checkout', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos não configurados neste ambiente.' });

  const { plano = 'pro', empresa_id } = req.body;
  const price = PLANOS[plano];
  if (!price) return res.status(400).json({ error: 'Plano inválido.' });

  try {
    // Busca ou cria customer no Stripe vinculado à empresa
    const { data: empresa } = await db.from('empresas')
      .select('stripe_customer_id, nome, email_contato')
      .eq('id', empresa_id)
      .single();

    let customerId = empresa?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name  : empresa?.nome || 'Empresa FluxD',
        email : empresa?.email_contato || req.user?.email,
        metadata: { empresa_id },
      });
      customerId = customer.id;
      await db.from('empresas').update({ stripe_customer_id: customerId }).eq('id', empresa_id);
    }

    const session = await stripe.checkout.sessions.create({
      customer         : customerId,
      mode             : 'subscription',
      payment_method_types: ['card'],
      line_items       : [{ price: price.priceId, quantity: 1 }],
      success_url      : `${process.env.APP_URL || 'http://localhost:5173'}/planos?checkout=success`,
      cancel_url       : `${process.env.APP_URL || 'http://localhost:5173'}/planos?checkout=cancel`,
      metadata         : { empresa_id, plano },
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /api/billing/portal
// Abre portal de gerenciamento de assinatura Stripe
// ----------------------------------------------------------------
router.post('/portal', requireAuth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Pagamentos não configurados.' });

  const { empresa_id } = req.body;
  try {
    const { data: empresa } = await db.from('empresas')
      .select('stripe_customer_id').eq('id', empresa_id).single();

    if (!empresa?.stripe_customer_id)
      return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada.' });

    const session = await stripe.billingPortal.sessions.create({
      customer  : empresa.stripe_customer_id,
      return_url: `${process.env.APP_URL || 'http://localhost:5173'}/planos`,
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ----------------------------------------------------------------
// POST /api/billing/webhook
// Recebe eventos do Stripe (usar com raw body)
// ----------------------------------------------------------------
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) return res.sendStatus(200);

  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  try {
    event = secret
      ? stripe.webhooks.constructEvent(req.body, sig, secret)
      : JSON.parse(req.body);
  } catch (e) {
    return res.status(400).json({ error: `Webhook inválido: ${e.message}` });
  }

  const empresaId = event.data?.object?.metadata?.empresa_id;

  switch (event.type) {
    case 'checkout.session.completed': {
      const plano = event.data.object.metadata?.plano || 'pro';
      const planoValido = ['essencial', 'pro', 'multi'].includes(plano.toLowerCase())
        ? plano.toUpperCase()
        : 'PRO';
      if (empresaId) {
        await db.from('empresas').update({ plano: planoValido }).eq('id', empresaId);
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      if (empresaId) {
        await db.from('empresas').update({ plano: 'FREE' }).eq('id', empresaId);
      }
      break;
    }
  }

  res.sendStatus(200);
});

module.exports = router;
