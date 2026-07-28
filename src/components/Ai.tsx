import { useState } from 'react'
import { getAssetUrl, useStore } from '../store'
import { useNav } from '../nav'
import { callClaude, dataUrlToImageBlock, extractJson, getApiKey, setApiKey, type AiMessage } from '../ai'
import { FONTS, type Project } from '../types'
import { I } from '../icons'

interface IdentityProposal {
  colors: string[]
  headingFont: string
  bodyFont: string
  style: string
  voice: string
}

interface Idea {
  title: string
  copy: string
  hook: string
  dev: string
  cta: string
}

const IDENTITY_SYSTEM =
  'Você é uma diretora de arte e estrategista de marca sênior, ajudando uma social media freelancer brasileira a definir a identidade visual de um cliente. Responda sempre em português do Brasil.'

export default function Ai({ project }: { project: Project }) {
  const updateBrand = useStore(s => s.updateBrand)
  const assets = useStore(s => s.assets)
  const notes = useStore(s => s.notes)
  const posts = useStore(s => s.posts)
  const addNote = useStore(s => s.addNote)
  const updateNote = useStore(s => s.updateNote)
  const addPost = useStore(s => s.addPost)
  const go = useNav(s => s.go)

  const [key, setKey] = useState(getApiKey())
  const [keyEditing, setKeyEditing] = useState(!getApiKey())

  const inspirations = assets.filter(a => a.projectId === project.id && a.kind === 'inspiration')
  const links = project.inspirationLinks ?? []

  type Phase = 'idle' | 'loadingQuestions' | 'answering' | 'generating' | 'proposal'
  const [phase, setPhase] = useState<Phase>('idle')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [proposal, setProposal] = useState<IdentityProposal | null>(null)
  const [error, setError] = useState('')

  const [searching, setSearching] = useState(false)
  const [ideas, setIdeas] = useState<{ idea: Idea; noteId: string; accepted: boolean }[]>([])

  const inspirationBlocks = async () => {
    const blocks: ReturnType<typeof dataUrlToImageBlock>[] = []
    for (const a of inspirations.slice(0, 8)) {
      const url = await getAssetUrl(a.id)
      if (url?.startsWith('data:image')) blocks.push(dataUrlToImageBlock(url))
    }
    return blocks
  }

  const inspirationNotes = inspirations
    .filter(a => a.note)
    .map(a => `- ${a.note}`)
    .join('\n')

  const startIdentity = async () => {
    setError('')
    setPhase('loadingQuestions')
    try {
      const imgs = await inspirationBlocks()
      const msg: AiMessage = {
        role: 'user',
        content: [
          ...imgs,
          {
            type: 'text',
            text:
              `Cliente: "${project.name}".\n` +
              (links.length ? `Links de referência: ${links.join(', ')}\n` : '') +
              (imgs.length
                ? 'As imagens acima são referências salvas pela usuária no mural do cliente.\n'
                : 'Nenhuma imagem de referência foi salva ainda.\n') +
              (inspirationNotes ? `Anotações dela sobre as referências:\n${inspirationNotes}\n` : '') +
              `Antes de propor qualquer identidade visual, você precisa entender a INTENÇÃO por trás das referências. ` +
              `Formule de 5 a 7 perguntas para a usuária sobre: tom de voz da marca, público-alvo, sensação que os posts devem transmitir, cores que ela gosta e não gosta, e quais referências mais representam a marca. ` +
              `Responda APENAS com JSON: {"questions": ["pergunta 1", ...]}`,
          },
        ],
      }
      const text = await callClaude({ system: IDENTITY_SYSTEM, messages: [msg] })
      const parsed = extractJson<{ questions: string[] }>(text)
      setQuestions(parsed.questions)
      setAnswers(parsed.questions.map(() => ''))
      setPhase('answering')
    } catch (e) {
      setError(String((e as Error).message ?? e))
      setPhase('idle')
    }
  }

  const generateIdentity = async () => {
    setError('')
    setPhase('generating')
    try {
      const imgs = await inspirationBlocks()
      const qa = questions.map((q, i) => `P: ${q}\nR: ${answers[i] || '(sem resposta)'}`).join('\n\n')
      const msg: AiMessage = {
        role: 'user',
        content: [
          ...imgs,
          {
            type: 'text',
            text:
              `Cliente: "${project.name}".\n` +
              (links.length ? `Links de referência: ${links.join(', ')}\n` : '') +
              `Respostas da usuária às suas perguntas:\n\n${qa}\n\n` +
              `Com base nas referências e nas respostas, gere uma proposta de identidade visual. ` +
              `As fontes DEVEM ser escolhidas desta lista: ${FONTS.join(', ')}. ` +
              `Responda APENAS com JSON:\n` +
              `{"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "headingFont": "...", "bodyFont": "...", "style": "resumo do estilo de elementos gráficos em 2-3 frases", "voice": "resumo de tom de voz e personalidade da marca em 3-4 frases"}`,
          },
        ],
      }
      const text = await callClaude({ system: IDENTITY_SYSTEM, messages: [msg] })
      setProposal(extractJson<IdentityProposal>(text))
      setPhase('proposal')
    } catch (e) {
      setError(String((e as Error).message ?? e))
      setPhase('answering')
    }
  }

  const confirmIdentity = () => {
    if (!proposal) return
    updateBrand(project.id, {
      colors: proposal.colors,
      headingFont: FONTS.includes(proposal.headingFont) ? proposal.headingFont : project.brand.headingFont,
      bodyFont: FONTS.includes(proposal.bodyFont) ? proposal.bodyFont : project.brand.bodyFont,
      voice: proposal.voice + (proposal.style ? `\n\nEstilo visual: ${proposal.style}` : ''),
    })
    setPhase('idle')
    setProposal(null)
    go({ screen: 'project', projectId: project.id, tab: 'inspiracoes' })
  }

  const searchIdeas = async () => {
    setError('')
    setSearching(true)
    try {
      const projNotes = notes.filter(n => n.projectId === project.id).slice(-15)
      const projPosts = posts.filter(p => p.projectId === project.id).slice(-15)
      const ctx =
        `Cliente: "${project.name}".\n` +
        `Tom de voz definido: ${project.brand.voice || '(ainda não definido)'}\n` +
        `Paleta da marca: ${project.brand.colors.join(', ')}\n` +
        `Posts já feitos: ${projPosts.map(p => p.title).filter(Boolean).join('; ') || 'nenhum'}\n` +
        `Roteiros e ideias existentes: ${projNotes.map(n => `${n.title}: ${(n.body || n.hook).slice(0, 100)}`).join(' | ') || 'nenhum'}\n` +
        (inspirationNotes ? `Anotações sobre as referências visuais:\n${inspirationNotes}` : '')

      const text = await callClaude({
        system: 'Você é uma estrategista de conteúdo para redes sociais no Brasil. Responda em português do Brasil.',
        webSearch: true,
        maxTokens: 6000,
        messages: [
          {
            role: 'user',
            content:
              `${ctx}\n\n` +
              `1) Deduza o nicho do negócio a partir do contexto acima.\n` +
              `2) Pesquise na web tendências, ganchos e palavras-chave atuais desse nicho.\n` +
              `3) Gere 5 sugestões de post. Cada uma com legenda pronta e roteiro (gancho, desenvolvimento, CTA), escritos no tom de voz definido acima.\n\n` +
              `Ao final, responda com JSON:\n` +
              `{"ideas": [{"title": "...", "copy": "legenda pronta", "hook": "...", "dev": "...", "cta": "..."}]}`,
          },
        ],
      })
      const parsed = extractJson<{ ideas: Idea[] }>(text)
      // toda ideia gerada fica salva no banco de ideias
      const saved = parsed.ideas.map(idea => {
        const n = addNote({
          projectId: project.id,
          kind: 'roteiro',
          title: idea.title,
          body: idea.copy,
          hook: idea.hook,
          dev: idea.dev,
          cta: idea.cta,
          fromAI: true,
        })
        return { idea, noteId: n.id, accepted: false }
      })
      setIdeas(saved)
    } catch (e) {
      setError(String((e as Error).message ?? e))
    } finally {
      setSearching(false)
    }
  }

  /** Aceitar uma ideia cria o post no cronograma, já com a legenda. */
  const acceptIdea = (item: { idea: Idea; noteId: string }) => {
    const p = addPost({
      projectId: project.id,
      title: item.idea.title,
      status: 'rascunho',
      caption: item.idea.copy,
      noteId: item.noteId,
    })
    updateNote(item.noteId, { postId: p.id })
    setIdeas(prev => prev.map(x => (x.noteId === item.noteId ? { ...x, accepted: true } : x)))
  }

  const hasKey = !!getApiKey()

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-ai)' }}><I n="sparkle" size={24} /> Assistente de IA</h2>
      </div>

      {keyEditing ? (
        <div className="ai-card">
          <h3><I n="key" /> Conectar a IA</h3>
          <p className="muted">
            O assistente usa a API da Anthropic (Claude), com leitura de imagens e busca na web.
            Cole sua chave de API — ela fica salva apenas neste dispositivo.
          </p>
          <ol className="muted" style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
            <li>Acesse <b>console.anthropic.com</b> e crie uma conta (ou entre na sua).</li>
            <li>Em <b>Billing</b>, adicione um método de pagamento ou créditos (cobrado por consumo — centavos por pesquisa).</li>
            <li>Em <b>API Keys</b>, toque em <b>Create Key</b> e copie a chave (começa com <b>sk-ant-</b>).</li>
            <li>Cole a chave abaixo e toque em Salvar. Pronto — não precisa repetir.</li>
          </ol>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              style={{ flex: 1 }}
              type="password"
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="sk-ant-…"
            />
            <button
              className="btn ai"
              onClick={() => {
                setApiKey(key)
                setKeyEditing(false)
              }}
            >
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <I n="key" size={15} /> IA conectada ·{' '}
          <button style={{ textDecoration: 'underline' }} onClick={() => setKeyEditing(true)}>
            trocar chave
          </button>
        </p>
      )}

      {error && (
        <div className="ai-card" style={{ borderLeft: '4px solid #cd6a6a' }}>
          <b>Algo deu errado</b>
          <p className="muted">{error}</p>
        </div>
      )}

      {/* ─── identidade visual guiada ─── */}
      <div className="ai-card">
        <h3><I n="palette" /> Identidade visual guiada</h3>
        <p className="muted">
          A IA lê o mural de referências deste cliente, faz perguntas para entender a intenção
          por trás delas e só então propõe paleta, fontes e tom de voz — tudo editável antes de
          virar a marca do cliente.
        </p>
        <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <I n="image" size={15} />
          {inspirations.length > 0
            ? `${inspirations.length} referência${inspirations.length > 1 ? 's' : ''} no mural${links.length ? ` · ${links.length} link${links.length > 1 ? 's' : ''}` : ''}`
            : 'Nenhuma referência salva ainda'}
          {' · '}
          <button
            style={{ textDecoration: 'underline' }}
            onClick={() => go({ screen: 'project', projectId: project.id, tab: 'inspiracoes' })}
          >
            abrir Inspirações
          </button>
        </p>

        {phase === 'idle' && (
          <button className="btn ai" disabled={!hasKey} onClick={startIdentity}>
            <I n={project.brand.voice ? 'rotate' : 'sparkle'} size={17} />
            {project.brand.voice ? ' Refazer identidade visual' : ' Começar criação guiada'}
          </button>
        )}

        {(phase === 'loadingQuestions' || phase === 'generating') && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="spin" />
            <span className="muted">
              {phase === 'loadingQuestions'
                ? 'Analisando as referências e preparando perguntas…'
                : 'Gerando proposta de identidade visual…'}
            </span>
          </div>
        )}

        {phase === 'answering' && (
          <>
            <p className="muted"><b>Responda para a IA entender a marca:</b></p>
            {questions.map((q, i) => (
              <div key={i} className="field">
                <label style={{ textTransform: 'none', fontSize: 13, letterSpacing: 0 }}>{i + 1}. {q}</label>
                <textarea
                  rows={2}
                  value={answers[i]}
                  onChange={e => setAnswers(a => a.map((x, j) => (j === i ? e.target.value : x)))}
                />
              </div>
            ))}
            <div className="actions">
              <button className="btn ghost" onClick={() => setPhase('idle')}>Cancelar</button>
              <button className="btn ai" onClick={generateIdentity}>Gerar proposta</button>
            </div>
          </>
        )}

        {phase === 'proposal' && proposal && (
          <>
            <p className="muted"><b>Proposta gerada — edite o que quiser antes de confirmar:</b></p>
            <div className="field">
              <label>Paleta</label>
              <div className="swatch-row">
                {proposal.colors.map((c, i) => (
                  <input
                    key={i} type="color" value={c}
                    onChange={e =>
                      setProposal({ ...proposal, colors: proposal.colors.map((x, j) => (j === i ? e.target.value : x)) })
                    }
                  />
                ))}
              </div>
            </div>
            <div className="prop-grid">
              <div className="field">
                <label>Fonte de títulos</label>
                <select
                  value={proposal.headingFont}
                  onChange={e => setProposal({ ...proposal, headingFont: e.target.value })}
                >
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Fonte de texto</label>
                <select
                  value={proposal.bodyFont}
                  onChange={e => setProposal({ ...proposal, bodyFont: e.target.value })}
                >
                  {FONTS.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Estilo dos elementos gráficos</label>
              <textarea rows={2} value={proposal.style}
                onChange={e => setProposal({ ...proposal, style: e.target.value })} />
            </div>
            <div className="field">
              <label>Tom de voz e personalidade</label>
              <textarea rows={3} value={proposal.voice}
                onChange={e => setProposal({ ...proposal, voice: e.target.value })} />
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => setPhase('answering')}>Voltar</button>
              <button className="btn ai" onClick={confirmIdentity}>
                <I n="check" size={17} /> Salvar como marca do cliente
              </button>
            </div>
          </>
        )}
      </div>

      {/* ─── pesquisa de nicho e ideias ─── */}
      <div className="ai-card">
        <h3><I n="search" /> Pesquisar ideias</h3>
        <p className="muted">
          A IA analisa o que já existe neste cliente, pesquisa tendências do nicho na web e sugere
          posts com legenda e roteiro no tom de voz da marca. Toda ideia fica salva em Roteiros & Ideias.
        </p>
        <button className="btn ai" disabled={!hasKey || searching} onClick={searchIdeas}>
          <I n="search" size={17} /> {searching ? 'Pesquisando o nicho…' : 'Pesquisar ideias'}
        </button>
        {searching && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="spin" />
            <span className="muted">Analisando o cliente e buscando tendências na web…</span>
          </div>
        )}

        {ideas.map(item => (
          <div key={item.noteId} className="idea-card">
            <b><I n="bulb" size={17} /> {item.idea.title}</b>
            <div className="part"><b>Legenda</b><br />{item.idea.copy}</div>
            <div className="part"><b>Gancho</b><br />{item.idea.hook}</div>
            <div className="part"><b>Desenvolvimento</b><br />{item.idea.dev}</div>
            <div className="part"><b>CTA</b><br />{item.idea.cta}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.accepted ? (
                <span className="badge ai"><I n="check" size={12} /> Post criado no cronograma</span>
              ) : (
                <button className="btn ai small" onClick={() => acceptIdea(item)}>
                  <I n="check" size={15} /> Transformar em post
                </button>
              )}
              <button
                className="btn notes small"
                onClick={() => go({ screen: 'project', projectId: project.id, tab: 'roteiros', noteId: item.noteId })}
              >
                <I n="pencil" size={15} /> Abrir roteiro
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
