import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fileToDataUrl, getAssetUrlSync, makeThumb, nextStatus, shortDate, todayIso, useStore,
} from '../store'
import { useNav } from '../nav'
import {
  POST_FORMATS, STATUS_LABEL, STATUS_ORDER,
  type ID, type Post, type PostFormat, type PostStatus, type Project,
} from '../types'
import { I } from '../icons'

type View = 'mes' | 'semana' | 'status'

const DOW = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const STATUS_COLOR: Record<PostStatus, string> = {
  rascunho: 'var(--st-rascunho)',
  aprovado: 'var(--st-aprovado)',
  agendado: 'var(--st-agendado)',
  publicado: 'var(--st-publicado)',
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

function monthGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(Date.UTC(year, month, 1))
  const start = new Date(first)
  const dow = (first.getUTCDay() + 6) % 7 // segunda = 0
  start.setUTCDate(start.getUTCDate() - dow)
  const cells: { date: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setUTCDate(start.getUTCDate() + i)
    cells.push({ date: iso(d), inMonth: d.getUTCMonth() === month })
  }
  return cells
}

function weekDates(anchor: Date): string[] {
  const d = new Date(Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()))
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(d)
    x.setUTCDate(d.getUTCDate() + i)
    return iso(x)
  })
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

// ─── núcleo compartilhado (um cliente ou visão consolidada) ───────────────

