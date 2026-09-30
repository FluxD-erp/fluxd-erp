// registerSW.js — gerado manualmente porque vite-plugin-pwa com autoUpdate
// força location.reload() em toda aba aberta ao detectar update, o que faz
// o app "recarregar" toda vez que o usuário troca de aba após o SW acordar.
//
// Estratégia: detecta o novo SW, marca como `waiting`, e só ativa quando
// o usuário recarregar a página (ou fechar e abrir). Sem reload forçado.

if ('serviceWorker' in navigator) {
  // Garante que o SW novo (status 'waiting') só ative via skipWaiting
  // quando o usuário recarregar a página manualmente.
  let waitingWorker = null;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Dispara quando um novo SW assume o controle. Se o usuário não tiver
    // acabado de recarregar, ignora. Isso evita reload em background.
    // (Não recarregamos automaticamente.)
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Se já existe um SW esperando (porque houve update entre carregamentos),
      // ativa agora — usuário está recarregando, então é seguro.
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        return;
      }

      // Detecta novos SW quando eles aparecem
      reg.addEventListener('updatefound', () => {
        const newSw = reg.installing;
        if (!newSw) return;

        newSw.addEventListener('statechange', () => {
          if (newSw.state === 'installed' && navigator.serviceWorker.controller) {
            // SW novo instalado, mas o antigo ainda controla. Guarda referência
            // e ativa no próximo reload natural (sem forçar agora).
            waitingWorker = newSw;
            // Não chama postMessage aqui — só ativa quando o usuário recarregar.
          }
        });
      });

      // Antes da página ser recarregada, se houver SW novo esperando,
      // ativa ele. Assim o próximo carregamento já vem com a versão nova,
      // sem reload duplo.
      window.addEventListener('beforeunload', () => {
        if (waitingWorker) {
          waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    } catch (err) {
      // Falha silenciosa — app funciona sem SW
      console.warn('[FluxD] Service Worker não registrado:', err);
    }
  });
}
