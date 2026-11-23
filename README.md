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

### 👥 Controle de Membros
- **Ficha completa** de cada desbravador, com os mesmos campos do SGC: dados pessoais, contato e endereço, responsáveis, igreja, saúde (tipo sanguíneo, alergias, medicamentos), classe atual, classes concluídas, especialidades e investiduras.
- **Importação da planilha exportada do SGC** (CSV), com as colunas reconhecidas automaticamente.
- **Pendências do SGC**: toda alteração feita aqui fica registrada (campo, valor anterior, novo valor, quem alterou e quando) até alguém lançar no SGC e clicar em *Marcar como atualizado no SGC*.
- Percentual de preenchimento de cada ficha, idade e valor em aberto na tesouraria.

### 🌳 Unidades
Pau-Brasil, Cedro, Chorão e Ipê, cada uma com seu logo e sua cor.

### 🔐 Níveis de acesso (modo online)
| Nível | Acessa |
|---|---|
| Diretoria executiva | Tudo, inclusive **Tesouraria** e Configurações |
| Diretoria regular | Painel, Pontuação e Controle de Membros |

O bloqueio da Tesouraria vale também no banco de dados (ver `firestore.rules`), não só na tela.

### ⚙️ Configurações
- Nomes e cores das unidades, categorias e contagem regressiva para o Campori.
- Liberação de acesso para a diretoria.
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

## Publicar o site (GitHub Pages)

1. No GitHub, abra o repositório → **Settings** → **Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Pronto. A cada alteração na branch `main`, o site é publicado automaticamente em:
   **https://nauberty.github.io/Controle-Pinheiros-Da-Serra/**

Para acompanhar a publicação, abra a aba **Actions** do repositório.

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
