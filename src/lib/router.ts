export type Route = 'painel' | 'pontuacao' | 'tesouraria' | 'membros' | 'configuracoes';

export function navigate(r: Route) {
  window.location.hash = '/' + r;
}
