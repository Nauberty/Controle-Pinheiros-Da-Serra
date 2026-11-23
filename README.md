<p align="center">
  <img src="public/logo.png" width="140" alt="Pinheiros da Serra" />
</p>

<h1 align="center">Controle Pinheiros da Serra</h1>

<p align="center">
  Sistema de <b>pontuação das unidades</b> e <b>tesouraria</b> do Clube de Desbravadores Pinheiros da Serra · 12ª Região APS
</p>

---

## O que o sistema faz

### 🏆 Pontuação das unidades
- Ranking automático das unidades, com 1º, 2º, 3º e 4º lugar.
- Lançamento de pontos **ganhos ou perdidos**, com categoria (pontualidade, uniforme, Bíblia etc.), data e descrição.
- Um mesmo lançamento pode ir para **várias unidades de uma vez**.
- Histórico completo com filtros por unidade, categoria e mês, e com edição e exclusão.
- Resumo por categoria e saldo dos últimos 30 dias.

### 💰 Tesouraria
- **Cobranças** (ex.: *Campori 2027 – R$ 350,00 por pessoa*): você escolhe quem deve pagar e pode dar valor diferente para alguém (bolsa ou desconto).
- Situação de cada pessoa: **Pago**, **Parcial** ou **Pendente**, com quanto falta.
- **Pagamentos** por **Pix, 7me, dinheiro, cartão**, aceitando parcelas.
- **Despesas** do clube, com categoria e evento relacionado.
- Entradas, saídas, saldo em caixa, valor a receber e total recebido por forma de pagamento.
- Exportação para planilha (CSV que abre no Excel).

### 👥 Controle de Membros (diretoria executiva)
- **Cadastro manual por unidade** (botão ao lado de cada unidade): nome completo e idade obrigatórios, foto, documentos (CPF, RG/certidão), contato, responsável, tipo sanguíneo, condições de saúde, alergias, medicamentos e **vacinação** (lista do Calendário Nacional e situação da caderneta).
- Ficha completa com abas: Dados cadastrais · Saúde e vacinação · Endereço e família · Igreja e clube · **Financeiro** · SGC.
- **Financeiro do membro:** cobranças, valores pagos, em aberto e histórico de pagamentos, com registro de pagamento direto pela ficha. A ficha também abre pela Tesouraria → **Por membro**.
- Importação da planilha do SGC (CSV) e **pendências do SGC**: toda alteração fica registrada até ser lançada lá.
- A foto é reduzida (~20 KB) e guardada na própria ficha, sem custo de armazenamento.

### ⛺ Atividades Campori
- Lista de tarefas da preparação para o Campori, com categoria, responsável, unidade e prazo.
- Marcar e desmarcar como concluída, com o percentual de conclusão e as atividades atrasadas em destaque.
- Acesso de **toda a diretoria**.

### 🌳 Unidades
Pau-Brasil, Cedro, Chorão e Ipê, cada uma com seu logo e sua cor.

### 🔐 Níveis de acesso (modo online)
| Nível | Acessa |
|---|---|
| Diretoria executiva | Tudo, inclusive **Tesouraria** e Configurações |
| Diretoria regular | Pontuação das Unidades e Atividades Campori |

O bloqueio da Tesouraria vale também no banco de dados (ver `firestore.rules`), não só na tela.

### 🛡️ Segurança dos dados (custo zero)
- **Lixeira:** tudo o que for excluído pode ser restaurado.
- **Backup automático semanal**, criptografado, guardado no GitHub por 90 dias.
- Backup manual a qualquer momento, e cópia automática antes de qualquer restauração.
- Planos gratuitos sem cartão de crédito, por isso sem risco de cobrança.

👉 Detalhes e como ativar: **[docs/BACKUP.md](docs/BACKUP.md)**

### ⚙️ Configurações
- Nomes e cores das unidades, categorias e contagem regressiva para o Campori.
- Troca das senhas de acesso (somente Diretoria Executiva). Usuários só podem ser criados ou excluídos no console do Firebase.
- Backup completo (baixar e restaurar).

Funciona no computador e no celular. No celular dá para "Adicionar à tela inicial" e usar como um aplicativo.

---

## Sem servidor

| Parte | Onde fica | Custo |
|---|---|---|
| Site (as telas) | GitHub Pages | Grátis |
| Dados compartilhados | Firebase (Google) | Grátis no plano Spark |

### Modos de funcionamento

- **Modo local** (padrão, sem configurar nada): os dados ficam salvos **apenas no navegador** de quem usa. Serve para testar.
- **Modo online**: toda a diretoria acessa com e-mail e senha e vê os mesmos dados em tempo real. Também funciona sem internet e sincroniza quando a conexão volta.

👉 Para ativar o modo online, siga o passo a passo em **[docs/CONFIGURAR-FIREBASE.md](docs/CONFIGURAR-FIREBASE.md)** (cerca de 15 minutos).

---

## Endereço do sistema

### 👉 https://pinheirosdaserra.vercel.app

- Hospedado na **Vercel** (plano Hobby, gratuito). Cada alteração enviada à branch `main` é publicada sozinha.
- Endereço reserva: https://nauberty.github.io/Controle-Pinheiros-Da-Serra/ (GitHub Pages, publicado pelo workflow `deploy.yml`).
- Os dois endereços precisam estar em **Firebase → Authentication → Configurações → Domínios autorizados**.

---

## Para desenvolvedores

```bash
npm install
npm run dev      # abre em http://localhost:5173
npm run build    # gera a versão final em dist/
```

Tecnologias: React + TypeScript + Vite; Firebase (Authentication + Cloud Firestore); ícones Lucide.

```
src/
  pages/          telas (Painel, Pontuação, Tesouraria, Membros, Configurações)
  components/     formulários e componentes visuais
  data/           camada de dados (modo local e modo online/Firebase)
  lib/            cálculos de ranking e finanças, formatação, exportação
  firebase-config.ts   ← onde se cola a configuração do Firebase
firestore.rules   regras de segurança do banco
```

Os valores em dinheiro são guardados em centavos, para evitar erros de arredondamento.
