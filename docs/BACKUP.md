# Segurança dos dados e custo zero

Este documento explica como os dados do clube ficam protegidos contra perda e por que o sistema **não gera nenhum custo**.

---

## 💸 Custo: zero

| Serviço | Plano | Custo |
|---|---|---|
| GitHub (código, site e backups) | Gratuito (repositório público) | R$ 0 |
| Firebase (login e banco de dados) | **Spark** (gratuito) | R$ 0 |

- O plano **Spark** do Firebase **não pede cartão de crédito**. Sem cartão cadastrado, não existe como haver cobrança.
- Se algum dia o uso passar do limite gratuito, o Firebase só **pausa** até o dia seguinte. Ele não cobra. Para um clube, o limite (50 mil leituras e 20 mil gravações por dia, 1 GB de dados) é muito maior que o necessário.
- ⚠️ **Nunca** clique em "Fazer upgrade" ou "Blaze" no Firebase, nem cadastre cartão. Nada neste sistema precisa disso.

---

## 🛡️ Camadas de proteção

### 1. Lixeira
Nada é apagado de verdade de primeira. Pontos, membros, pagamentos, despesas e cobranças excluídos vão para a **Lixeira** (Configurações → Lixeira), com data e autor da exclusão. Dá para **restaurar** com um clique. Só a diretoria executiva vê a lixeira e pode apagar algo definitivamente.

### 2. Funciona sem internet
O app fica guardado no celular e **abre mesmo sem internet**, depois de ter sido aberto uma vez com conexão. Os dados também ficam guardados em cada aparelho: dá para consultar e lançar pontos, pagamentos e atividades offline, e tudo é enviado sozinho quando a conexão voltar.

### 3. Backup automático semanal (modo online)
Toda **segunda-feira** o GitHub gera um backup completo do banco, **criptografado com senha**, e guarda por **90 dias** (cerca de 13 cópias). É de graça e roda sozinho.

### 4. Backup manual
Em **Configurações → Baixar backup**, qualquer pessoa da executiva baixa um arquivo com todos os dados. Guarde no Google Drive ou no e-mail.

- Antes de restaurar qualquer backup, o sistema **baixa automaticamente uma cópia dos dados atuais**.
- No modo local, o Painel avisa quando o último backup tiver mais de 7 dias.

### 5. Permissões
Só e-mails liberados acessam. A diretoria regular não lê nem altera a tesouraria. As regras ficam no próprio banco (`firestore.rules`).

---

## Ativar o backup automático semanal

> Faça isto **depois** de configurar o Firebase (docs/CONFIGURAR-FIREBASE.md). Leva cerca de 5 minutos.

### Passo 1: gerar a chave de acesso do backup (no Firebase)
1. No console do Firebase, clique na engrenagem ⚙️ → **Configurações do projeto** → aba **Contas de serviço**.
2. Clique em **Gerar nova chave privada** → **Gerar chave**. Um arquivo `.json` será baixado.
3. Abra esse arquivo no Bloco de Notas e copie **todo** o conteúdo.

> 🔒 Essa chave dá acesso total ao banco. **Não envie por WhatsApp nem e-mail, e não mande para ninguém, nem para o Claude.** Cole apenas no GitHub, no passo 2, e depois apague o arquivo do computador.

### Passo 2: cadastrar os segredos (no GitHub)
1. No repositório, abra **Settings → Secrets and variables → Actions → New repository secret**.
2. Crie o primeiro segredo:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Secret:** cole o conteúdo do arquivo `.json`.
3. Crie o segundo segredo:
   - **Name:** `BACKUP_PASSWORD`
   - **Secret:** invente uma senha forte, com pelo menos 10 caracteres.

> ⚠️ **Anote a `BACKUP_PASSWORD` em lugar seguro** (ex.: no caderno da secretaria e com mais uma pessoa da executiva). Sem ela, os backups automáticos não podem ser abertos.

### Passo 3: testar
1. Abra a aba **Actions** → **Backup semanal dos dados** → **Run workflow**.
2. Quando terminar (✅), clique na execução. Em **Artifacts** aparece o arquivo do backup.

---

## Como restaurar

1. **Backup automático:** em **Actions → Backup semanal dos dados**, abra a execução da data desejada e baixe o arquivo em **Artifacts** (vem em `.zip`; extraia o `.json`).
2. No sistema: **Configurações → Restaurar backup** → escolha o `.json`.
3. Se for um backup automático, o sistema pede a `BACKUP_PASSWORD`.

---

## Rotina recomendada

| Quando | O quê | Quem |
|---|---|---|
| Ao excluir algo por engano | Restaurar pela Lixeira | Diretoria executiva |
| Uma vez por mês | Baixar backup manual e guardar no Google Drive | Secretaria ou tesouraria |
| Antes do Campori | Baixar backup manual | Diretoria executiva |
| A cada 2 meses | Conferir se o backup semanal está rodando (aba Actions, ✅ verde) | Quem administra o GitHub |

> O GitHub pausa tarefas agendadas em repositórios sem nenhuma alteração por 60 dias e avisa por e-mail. Se receber esse aviso, abra **Actions → Backup semanal dos dados → Enable workflow**.