export function CalendarCore({
  projects, fixedProject, openPostId,
}: { projects: Project[]; fixedProject?: Project; openPostId?: ID }) {
  const allPosts = useStore(s => s.posts)
  const notes = useStore(s => s.notes)
  const addPost = useStore(s => s.addPost)
  const updatePost = useStore(s => s.updatePost)
  const removePost = useStore(s => s.removePost)
  const go = useNav(s => s.go)

  const [view, setView] = useState<View>('mes')
  const [cursor, setCursor] = useState(() => new Date())
  const [filterId, setFilterId] = useState<ID | 'todos'>('todos')
  const [editingId, setEditingId] = useState<ID | null>(openPostId ?? null)
  const [creatingDate, setCreatingDate] = useState<string | null>(null)

  useEffect(() => {
    if (openPostId) setEditingId(openPostId)
  }, [openPostId])

  const visibleProjects = fixedProject
    ? [fixedProject]
    : filterId === 'todos'
      ? projects
      : projects.filter(p => p.id === filterId)

  const posts = useMemo(() => {
    const ids = new Set(visibleProjects.map(p => p.id))
    return allPosts.filter(p => ids.has(p.projectId))
  }, [allPosts, visibleProjects])

  const editing = editingId ? allPosts.find(p => p.id === editingId) : undefined
  const projectOf = (p: Post) => projects.find(x => x.id === p.projectId)

  // ─── arrastar e soltar por toque ───
  const drag = useRef<{
    post: Post
    startX: number
    startY: number
    active: boolean
    ghost?: HTMLElement
  } | null>(null)
  const [dragTarget, setDragTarget] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<ID | null>(null)

  const findCell = (x: number, y: number): { date: string; time?: string } | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-date]') as HTMLElement | null
    if (!el) return null
    return { date: el.dataset.date!, time: el.dataset.time }
  }

  const onChipPointerDown = (e: React.PointerEvent, post: Post) => {
    e.stopPropagation()
    drag.current = { post, startX: e.clientX, startY: e.clientY, active: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onChipPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    if (!d.active && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 10) {
      d.active = true
      setDraggingId(d.post.id)
      const ghost = document.createElement('div')
      ghost.className = 'drag-ghost post-chip'
      ghost.textContent = d.post.title || 'Post'
      document.body.appendChild(ghost)
      d.ghost = ghost
    }
    if (d.active) {
      if (d.ghost) {
        d.ghost.style.left = e.clientX - 60 + 'px'
        d.ghost.style.top = e.clientY - 50 + 'px'
      }
      const cell = findCell(e.clientX, e.clientY)
      setDragTarget(cell ? cell.date + (cell.time ?? '') : null)
    }
  }
  const onChipPointerUp = (e: React.PointerEvent, post: Post) => {
    const d = drag.current
    drag.current = null
    setDragTarget(null)
    setDraggingId(null)
    d?.ghost?.remove()
    if (d?.active) {
      const cell = findCell(e.clientX, e.clientY)
      if (cell && (cell.date !== post.date || (cell.time && cell.time !== post.time))) {
        updatePost(post.id, { date: cell.date, ...(cell.time ? { time: cell.time } : {}) })
      }
    } else {
      setEditingId(post.id)
    }
  }

  const chip = (p: Post, showThumb = true) => {
    const proj = projectOf(p)
    return (
      <button
        key={p.id}
        className={'post-chip' + (draggingId === p.id ? ' dragging' : '')}
        style={{ ['--pcolor' as string]: fixedProject ? STATUS_COLOR[p.status] : proj?.accent }}
        onPointerDown={e => onChipPointerDown(e, p)}
        onPointerMove={onChipPointerMove}
        onPointerUp={e => onChipPointerUp(e, p)}
      >
        {showThumb && p.thumb && <img src={p.thumb} alt="" draggable={false} />}
        <span className="t">{p.time ? p.time + ' ' : ''}{p.title || 'Post'}</span>
      </button>
    )
  }

  const label =
    view === 'semana'
      ? (() => {
          const w = weekDates(cursor)
          return `${w[0].slice(8)}/${w[0].slice(5, 7)} – ${w[6].slice(8)}/${w[6].slice(5, 7)}`
        })()
      : `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

  const step = (dir: 1 | -1) => {
    const d = new Date(cursor)
    if (view === 'semana') d.setDate(d.getDate() + 7 * dir)
    else d.setMonth(d.getMonth() + dir)
    setCursor(d)
  }

  const postsOn = (date: string) =>
    posts
      .filter(p => p.date === date)
      .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))

  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06h–22h
  const noDate = posts.filter(p => !p.date)

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-cal)' }}><I n="calendar" size={24} /> Cronograma</h2>
        <div className="spacer" />
        <button className="btn cal" onClick={() => setCreatingDate(todayIso())}>
          <I n="plus" size={18} /> Novo post
        </button>
      </div>

      <div className="section-head" style={{ gap: 8 }}>
        <div className="chip-row">
          {(['mes', 'semana', 'status'] as View[]).map(v => (
            <button key={v} className={'chip' + (view === v ? ' on' : '')} onClick={() => setView(v)}>
              {v === 'mes' ? 'Mensal' : v === 'semana' ? 'Semanal' : 'Por status'}
            </button>
          ))}
        </div>
        <div className="spacer" />
        {view !== 'status' && (
          <>
            <button className="icon-btn" onClick={() => step(-1)}><I n="chevL" /></button>
            <b style={{ minWidth: 130, textAlign: 'center' }}>{label}</b>
            <button className="icon-btn" onClick={() => step(1)}><I n="chevR" /></button>
          </>
        )}
      </div>

      {!fixedProject && projects.length > 1 && (
        <div className="chip-row">
          <button className={'chip' + (filterId === 'todos' ? ' on' : '')} onClick={() => setFilterId('todos')}>
            Todos os clientes
          </button>
          {projects.map(p => (
            <button
              key={p.id}
              className={'chip' + (filterId === p.id ? ' on' : '')}
              onClick={() => setFilterId(p.id)}
            >
              <span className="status-dot" style={{ background: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {view === 'mes' && (
        <div className="cal-month">
          {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
          {monthGrid(cursor.getFullYear(), cursor.getMonth()).map(cell => (
            <div
              key={cell.date}
              data-date={cell.date}
              className={
                'cal-day' +
                (cell.inMonth ? '' : ' other') +
                (cell.date === todayIso() ? ' today' : '') +
                (dragTarget === cell.date ? ' drop-target' : '')
              }
              onClick={() => setCreatingDate(cell.date)}
            >
              <span className="num">{Number(cell.date.slice(8))}</span>
              {postsOn(cell.date).map(p => chip(p))}
            </div>
          ))}
        </div>
      )}

      {view === 'semana' && (
        <div style={{ overflowX: 'auto' }}>
          <div className="cal-week" style={{ minWidth: 700 }}>
            <div />
            {weekDates(cursor).map((d, i) => (
              <div key={d} className={'week-head' + (d === todayIso() ? ' today' : '')}>
                {DOW[i]} {d.slice(8)}
              </div>
            ))}
            {HOURS.map(h => {
              const hh = String(h).padStart(2, '0')
              return (
                <div key={h} style={{ display: 'contents' }}>
                  <div className="hour-label">{hh}h</div>
                  {weekDates(cursor).map(d => (
                    <div
                      key={d + h}
                      data-date={d}
                      data-time={`${hh}:00`}
                      className={'week-cell' + (dragTarget === d + `${hh}:00` ? ' drop-target' : '')}
                      onClick={() => setCreatingDate(d)}
                    >
                      {postsOn(d)
                        .filter(p => (p.time ? Number(p.time.slice(0, 2)) === h : h === 6))
                        .map(p => chip(p, false))}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Posts sem horário aparecem às 06h. Arraste um card para mudar dia ou horário.
          </p>
        </div>
      )}

      {view === 'status' && (
        <div className="status-board">
          {STATUS_ORDER.map(st => (
            <div key={st} className="status-col">
              <h4>
                <span className="status-dot" style={{ background: STATUS_COLOR[st] }} />
                {STATUS_LABEL[st]} · {posts.filter(p => p.status === st).length}
              </h4>
              {posts
                .filter(p => p.status === st)
                .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
                .map(p => {
                  const proj = projectOf(p)
                  return (
                    <div key={p.id} className="post-card-lg" onClick={() => setEditingId(p.id)}>
                      <div className="pc-main">
                        {p.thumb ? <img src={p.thumb} alt="" /> : <div className="ph"><I n="image" /></div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <b>{p.title || 'Post'}</b>
                          <span>
                            {p.date ? shortDate(p.date) : 'Sem data'}
                            {p.time ? ` · ${p.time}` : ''}
                            {p.format ? ` · ${p.format}` : ''}
                            {!fixedProject && proj ? ` · ${proj.name}` : ''}
                          </span>
                        </div>
                      </div>
                      {nextStatus[st] && (
                        <button
                          className="btn small ghost"
                          onClick={e => {
                            e.stopPropagation()
                            updatePost(p.id, { status: nextStatus[st]! })
                          }}
                        >
                          Marcar como {STATUS_LABEL[nextStatus[st]!].toLowerCase()}
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          ))}
        </div>
      )}

      {noDate.length > 0 && view !== 'status' && (
        <>
          <div className="section-head" style={{ marginTop: 6 }}>
            <h2 style={{ fontSize: 18 }}>Sem data ainda · {noDate.length}</h2>
          </div>
          <div className="chip-row">
            {noDate.map(p => (
              <button key={p.id} className="chip" onClick={() => setEditingId(p.id)}>
                {p.title || 'Post'}
              </button>
            ))}
          </div>
        </>
      )}

      {(editing || creatingDate) && (
        <PostSheet
          key={editing?.id ?? 'novo'}
          post={editing}
          defaultDate={creatingDate ?? undefined}
          projects={visibleProjects.length ? visibleProjects : projects}
          fixedProject={fixedProject}
          onClose={() => {
            setEditingId(null)
            setCreatingDate(null)
          }}
          onSave={data => {
            if (editing) updatePost(editing.id, data)
            else
              addPost({
                projectId: data.projectId ?? fixedProject?.id ?? projects[0].id,
                title: data.title ?? '',
                date: data.date,
                time: data.time,
                status: data.status ?? 'rascunho',
                format: data.format,
                caption: data.caption,
                imageAssetId: data.imageAssetId,
                thumb: data.thumb,
                noteId: data.noteId,
              })
            setEditingId(null)
            setCreatingDate(null)
          }}
          onDelete={
            editing
              ? () => {
                  removePost(editing.id)
                  setEditingId(null)
                }
              : undefined
          }
          onOpenNote={id => {
            const n = notes.find(x => x.id === id)
            if (n) go({ screen: 'project', projectId: n.projectId, tab: 'roteiros', noteId: n.id })
          }}
        />
      )}
    </div>
  )
}

// ─── modal de criação/edição de post ──────────────────────────────────────

function PostSheet({
  post, defaultDate, projects, fixedProject, onClose, onSave, onDelete, onOpenNote,
}: {
  post?: Post
  defaultDate?: string
  projects: Project[]
  fixedProject?: Project
  onClose: () => void
  onSave: (data: Partial<Post>) => void
  onDelete?: () => void
  onOpenNote: (id: ID) => void
}) {
  const notes = useStore(s => s.notes)
  const addAsset = useStore(s => s.addAsset)
  const removeAsset = useStore(s => s.removeAsset)
  const [title, setTitle] = useState(post?.title ?? '')
  const [projectId, setProjectId] = useState(post?.projectId ?? fixedProject?.id ?? projects[0]?.id)
  const [date, setDate] = useState(post?.date ?? defaultDate ?? '')
  const [time, setTime] = useState(post?.time ?? '')
  const [status, setStatus] = useState<PostStatus>(post?.status ?? 'rascunho')
  const [format, setFormat] = useState<PostFormat | ''>(post?.format ?? '')
  const [caption, setCaption] = useState(post?.caption ?? '')
  const [imageAssetId, setImageAssetId] = useState(post?.imageAssetId)
  const [thumb, setThumb] = useState(post?.thumb)
  const [noteId, setNoteId] = useState(post?.noteId ?? '')
  const [copied, setCopied] = useState(false)
  const artInput = useRef<HTMLInputElement>(null)

  const projNotes = notes.filter(n => n.projectId === projectId)
  const artUrl = imageAssetId ? getAssetUrlSync(imageAssetId) : undefined

  const uploadArt = async (file: File) => {
    const url = await fileToDataUrl(file)
    const asset = await addAsset({ projectId, name: file.name, kind: 'arte' }, url)
    if (imageAssetId) removeAsset(imageAssetId)
    setImageAssetId(asset.id)
    setThumb(await makeThumb(url))
  }

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet wide" onClick={e => e.stopPropagation()}>
        <h3><I n={post ? 'pencil' : 'plus'} /> {post ? 'Editar post' : 'Novo post'}</h3>

        <div className="field">
          <label>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Dica de terça" />
        </div>

        {!fixedProject && projects.length > 1 && (
          <div className="field">
            <label>Cliente</label>
            <select value={projectId} onChange={e => setProjectId(e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}

        <div className="prop-grid">
          <div className="field">
            <label>Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="field">
            <label>Horário</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Formato</label>
          <div className="chip-row">
            {POST_FORMATS.map(f => (
              <button
                key={f}
                className={'chip' + (format === f ? ' on' : '')}
                onClick={() => setFormat(format === f ? '' : f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Status</label>
          <div className="chip-row">
            {STATUS_ORDER.map(st => (
              <button key={st} className={'chip' + (status === st ? ' on' : '')} onClick={() => setStatus(st)}>
                {STATUS_LABEL[st]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Arte final</label>
          <div className="art-row">
            {artUrl ? <img className="art-preview" src={artUrl} alt="" /> : <div className="art-preview ph"><I n="image" size={26} /></div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn ghost small" onClick={() => artInput.current?.click()}>
                <I n="image" size={15} /> {artUrl ? 'Trocar imagem' : 'Anexar da galeria'}
              </button>
              {artUrl && (
                <button
                  className="btn danger small"
                  onClick={() => {
                    if (imageAssetId) removeAsset(imageAssetId)
                    setImageAssetId(undefined)
                    setThumb(undefined)
                  }}
                >
                  Remover
                </button>
              )}
              <span className="muted" style={{ fontSize: 12 }}>
                A arte pronta, feita no app de design que você preferir.
              </span>
            </div>
            <input
              ref={artInput} type="file" accept="image/*" hidden
              onChange={e => e.target.files?.[0] && uploadArt(e.target.files[0])}
            />
          </div>
        </div>

        <div className="field">
          <label>Legenda</label>
          <textarea
            rows={5}
            value={caption}
            placeholder="A legenda pronta para colar na hora de publicar…"
            onChange={e => setCaption(e.target.value)}
          />
          <button
            className="btn ghost small"
            style={{ alignSelf: 'flex-start', marginTop: 8 }}
            disabled={!caption}
            onClick={copyCaption}
          >
            <I n={copied ? 'check' : 'note'} size={15} /> {copied ? 'Legenda copiada' : 'Copiar legenda'}
          </button>
        </div>

        <div className="field">
          <label>Roteiro vinculado</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select style={{ flex: 1 }} value={noteId} onChange={e => setNoteId(e.target.value)}>
              <option value="">Nenhum</option>
              {projNotes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.kind === 'roteiro' ? 'Roteiro · ' : 'Nota · '}{n.title || 'Sem título'}
                </option>
              ))}
            </select>
            {noteId && (
              <button className="btn notes small" onClick={() => onOpenNote(noteId)}>Abrir roteiro</button>
            )}
          </div>
        </div>

        <div className="actions">
          {onDelete && <button className="btn danger" onClick={onDelete}>Excluir</button>}
          <div className="spacer" />
          <button className="btn ghost" onClick={onClose}>Cancelar</button>
          <button
            className="btn primary"
            onClick={() =>
              onSave({
                title, projectId,
                date: date || undefined,
                time: time || undefined,
                status,
                format: format || undefined,
                caption: caption || undefined,
                imageAssetId,
                thumb,
                noteId: noteId || undefined,
              })
            }
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Calendar({ project, openPostId }: { project: Project; openPostId?: ID }) {
  const projects = useStore(s => s.projects)
  return <CalendarCore projects={projects} fixedProject={project} openPostId={openPostId} />
}
