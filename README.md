# ✦ MySocial · Estúdio de Social Media

App touch-first para **gestão de social media freelancer** no iPad: editor visual de posts,
calendário de conteúdo e notas/roteiros — tudo organizado em **projetos por cliente**,
num único lugar (em vez de Canva + Google Agenda + bloco de notas).

## Como usar no iPad

O app é um **PWA (Progressive Web App)**: depois de publicado em qualquer hosting estático
(Vercel, Netlify, Cloudflare Pages…), abra no Safari do iPad e use
**Compartilhar → Adicionar à Tela de Início**. Ele passa a abrir em tela cheia, como app
nativo, e **funciona offline** — todos os dados ficam salvos no dispositivo (IndexedDB).

## Módulos

| Módulo | O que faz |
|---|---|
| 🗂️ **Projetos** | Um projeto por empresa/cliente, com Kit de Marca próprio (paleta, fontes, logo, elementos, tom de voz) e subpastas opcionais por tipo de conteúdo |
| 🎨 **Editor** | Templates por formato (Feed 1:1 e 4:5, Story 9:16, capa de Reels), camadas editáveis (texto, imagem, formas, ícones) com mover/redimensionar/girar/opacidade/ordem, kit de marca no painel lateral, redimensionamento automático entre formatos, templates personalizados e exportação PNG/JPG em alta resolução |
| 📅 **Calendário** | Visões mensal, semanal (com horários) e lista por status (Rascunho → Aprovado → Agendado → Publicado), cards com miniatura do design, drag-and-drop entre dias, filtro por projeto e **calendário geral consolidado** |
| 📝 **Notas & Roteiros** | Notas livres, roteiros estruturados (Gancho / Desenvolvimento / CTA), vínculo ideia → roteiro → design → data, banco de ideias soltas |
| ✨ **Assistente de IA** | Criação **guiada** de identidade visual a partir de inspirações anexadas (a IA pergunta antes de propor; a proposta é editável e vira o Kit de Marca) e **Pesquisar ideias**: analisa a pasta do projeto, pesquisa o nicho na web e sugere posts com copy e roteiro no tom de voz da marca, montando rascunho automático no Editor |

O assistente usa a API da Anthropic (Claude, multimodal + busca na web). Cole sua chave de
API na aba *Assistente IA* — ela fica salva apenas no dispositivo.

## Desenvolvimento

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção (dist/)
npm run preview  # servir o build localmente
```

Stack: React 19 + TypeScript + Vite, Zustand (estado), IndexedDB via idb-keyval
(persistência offline), canvas 2D para renderização/exportação dos designs, service worker
para funcionamento offline. Sem backend — tudo local ao dispositivo.

## Estrutura

```
src/
  types.ts        # modelos de dados (projeto, design, camadas, post, nota…)
  store.ts        # estado global + persistência IndexedDB + assets
  render.ts       # renderizador canvas (miniaturas e exportação PNG/JPG)
  designOps.ts    # criação de designs, redimensionamento automático, rascunhos da marca
  ai.ts           # integração com a API da Anthropic
  nav.ts          # navegação entre telas
  components/
    Home.tsx          # grade de projetos
    Project.tsx       # abas do projeto (Editor/Calendário/Notas/IA)
    BrandKitSheet.tsx # kit de marca
    DesignList.tsx    # designs e templates do projeto
    DesignEditor.tsx  # editor visual de camadas
    Calendar.tsx      # calendário (3 visões + drag-and-drop)
    GlobalCalendar.tsx# visão consolidada de todos os clientes
    Notes.tsx         # notas, roteiros e vínculos
    Ai.tsx            # identidade visual guiada + pesquisa de ideias
```

## Roadmap futuro

- Sincronização em nuvem entre dispositivos (hoje: local + exportação manual)
- Multiusuário / acesso de clientes
- Publicação direta nas redes sociais
