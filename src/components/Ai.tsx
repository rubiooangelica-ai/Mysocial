import { useRef, useState } from 'react'
import { fileToDataUrl, getAssetUrl, getAssetUrlSync, useStore } from '../store'
import { useNav } from '../nav'
import { callClaude, dataUrlToImageBlock, extractJson, getApiKey, setApiKey, type AiMessage } from '../ai'
import { draftFromBrand } from '../designOps'
import { makeThumb } from '../render'
import { FONTS, type Project } from '../types'

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

const IDENTITY_SYSTEM = `Você é uma diretora de arte e estrategista de marca sênior, ajudando uma social media freelancer brasileira a definir a identidade visual de um cliente. Responda sempre em português do Brasil.`

export default function Ai({ project }: { project: Project }) {
  const updateProject = useStore(s => s.updateProject)
  const updateBrand = useStore(s => s.updateBrand)
  const addAsset = useStore(s => s.addAsset)
  const removeAsset = useStore(s => s.removeAsset)
  const assets = useStore(s => s.assets)
  const notes = useStore(s => s.notes)
  const posts = useStore(s => s.posts)
  const designs = useStore(s => s.designs)
  const addNote = useStore(s => s.addNote)
  const updateNote = useStore(s => s.updateNote)
  const addDesign = useStore(s => s.addDesign)
  const updateDesign = useStore(s => s.updateDesign)
  const go = useNav(s => s.go)

  const [key, setKey] = useState(getApiKey())
  const [keyEditing, setKeyEditing] = useState(!getApiKey())

  const inspirations = assets.filter(a => a.projectId === project.id && a.kind === 'inspiration')
  const links = project.inspirationLinks ?? []
  const [newLink, setNewLink] = useState('')
  const inspInput = useRef<HTMLInputElement>(null)

  // ─── fluxo de identidade visual ───
  type Phase = 'idle' | 'loadingQuestions' | 'answering' | 'generating' | 'proposal'
  const [phase, setPhase] = useState<Phase>('idle')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [proposal, setProposal] = useState<IdentityProposal | null>(null)
  const [error, setError] = useState('')

  // ─── pesquisa de ideias ───
  const [searching, setSearching] = useState(false)
  const [ideas, setIdeas] = useState<{ idea: Idea; noteId: string; accepted: boolean }[]>([])

  const uploadInspiration = async (files: FileList) => {
    for (const f of Array.from(files)) {
      const url = await fileToDataUrl(f, 1200)
      await addAsset({ projectId: project.id, name: f.name, kind: 'inspiration' }, url)
    }
  }

  const inspirationBlocks = async () => {
    const blocks: ReturnType<typeof dataUrlToImageBlock>[] = []
    for (const a of inspirations.slice(0, 8)) {
      const url = await getAssetUrl(a.id)
      if (url?.startsWith('data:image')) blocks.push(dataUrlToImageBlock(url))
    }
    return blocks
  }

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
              `Projeto/cliente: "${project.name}".\n` +
              (links.length ? `Links de referência anexados: ${links.join(', ')}\n` : '') +
              (imgs.length ? 'As imagens acima são materiais de inspiração anexados pela usuária.\n' : 'Nenhuma imagem de inspiração foi anexada ainda.\n') +
              `Antes de propor qualquer identidade visual, você precisa entender a INTENÇÃO por trás das inspirações. ` +
              `Formule de 5 a 7 perguntas para a usuária sobre: tom de voz da marca, público-alvo, sensação que os posts devem transmitir, cores que ela gosta/não gosta, e quais referências anexadas mais representam a marca. ` +
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
              `Projeto/cliente: "${project.name}".\n` +
              (links.length ? `Links de referência: ${links.join(', ')}\n` : '') +
              `Respostas da usuária às suas perguntas:\n\n${qa}\n\n` +
              `Com base nas inspirações anexadas e nas respostas, gere uma proposta de identidade visual. ` +
              `As fontes DEVEM ser escolhidas desta lista: ${FONTS.join(', ')}. ` +
              `Responda APENAS com JSON:\n` +
              `{"colors": ["#hex1","#hex2","#hex3","#hex4","#hex5"], "headingFont": "...", "bodyFont": "...", "style": "resumo do estilo de elementos gráficos em 2-3 frases", "voice": "resumo de tom de voz/personalidade da marca em 3-4 frases"}`,
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
    alert('Identidade confirmada! Ela agora é o Kit de Marca deste projeto — disponível no Editor e usada como tom de voz pela IA.')
  }

  const searchIdeas = async () => {
    setError('')
    setSearching(true)
    try {
      // 1. contexto do que já existe na pasta do projeto
      const projNotes = notes.filter(n => n.projectId === project.id).slice(-15)
      const projPosts = posts.filter(p => p.projectId === project.id).slice(-15)
      const projDesigns = designs.filter(d => d.projectId === project.id && !d.isTemplate).slice(-15)
      const ctx =
        `Cliente: "${project.name}".\n` +
        `Tom de voz definido: ${project.brand.voice || '(ainda não definido)'}\n` +
        `Paleta: ${project.brand.colors.join(', ')}\n` +
        `Posts existentes: ${projPosts.map(p => p.title).filter(Boolean).join('; ') || 'nenhum'}\n` +
        `Designs existentes: ${projDesigns.map(d => d.name).join('; ') || 'nenhum'}\n` +
        `Notas e ideias existentes: ${projNotes.map(n => `${n.title}: ${(n.body || n.hook).slice(0, 100)}`).join(' | ') || 'nenhuma'}`

      const text = await callClaude({
        system:
          'Você é uma estrategista de conteúdo para redes sociais no Brasil. Responda em português do Brasil.',
        webSearch: true,
        maxTokens: 6000,
        messages: [
          {
            role: 'user',
            content:
              `${ctx}\n\n` +
              `1) Deduza o nicho do negócio a partir do contexto acima.\n` +
              `2) Pesquise na web tendências, ganchos e palavras-chave atuais desse nicho.\n` +
              `3) Gere 5 sugestões de ideias de post. Cada uma com rascunho de copy (legenda) e roteiro (gancho, desenvolvimento, CTA), escritos no tom de voz definido acima.\n\n` +
              `Ao final, responda com JSON:\n` +
              `{"ideas": [{"title": "...", "copy": "legenda pronta", "hook": "...", "dev": "...", "cta": "..."}]}`,
          },
        ],
      })
      const parsed = extractJson<{ ideas: Idea[] }>(text)
      // toda ideia gerada fica salva no banco de ideias (módulo Notas)
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

  // aceitar → monta rascunho visual no Editor com o Kit de Marca
  const acceptIdea = async (item: { idea: Idea; noteId: string }) => {
    const d = addDesign(draftFromBrand(project, 'feed-1x1', item.idea.title, item.idea.hook))
    const thumb = await makeThumb({ ...d })
    updateDesign(d.id, { thumb })
    updateNote(item.noteId, { designId: d.id })
    setIdeas(prev => prev.map(x => (x.noteId === item.noteId ? { ...x, accepted: true } : x)))
    go({ screen: 'design', projectId: project.id, designId: d.id })
  }

  const hasKey = !!getApiKey()

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-ai)' }}>✨ Assistente de IA</h2>
      </div>

      {/* ─── configuração da chave ─── */}
      {keyEditing ? (
        <div className="ai-card">
          <h3>🔑 Conectar a IA</h3>
          <p className="muted">
            O assistente usa a API da Anthropic (Claude) com visão multimodal e busca na web.
            Cole sua chave de API — ela fica salva apenas neste dispositivo.
          </p>
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
        <p className="muted">
          🔑 IA conectada ·{' '}
          <button style={{ textDecoration: 'underline' }} onClick={() => setKeyEditing(true)}>
            trocar chave
          </button>
        </p>
      )}

      {error && (
        <div className="ai-card" style={{ borderLeft: '4px solid #d64545' }}>
          <b>Algo deu errado</b>
          <p className="muted">{error}</p>
        </div>
      )}

      {/* ─── 6.1 identidade visual guiada ─── */}
      <div className="ai-card">
        <h3>🎨 Identidade visual guiada</h3>
        <p className="muted">
          Anexe inspirações (fotos, prints, links). A IA faz perguntas para entender a intenção
          por trás delas e só então propõe paleta, fontes e tom de voz — tudo editável antes de
          virar o Kit de Marca. Você pode refazer este processo quando a marca evoluir.
        </p>

        <div className="field">
          <label>Materiais de inspiração</label>
          <div className="insp-grid">
            {inspirations.map(a => {
              const url = getAssetUrlSync(a.id)
              return (
                <div key={a.id} className="item">
                  {url ? <img src={url} alt={a.name} /> : a.name}
                  <button className="rm" onClick={() => removeAsset(a.id)}>✕</button>
                </div>
              )
            })}
            <button className="item" style={{ fontSize: 24 }} onClick={() => inspInput.current?.click()}>＋</button>
            <input
              ref={inspInput} type="file" accept="image/*" multiple hidden
              onChange={e => e.target.files && uploadInspiration(e.target.files)}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input
              style={{ flex: 1, minWidth: 180 }}
              value={newLink}
              onChange={e => setNewLink(e.target.value)}
              placeholder="https://site-de-referencia.com"
            />
            <button
              className="btn ghost small"
              disabled={!newLink.trim()}
              onClick={() => {
                updateProject(project.id, { inspirationLinks: [...links, newLink.trim()] })
                setNewLink('')
              }}
            >
              ＋ Link
            </button>
          </div>
          {links.length > 0 && (
            <div className="chip-row" style={{ marginTop: 8 }}>
              {links.map((l, i) => (
                <button
                  key={i} className="chip" title="Toque para remover"
                  onClick={() => updateProject(project.id, { inspirationLinks: links.filter((_, j) => j !== i) })}
                >
                  🔗 {l.replace(/https?:\/\//, '').slice(0, 28)} ✕
                </button>
              ))}
            </div>
          )}
        </div>

        {phase === 'idle' && (
          <button className="btn ai" disabled={!hasKey} onClick={startIdentity}>
            {project.brand.voice ? '🔄 Refazer identidade visual' : '✨ Começar criação guiada'}
          </button>
        )}

        {(phase === 'loadingQuestions' || phase === 'generating') && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="spin" />
            <span className="muted">
              {phase === 'loadingQuestions'
                ? 'Analisando inspirações e preparando perguntas…'
                : 'Gerando proposta de identidade visual…'}
            </span>
          </div>
        )}

        {phase === 'answering' && (
          <>
            <p className="muted"><b>Responda para a IA entender a marca:</b></p>
            {questions.map((q, i) => (
              <div key={i} className="field">
                <label style={{ textTransform: 'none', fontSize: 13 }}>{i + 1}. {q}</label>
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
              <label>Paleta de cores</label>
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
              <label>Estilo de elementos gráficos</label>
              <textarea rows={2} value={proposal.style}
                onChange={e => setProposal({ ...proposal, style: e.target.value })} />
            </div>
            <div className="field">
              <label>Tom de voz / personalidade</label>
              <textarea rows={3} value={proposal.voice}
                onChange={e => setProposal({ ...proposal, voice: e.target.value })} />
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => setPhase('answering')}>← Voltar</button>
              <button className="btn ai" onClick={confirmIdentity}>✓ Confirmar como Kit de Marca</button>
            </div>
          </>
        )}
      </div>

      {/* ─── 6.2 pesquisa de nicho e ideias ─── */}
      <div className="ai-card">
        <h3>🔍 Pesquisar ideias</h3>
        <p className="muted">
          A IA analisa o que já existe na pasta deste projeto, pesquisa tendências do nicho na
          web e sugere ideias de post com copy e roteiro no tom de voz da marca. Todas as ideias
          ficam salvas no banco de ideias (módulo Notas).
        </p>
        <button className="btn ai" disabled={!hasKey || searching} onClick={searchIdeas}>
          {searching ? 'Pesquisando o nicho…' : '🔍 Pesquisar ideias'}
        </button>
        {searching && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div className="spin" />
            <span className="muted">Analisando o projeto e buscando tendências na web…</span>
          </div>
        )}

        {ideas.map(item => (
          <div key={item.noteId} className="idea-card">
            <b>💡 {item.idea.title}</b>
            <div className="part"><b>Copy</b><br />{item.idea.copy}</div>
            <div className="part"><b>Gancho</b><br />{item.idea.hook}</div>
            <div className="part"><b>Desenvolvimento</b><br />{item.idea.dev}</div>
            <div className="part"><b>CTA</b><br />{item.idea.cta}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {item.accepted ? (
                <span className="badge ai">✓ Rascunho criado no Editor</span>
              ) : (
                <button className="btn ai small" onClick={() => acceptIdea(item)}>
                  ✓ Aceitar e montar rascunho no Editor
                </button>
              )}
              <button
                className="btn notes small"
                onClick={() => go({ screen: 'project', projectId: project.id, tab: 'notas', noteId: item.noteId })}
              >
                ✏️ Editar no módulo Notas
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
