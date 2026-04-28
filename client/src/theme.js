// Fonte única de verdade para cores usadas em JS puro
// (Recharts, react-hot-toast e qualquer lib que não leia Tailwind)
// Deve espelhar os valores definidos em tailwind.config.js

export const BRAND = {
  teal:      '#1A8DB5',  // unicri-orange → acento principal
  tealDark:  '#1279A0',  // unicri-orange-dark → hover
  tealLight: '#2BA8D4',  // unicri-orange-light
  navy:      '#1E3A5F',  // unicri-navy → fundo sidebar / texto primário
  navyLight: '#2D5086',
};

// Paleta de cores para gráficos de pizza / distribuição
// Primeiro item usa o acento da marca
export const CHART_COLORS = [
  BRAND.teal,
  BRAND.navy,
  '#10B981', // emerald
  '#F59E0B', // amber
  '#6366F1', // indigo
  '#EC4899', // pink
  '#14B8A6', // teal-400
  '#8B5CF6', // violet
];
