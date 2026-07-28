# ✦ MySocial · Painel de Social Media

Painel de trabalho touch-first para **social media freelancer** no iPad: cronograma de
publicações, roteiros, banco de ideias e mural de inspirações — tudo organizado
**por cliente**, em um lugar só.

O app **não edita imagens**. A arte é criada onde você preferir (Canva, Figma, Procreate)
e anexada ao post — aqui é onde o trabalho é planejado, escrito e acompanhado.

## Como usar no iPad

O app é um **PWA (Progressive Web App)** publicado em
[rubiooangelica-ai.github.io/Mysocial](https://rubiooangelica-ai.github.io/Mysocial/).
Abra no Safari do iPad e use **Compartilhar → Adicionar à Tela de Início**. Ele passa a
abrir em tela cheia, como app nativo, e **funciona offline** — os dados ficam salvos no
dispositivo (IndexedDB).

## Como está organizado

| Onde | O que faz |
|---|---|
| **Painel inicial** | A semana inteira de relance: posts dos próximos 7 dias por cliente, quantos aguardam aprovação, quantos estão sem data e quantas ideias esperam no banco |
| 📅 **Cronograma** | Visões mensal, semanal (com horários) e lista por status (Rascunho → Aprovado → Agendado → Publicado). Cada post guarda data, horário, formato (Feed, Carrossel, Stories, Reels), status, **legenda pronta para copiar** e a **arte final anexada da galeria**. Arraste um card para remarcar; filtre por cliente ou veja o cronograma geral |
| 📝 **Roteiros & Ideias** | Roteiros estruturados (Gancho / Desenvolvimento / CTA) e notas livres. Uma ideia vira post no cronograma com um toque, levando a legenda junto |
| 🎨 **Inspirações & Marca** | Mural de referências com anotações, links salvos e a marca do cliente (paleta com códigos copiáveis, fontes, logo e tom de voz) |
| ✨ **Assistente IA** | Cria a identidade visual do cliente de forma guiada — lê o mural, faz perguntas e propõe paleta, fontes e tom de voz — e pesquisa o nicho na web para sugerir posts com legenda e roteiro no tom da marca |

O assistente usa a API da Anthropic (Claude, multimodal + busca na web). A chave é colada
na aba *Assistente IA* e fica salva apenas no dispositivo.

## Desenvolvimento

```bash
npm install
npm run dev      # desenvolvimento
npm run build    # build de produção (dist/)
npm run preview  # servir o build localmente
```

Stack: React 19 + TypeScript + Vite, Zustand (estado), IndexedDB via idb-keyval
(persistência offline), service worker para funcionamento offline. Sem backend — tudo
local ao dispositivo. O deploy é automático a cada push, via GitHub Actions.

## Estrutura

```
src/
  types.ts        # modelos de dados (cliente, post, roteiro, arquivo)
  store.ts        # estado global + persistência IndexedDB + utilidades de data e imagem
  ai.ts           # integração com a API da Anthropic
  nav.ts          # navegação entre telas
  icons.tsx       # ícones de linha do app
  components/
    Home.tsx          # painel inicial: a semana e os clientes
    Project.tsx       # abas do cliente
    Calendar.tsx      # cronograma (3 visões, arrastar e soltar, ficha do post)
    GlobalCalendar.tsx# cronograma consolidado de todos os clientes
    Notes.tsx         # roteiros, notas e banco de ideias
    Inspirations.tsx  # mural de referências e marca do cliente
    Ai.tsx            # identidade guiada + pesquisa de ideias
```

## Ideias para o futuro

- Sincronização em nuvem entre dispositivos (hoje: local ao aparelho)
- Acesso de clientes para aprovação
- Publicação direta nas redes sociais
