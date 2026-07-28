import { useEffect, useMemo, useState } from 'react'
import { shortDate, useStore } from '../store'
import { useNav } from '../nav'
import type { ID, Note, NoteKind, Project } from '../types'
import { I } from '../icons'

type Filter = 'todas' | 'roteiros' | 'notas' | 'ideias' | 'ia'

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
      if (filter === 'roteiros') return n.kind === 'roteiro'
      if (filter === 'notas') return n.kind === 'nota'
      if (filter === 'ia') return n.fromAI
      if (filter === 'ideias') {
        // banco de ideias: ainda não virou post com data
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
        <h2 style={{ color: 'var(--m-notes)' }}><I n="note" size={24} /> Roteiros & Ideias</h2>
        <div className="spacer" />
        <button className="btn notes" onClick={() => create('roteiro')}><I n="plus" size={18} /> Roteiro</button>
        <button className="btn ghost" onClick={() => create('nota')}><I n="plus" size={18} /> Ideia solta</button>
      </div>

      <div className="chip-row">
        {(
          [
            ['todas', 'Tudo'],
            ['roteiros', 'Roteiros'],
            ['notas', 'Notas e ideias'],
            ['ideias', 'Ainda sem data'],
            ['ia', 'Geradas por IA'],
          ] as [Filter, string][]
        ).map(([f, label]) => (
          <button key={f} className={'chip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
            {label}
          </button>
        ))}
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <div className="big"><I n="bulb" size={34} /></div>
          <b>Nada por aqui ainda</b>
          <p>
            Guarde ideias soltas, referências e roteiros de vídeo.<br />
            Quando a ideia amadurecer, ela vira um post no cronograma.
          </p>
        </div>
      ) : (
        <div className="note-list">
          {notes.map(n => {
            const post = n.postId ? posts.find(p => p.id === n.postId) : undefined
            return (
              <button
                key={n.id}
                className={'note-card' + (n.kind === 'roteiro' ? ' roteiro' : '')}
                onClick={() => setOpenId(n.id)}
              >
                <b><I n={n.kind === 'roteiro' ? 'film' : 'note'} size={17} /> {n.title || 'Sem título'}</b>
                <p>{n.kind === 'roteiro' ? n.hook || n.dev || n.body : n.body}</p>
                <div className="badges">
                  {n.fromAI && <span className="badge ai"><I n="sparkle" size={12} /> IA</span>}
                  {post?.date ? (
                    <span className="badge link"><I n="calendar" size={12} /> {shortDate(post.date)}</span>
                  ) : post ? (
                    <span className="badge link"><I n="pin" size={12} /> no cronograma</span>
                  ) : (
                    <span className="badge"><I n="bulb" size={12} /> ideia solta</span>
                  )}
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
  const posts = useStore(s => s.posts)
  const addPost = useStore(s => s.addPost)
  const go = useNav(s => s.go)

  const [schedDate, setSchedDate] = useState('')
  const linkedPost = note.postId ? posts.find(p => p.id === note.postId) : undefined

  const set = (patch: Partial<Note>) => updateNote(note.id, patch)

  /** A ideia vira um post no cronograma, já com a legenda de partida. */
  const createPost = (date?: string) => {
    const p = addPost({
      projectId: project.id,
      title: note.title || 'Post',
      date,
      status: 'rascunho',
      caption: note.kind === 'roteiro' ? note.body || note.cta : note.body,
      noteId: note.id,
    })
    set({ postId: p.id })
    go({ screen: 'project', projectId: project.id, tab: 'cronograma', postId: p.id })
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet wide" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="chip-row">
            <button className={'chip' + (note.kind === 'roteiro' ? ' on' : '')} onClick={() => set({ kind: 'roteiro' })}>
              <I n="film" size={15} /> Roteiro
            </button>
            <button className={'chip' + (note.kind === 'nota' ? ' on' : '')} onClick={() => set({ kind: 'nota' })}>
              <I n="note" size={15} /> Nota livre
            </button>
          </div>
          <div className="spacer" />
          {note.fromAI && <span className="badge ai"><I n="sparkle" size={12} /> gerada por IA</span>}
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
              <label>Gancho (hook)</label>
              <textarea rows={2} value={note.hook} placeholder="A primeira frase que segura a atenção…"
                onChange={e => set({ hook: e.target.value })} />
            </div>
            <div className="field">
              <label>Desenvolvimento</label>
              <textarea rows={5} value={note.dev} placeholder="O corpo do vídeo, passo a passo…"
                onChange={e => set({ dev: e.target.value })} />
            </div>
            <div className="field">
              <label>CTA (chamada para ação)</label>
              <textarea rows={2} value={note.cta} placeholder="O que a audiência deve fazer no final…"
                onChange={e => set({ cta: e.target.value })} />
            </div>
          </>
        )}

        <div className="field">
          <label>{note.kind === 'roteiro' ? 'Legenda e observações' : 'Texto'}</label>
          <textarea
            rows={note.kind === 'roteiro' ? 4 : 9}
            value={note.body}
            placeholder="Ideias soltas, referências, insights, rascunho de legenda…"
            onChange={e => set({ body: e.target.value })}
          />
        </div>

        <div className="field">
          <label>No cronograma</label>
          {linkedPost ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge link">
                <I n="calendar" size={12} />
                {linkedPost.date
                  ? ` Agendada para ${shortDate(linkedPost.date)}${linkedPost.time ? ` às ${linkedPost.time}` : ''}`
                  : ' No cronograma, ainda sem data'}
              </span>
              <button
                className="btn cal small"
                onClick={() =>
                  go({ screen: 'project', projectId: project.id, tab: 'cronograma', postId: linkedPost.id })
                }
              >
                Abrir post
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button className="btn cal small" onClick={() => createPost(schedDate || undefined)}>
                <I n="plus" size={15} /> Transformar em post
              </button>
              <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
              <span className="muted" style={{ fontSize: 12 }}>
                A data é opcional — sem ela o post fica no backlog.
              </span>
            </div>
          )}
        </div>

        <div className="actions">
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Excluir esta anotação?')) {
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
