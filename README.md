# Catálogo Estático (Netlify + Decap CMS)

- **Hospedagem**: Netlify
- **CMS**: Decap (Netlify CMS)
- **Dados**: `data/products.json` (editado pelo CMS)
- **Carrinho**: LocalStorage (orçamento) com WhatsApp/Email/Copiar/PDF

## Como usar
1. Faça **Fork** ou suba este repositório no GitHub.
2. Conecte no **Netlify** (Deploy com 1 clique).
3. Em *Site settings → Identity*, ative **Identity** e **Git Gateway** (para login no CMS).
4. Acesse `/admin` e cadastre os produtos (arquivo único com lista).
5. O site lê `data/products.json` e renderiza cards com os preços.

> Importante: Este projeto **não tem checkout**. O carrinho apenas gera um orçamento.

## Customizações rápidas
- Cores e layout: `assets/styles.css`
- Lógica de filtros/carrinho: `js/app.js`
- Schema dos produtos (campos): `admin/config.yml`
