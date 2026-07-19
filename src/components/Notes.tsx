import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { draftFromBrand } from '../designOps'
import { makeThumb } from '../render'
import type { ID, Note, NoteKind, Project } from '../types'

type Filter = 'todas' | 'notas' | 'roteiros' | 'ideias' | 'ia'

export default function Notes({ project, openNoteId }: { project: Project; openNoteId?: ID }) {
  const allNotes = useStore(s => s.notes)
  const posts = useStore(s => s.posts)
  const addNote = useStore(s => s.addNote)
  const [filter, setFilter] = useState<Filter>('todas')
  const [openId, setOpenId] = useState<ID | null>(openNoteId ?? null)

  useEffect(() => {
    if (openNoteId) setOpenId(openNoteId)
  }, [openNoteId])

  const notes = useMemo(() => {
    const mine = allNotes.filter(n => n.projectId === project.id)
    const filtered = mine.filter(n => {
      if (filter === 'notas') return n.kind === 'nota'
      if (filter === 'roteiros') return n.kind === 'roteiro'
      if (filter === 'ia') return n.fromAI
      if (filter === 'ideias') {
        // banco de ideias: sem vínculo com post/data ainda
        const post = n.postId ? posts.find(p => p.id === n.postId) : undefined
        return !post?.date
      }
      return true
    })
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt)
  }, [allNotes, posts, project.id, filter])

  const create = (kind: NoteKind) => {
    const n = addNote({ projectId: project.id, kind })
    setOpenId(n.id)
  }

  const open = openId ? allNotes.find(n => n.id === openId) : null

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-notes)' }}>📝 Notas & Roteiros</h2>
        <div className="spacer" />
        <button className="btn notes" onClick={() => create('nota')}>＋ Nota</button>
        <button className="btn editor" onClick={() => create('roteiro')}>＋ Roteiro</button>
      </div>

      <div className="chip-row">
        {(
          [
            ['todas', 'Todas'],
            ['notas', '📝 Notas'],
            ['roteiros', '🎬 Roteiros'],
            ['ideias', '💡 Ideias soltas'],
            ['ia', '✨ Geradas por IA'],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <div className="big">💡</div>
          <b>Nada por aqui ainda</b>
          <p>Anote ideias soltas, referências e roteiros de vídeo.<br />Tudo pode ser vinculado a um design e a uma data.</p>
        </div>
      ) : (
        <div className="note-list">
          {notes.map(n => {
            const post = n.postId ? posts.find(p => p.id === n.postId) : undefined
            return (
              <button key={n.id} className={'note-card' + (n.kind === 'roteiro' ? ' roteiro' : '')} onClick={() => setOpenId(n.id)}>
                <b>{n.kind === 'roteiro' ? '🎬 ' : '📝 '}{n.title || 'Sem título'}</b>
                <p>{n.kind === 'roteiro' ? n.hook || n.body : n.body}</p>
                <div className="badges">
                  {n.fromAI && <span className="badge ai">✨ IA</span>}
                  {n.designId && <span className="badge link">🎨 design</span>}
                  {post?.date && (
                    <span className="badge link">📅 {post.date.slice(8)}/{post.date.slice(5, 7)}</span>
                  )}
                  {!post?.date && !n.designId && <span className="badge">💡 ideia solta</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {open && <NoteSheet note={open} project={project} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function NoteSheet({ note, project, onClose }: { note: Note; project: Project; onClose: () => void }) {
  const updateNote = useStore(s => s.updateNote)
  const removeNote = useStore(s => s.removeNote)
  const designs = useStore(s => s.designs)
  const posts = useStore(s => s.posts)
  const addPost = useStore(s => s.addPost)
  const addDesign = useStore(s => s.addDesign)
  const updateDesign = useStore(s => s.updateDesign)
  const updatePost = useStore(s => s.updatePost)
  const go = useNav(s => s.go)

  const [schedDate, setSchedDate] = useState('')
  const projDesigns = designs.filter(d => d.projectId === project.id && !d.isTemplate)
  const linkedPost = note.postId ? posts.find(p => p.id === note.postId) : undefined

  const set = (patch: Partial<Note>) => updateNote(note.id, patch)

  // "a ideia" → "o roteiro" → "o design final": cria rascunho no Editor
  // usando o Kit de Marca do projeto.
  const createDesign = async () => {
    const draft = draftFromBrand(project, 'feed-1x1', note.title || 'Nova ideia', note.hook || undefined)
    const d = addDesign(draft)
    const thumb = await makeThumb({ ...d })
    updateDesign(d.id, { thumb })
    set({ designId: d.id })
    if (linkedPost) updatePost(linkedPost.id, { designId: d.id })
    go({ screen: 'design', projectId: project.id, designId: d.id })
  }

  const schedule = () => {
    if (linkedPost) {
      updatePost(linkedPost.id, { date: schedDate || undefined })
    } else {
      const p = addPost({
        projectId: project.id,
        title: note.title || 'Post',
        date: schedDate || undefined,
        status: 'rascunho',
        designId: note.designId,
        noteId: note.id,
      })
      set({ postId: p.id })
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="chip-row">
            <button className={'chip' + (note.kind === 'nota' ? ' on' : '')} onClick={() => set({ kind: 'nota' })}>
              📝 Nota
            </button>
            <button className={'chip' + (note.kind === 'roteiro' ? ' on' : '')} onClick={() => set({ kind: 'roteiro' })}>
              🎬 Roteiro
            </button>
          </div>
          <div className="spacer" />
          {note.fromAI && <span className="badge ai">✨ gerada por IA</span>}
        </div>

        <input
          value={note.title}
          onChange={e => set({ title: e.target.value })}
          placeholder="Título da ideia"
          style={{ fontSize: 18, fontWeight: 700 }}
        />

        {note.kind === 'roteiro' && (
          <>
            <div className="field">
              <label>🪝 Gancho (hook)</label>
              <textarea rows={2} value={note.hook} placeholder="A primeira frase que segura a atenção…"
                onChange={e => set({ hook: e.target.value })} />
            </div>
            <div className="field">
              <label>🎬 Desenvolvimento</label>
              <textarea rows={4} value={note.dev} placeholder="O corpo do vídeo, passo a passo…"
                onChange={e => set({ dev: e.target.value })} />
            </div>
            <div className="field">
              <label>📣 CTA (chamada para ação)</label>
              <textarea rows={2} value={note.cta} placeholder="O que a audiência deve fazer no final…"
                onChange={e => set({ cta: e.target.value })} />
            </div>
          </>
        )}

        <div className="field">
          <label>{note.kind === 'roteiro' ? 'Observações livres' : 'Texto'}</label>
          <textarea
            rows={note.kind === 'roteiro' ? 3 : 8}
            value={note.body}
            placeholder="Ideias soltas, referências, insights…"
            onChange={e => set({ body: e.target.value })}
          />
        </div>

        <div className="field">
          <label>Vínculos</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select
              value={note.designId ?? ''}
              onChange={e => set({ designId: e.target.value || undefined })}
              style={{ flex: 1, minWidth: 160 }}
            >
              <option value="">🎨 Sem design vinculado</option>
              {projDesigns.map(d => <option key={d.id} value={d.id}>🎨 {d.name}</option>)}
            </select>
            {note.designId ? (
              <button
                className="btn editor small"
                onClick={() => go({ screen: 'design', projectId: project.id, designId: note.designId! })}
              >
                Abrir design
              </button>
            ) : (
              <button className="btn editor small" onClick={createDesign}>
                ＋ Criar design desta ideia
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {linkedPost?.date ? (
              <span className="badge link">
                📅 Agendada para {linkedPost.date.slice(8)}/{linkedPost.date.slice(5, 7)}
                {linkedPost.time ? ` às ${linkedPost.time}` : ''}
              </span>
            ) : (
              <>
                <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                <button className="btn cal small" onClick={schedule} disabled={!schedDate}>
                  📅 Agendar no calendário
                </button>
              </>
            )}
          </div>
        </div>

        <div className="actions">
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Excluir esta nota?')) {
                removeNote(note.id)
                onClose()
              }
            }}
          >
            Excluir
          </button>
          <div className="spacer" />
          <button className="btn primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  )
}
