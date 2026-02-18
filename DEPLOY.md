# 🚀 GUIA DE DEPLOY - BAZARAMZ

## Estrutura do Projeto

```
minha-loja/
├── index.html              ← Página principal da loja
├── admin.html              ← Painel administrativo
├── style.css               ← Estilos da loja
├── admin-style.css         ← Estilos do admin
├── script.js               ← Lógica da loja (produtos, carrinho, etc.)
├── auth-integration.js     ← Autenticação via Netlify Functions
├── admin-script.js         ← Lógica do painel admin
├── netlify.toml            ← Configuração do Netlify
├── package.json            ← Dependências das functions
├── .gitignore              ← Arquivos ignorados pelo Git
└── netlify/
    └── functions/          ← Backend serverless
        ├── register.js
        ├── login.js
        ├── get-products.js
        ├── create-order.js
        ├── get-orders.js
        ├── get-user-profile.js
        ├── admin-get-stats.js
        ├── admin-get-orders.js
        ├── admin-get-users.js
        ├── admin-create-product.js
        ├── admin-update-product.js
        ├── admin-delete-product.js
        ├── admin-delete-user.js
        └── admin-update-order-status.js
```

---

## PASSO 1 — MongoDB Atlas (Banco de Dados Gratuito)

1. Acesse https://www.mongodb.com/cloud/atlas/register
2. Crie uma conta gratuita (pode usar Google)
3. Clique em **"Build a Database"** → escolha **FREE (M0)**
4. Provider: **AWS** | Região mais próxima de você → **Create**

### Criar usuário do banco:
1. Menu esquerdo → **Database Access** → **ADD NEW DATABASE USER**
2. Username: `minhaloja`
3. Clique em **"Autogenerate Secure Password"** → **copie a senha!**
4. Privilege: **Atlas admin** → **Add User**

### Liberar acesso de rede:
1. Menu esquerdo → **Network Access** → **ADD IP ADDRESS**
2. Clique em **"ALLOW ACCESS FROM ANYWHERE"** → **Confirm**

### Pegar a string de conexão:
1. Menu esquerdo → **Database** → **Connect** → **Drivers**
2. Copie a string, que será parecida com:
   ```
   mongodb+srv://minhaloja:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. **Substitua `<password>` pela senha** que você copiou
4. **Adicione `/minhaloja` antes do `?`**:
   ```
   mongodb+srv://minhaloja:SUA_SENHA@cluster0.xxxxx.mongodb.net/minhaloja?retryWrites=true&w=majority
   ```
5. **Guarde essa string** — você vai usar ela logo

---

## PASSO 2 — GitHub

### Opção A: Interface Web (mais fácil)
1. Acesse https://github.com e faça login
2. Clique em **"New repository"** (botão verde)
3. Nome: `minha-loja` | Visibilidade: **Public** ou Private → **Create**
4. Na página do repositório vazio, clique em **"uploading an existing file"**
5. Arraste **todos os arquivos e a pasta `netlify/`** → **Commit changes**

### Opção B: Git no terminal
```bash
cd minha-loja
git init
git add .
git commit -m "Primeiro commit - BazaraMz"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/minha-loja.git
git push -u origin main
```

---

## PASSO 3 — Netlify (Deploy)

### Conectar com GitHub:
1. Acesse https://app.netlify.com
2. Clique em **"Add new site"** → **"Import an existing project"**
3. Escolha **GitHub** → autorize o acesso
4. Selecione o repositório **minha-loja**
5. Configurações de build:
   - **Build command:** deixe em branco (ou `echo done`)
   - **Publish directory:** `.` (ponto)
6. Clique em **"Deploy site"**

### Configurar variáveis de ambiente:
1. No painel do Netlify: **Site configuration** → **Environment variables**
2. Adicione estas duas variáveis:

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb+srv://minhaloja:SUA_SENHA@cluster0.xxxxx.mongodb.net/minhaloja?...` |
| `JWT_SECRET` | `uma-frase-longa-e-aleatoria-que-so-voce-conhece-2024!` |

3. Após salvar, vá em **Deploys** → **Trigger deploy** → **Deploy site**

---

## PASSO 4 — Criar Primeiro Admin

Após o deploy, você precisa criar um usuário admin no banco:

1. Acesse seu site e **crie uma conta normal** pela página de login
2. Abra o **MongoDB Atlas** → seu cluster → **Browse Collections**
3. Abra a collection **`users`**
4. Encontre seu usuário → clique no ícone de editar
5. Adicione o campo: `"isAdmin": true`
6. Salve → agora você pode acessar `/admin.html`

---

## PASSO 5 — Adicionar Produtos pelo Admin

1. Acesse `seu-site.netlify.app/admin.html`
2. Faça login com sua conta admin
3. Vá em **Produtos** → **Adicionar Produto**
4. Preencha nome, preço, descrição, URL da imagem e especificações
5. Salve — o produto aparecerá na loja automaticamente

> **Dica:** Para imagens, você pode usar URLs do Google Drive, Imgur, ou qualquer serviço de hospedagem de imagens.

---

## Resolvendo Problemas Comuns

**As functions não funcionam:**
- Verifique se a pasta `netlify/functions/` foi enviada ao GitHub
- Confirme que `MONGODB_URI` e `JWT_SECRET` estão configurados no Netlify
- Veja os logs em: Netlify → **Functions** → clique na function com erro

**Erro ao fazer login:**
- Confirme que a string de conexão MongoDB está correta
- Verifique se o IP está liberado no Atlas (deve ser 0.0.0.0/0)

**Admin não aparece:**
- Confirme que o campo `isAdmin: true` foi adicionado ao usuário no MongoDB Atlas
- Faça logout e login novamente após alterar

**Imagens não aparecem:**
- Use URLs completas (começando com `https://`)
- Certifique-se de que a pasta `images/` foi enviada ao GitHub

---

## Deploy Direto no Netlify (sem GitHub)

Se preferir, pode fazer o deploy direto:

1. Acesse https://app.netlify.com
2. Arraste a **pasta inteira `minha-loja`** para a área de deploy
3. Configure as variáveis de ambiente (passo 3)
4. ⚠️ Para atualizar o site depois, precisará arrastar novamente

**Recomendação:** Use o GitHub — é mais fácil atualizar depois.

---

## Checklist Final

- [ ] MongoDB Atlas criado e string de conexão salva
- [ ] Repositório GitHub com todos os arquivos
- [ ] Site publicado no Netlify
- [ ] Variáveis `MONGODB_URI` e `JWT_SECRET` configuradas
- [ ] Primeiro usuário admin criado no MongoDB
- [ ] Produtos adicionados pelo painel admin
- [ ] Teste de compra realizado com sucesso

---

> **URL do seu site:** `https://nome-gerado.netlify.app`  
> Você pode configurar um domínio personalizado em **Domain settings** no Netlify.
