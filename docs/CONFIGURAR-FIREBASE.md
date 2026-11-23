# Ativar o modo online (Firebase) — passo a passo

Com o modo online, **toda a diretoria acessa os mesmos dados**, de qualquer celular ou computador, usando e-mail e senha.
O Firebase é um serviço do Google, e o plano gratuito (Spark) é mais que suficiente para o clube.

> ⏱️ Leva cerca de 15 minutos. Você só precisa de uma conta Google.
>
> 💸 **Custo zero:** use sempre o plano **Spark** (gratuito). Ele não pede cartão de crédito. **Nunca** clique em "Upgrade" nem escolha o plano **Blaze**: nada neste sistema precisa dele.

---

## 1. Criar o projeto

1. Acesse **https://console.firebase.google.com** e entre com sua conta Google.
2. Clique em **Criar um projeto** (ou *Adicionar projeto*).
3. Nome: `pinheiros-da-serra` → Continuar.
4. O Google Analytics pode ficar **desativado** → **Criar projeto**.

## 2. Ativar o login por e-mail e senha

1. No menu à esquerda: **Criação → Authentication** → **Vamos começar**.
2. Na aba **Método de login**, escolha **E-mail/senha**, ative a primeira opção e clique em **Salvar**.
3. Na aba **Configurações → Domínios autorizados**, clique em **Adicionar domínio** e coloque `nauberty.github.io`.

## 3. Criar o banco de dados

1. No menu: **Criação → Firestore Database** → **Criar banco de dados**.
2. Local: `southamerica-east1 (São Paulo)` → Avançar.
3. Escolha **Iniciar no modo de produção** → **Criar**.
4. Abra a aba **Regras**, apague tudo e cole o conteúdo do arquivo [`firestore.rules`](../firestore.rules) deste repositório. Depois clique em **Publicar**.

## 4. Liberar o primeiro acesso (você)

As regras só deixam entrar quem está na lista **acesso**. O primeiro e-mail é cadastrado à mão; os próximos você libera pelo próprio sistema.

1. No **Firestore Database**, aba **Dados**, clique em **+ Iniciar coleção**.
2. ID da coleção: `acesso` → Próxima.
3. ID do documento: **seu e-mail em letras minúsculas** (ex.: `fulano@gmail.com`).
4. Adicione dois campos:
   - nome `name`, tipo *string*, valor = seu nome
   - nome `role`, tipo *string*, valor = `executiva`
5. Clique em **Salvar**.

### Níveis de acesso

| Nível | O que acessa |
|---|---|
| **Diretoria executiva** (`executiva`) | Tudo: Painel, Pontuação, Controle de Membros, **Tesouraria** e Configurações |
| **Diretoria regular** (`regular`) | Painel, Pontuação e Controle de Membros. **Não vê a Tesouraria.** |

O bloqueio não é só visual: as próprias regras do banco impedem a diretoria regular de ler os dados financeiros.

## 5. Criar os logins da diretoria

1. **Authentication → Usuários → Adicionar usuário**.
2. Informe o e-mail e uma senha provisória. Repita para cada membro da diretoria.
3. No sistema, em **Configurações → Diretoria com acesso**, libere o e-mail de cada pessoa e escolha **Diretoria executiva** ou **Diretoria regular**.

> A pessoa pode trocar a senha pela opção **"Esqueci minha senha"** na tela de login.

## 6. Ligar o sistema ao Firebase

1. Na página inicial do projeto no Firebase, clique no ícone **`</>`** (Web) para registrar um app.
2. Apelido: `controle` → **Registrar app** (não precisa marcar o Hosting).
3. Vai aparecer um código com `const firebaseConfig = { ... }`. Copie **somente o objeto** entre as chaves.
4. No GitHub, abra o arquivo [`src/firebase-config.ts`](../src/firebase-config.ts), clique no lápis ✏️ para editar e troque `null` pelo objeto copiado, assim:

```ts
export const firebaseConfig: FirebaseOptions | null = {
  apiKey: 'AIza...',
  authDomain: 'pinheiros-da-serra.firebaseapp.com',
  projectId: 'pinheiros-da-serra',
  storageBucket: 'pinheiros-da-serra.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:abcdef',
};
```

5. Clique em **Commit changes**. Em cerca de 2 minutos o site atualizado já pede login.

> 🔒 Essas chaves **não são senhas** e podem ficar no repositório público. Quem protege os dados são as regras do passo 3: só e-mails liberados conseguem ler ou alterar alguma coisa.

## 7. Levar os dados do modo local para o online (se já usou o sistema)

1. **Antes** do passo 6, no navegador onde você lançou os dados, abra **Configurações → Baixar backup**.
2. Depois de fazer login no modo online: **Configurações → Restaurar backup** e escolha o arquivo.

---

## 8. Ativar o backup automático semanal

Siga o passo a passo em **[BACKUP.md](BACKUP.md#ativar-o-backup-automático-semanal)** (cerca de 5 minutos).

---

### Problemas comuns

| Mensagem | Solução |
|---|---|
| "E-mail ou senha incorretos" | Confira se o usuário foi criado em Authentication → Usuários. |
| "Acesso pendente" | O e-mail não está na coleção `acesso`, ou está com letras maiúsculas. |
| A Tesouraria não aparece | O nível da pessoa é `regular`. Uma pessoa da diretoria executiva pode mudar em Configurações. |
| A tela de login não abre ou dá erro de domínio | Adicione `nauberty.github.io` em Authentication → Configurações → Domínios autorizados. |
