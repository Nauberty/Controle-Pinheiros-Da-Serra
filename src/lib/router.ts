export type Route = 'painel' | 'pontuacao' | 'campori' | 'tesouraria' | 'membros' | 'configuracoes';

export function navigate(r: Route) {
  window.location.hash = '/' + r;
}
