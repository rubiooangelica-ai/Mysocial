import { useMemo, useState } from 'react'
import { getAssetUrlSync, isoDate, shortDate, todayIso, useStore } from '../store'
import { useNav } from '../nav'
import { STATUS_LABEL, type Post, type Project } from '../types'
import { I } from '../icons'

const ACCENTS = ['#e07a9f', '#a183d9', '#e5926f', '#5fb8a5', '#d98da8', '#7d9be3', '#c99ad9', '#e3a75f']

const DOW_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`

const STATUS_COLOR: Record<string, string> = {
  rascunho: 'var(--st-rascunho)',
  aprovado: 'var(--st-aprovado)',
  agendado: 'var(--st-agendado)',
  publicado: 'var(--st-publicado)',
}

/** Próximos 7 dias a partir de hoje. */
function nextWeek(): { iso: string; dow: string; day: string; today: boolean }[] {
  const out = []
  const base = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    out.push({
      iso: isoDate(d),
      dow: DOW_SHORT[d.getDay()],
      day: String(d.getDate()),
      today: i === 0,
    })
  }
  return out
}

function ProjectCard({ project }: { project: Project }) {
  const go = useNav(s => s.go)
  const posts = useStore(s => s.posts)
  const nNotes = useStore(s => s.notes.filter(n => n.projectId === project.id).length)

  const next = useMemo(() => {
    const today = todayIso()
    return posts
      .filter(p => p.projectId === project.id && p.date && p.date >= today && p.status !== 'publicado')
      .sort((a, b) => (a.date! + (a.time ?? '')).localeCompare(b.date! + (b.time ?? '')))[0]
  }, [posts, project.id])

  const nPosts = posts.filter(p => p.projectId === project.id).length
  const logoUrl = project.brand.logoAssetId ? getAssetUrlSync(project.brand.logoAssetId) : undefined

  return (
    <button
      className="project-card"
      style={{ ['--accent' as string]: project.accent }}
      onClick={() => go({ screen: 'project', projectId: project.id, tab: 'cronograma' })}
    >
      <div className="head">
        <div className="logo" style={{ background: logoUrl ? 'transparent' : project.accent }}>
          {logoUrl ? <img src={logoUrl} alt="" /> : project.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h3>{project.name}</h3>
          <div className="meta">
            {plural(nPosts, 'post', 'posts')} · {plural(nNotes, 'ideia', 'ideias')}
          </div>
        </div>
      </div>
      {next ? (
        <div className="next-post">
          {next.thumb && <img src={next.thumb} alt="" />}
          <div>
            <b>Próximo: {shortDate(next.date!)}{next.time ? ` · ${next.time}` : ''}</b>
            <div className="muted" style={{ fontSize: 12 }}>
              {next.title || STATUS_LABEL[next.status]}
            </div>
          </div>
        </div>
      ) : (
        <div className="next-post muted">Nada agendado por enquanto</div>
      )}
    </button>
  )
}

export default function Home() {
  const projects = useStore(s => s.projects)
  const posts = useStore(s => s.posts)
  const notes = useStore(s => s.notes)
  const addProject = useStore(s => s.addProject)
  const go = useNav(s => s.go)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [accent, setAccent] = useState(ACCENTS[0])

  const week = useMemo(nextWeek, [])
  const weekEnd = week[6].iso
  const today = week[0].iso

  const weekPosts = posts.filter(p => p.date && p.date >= today && p.date <= weekEnd)
  const waiting = posts.filter(p => p.status === 'rascunho' || p.status === 'aprovado').length
  const backlog = posts.filter(p => !p.date).length
  const loose = notes.filter(n => !n.postId).length

  const projectOf = (p: Post) => projects.find(x => x.id === p.projectId)

  const create = () => {
    if (!name.trim()) return
    const p = addProject(name.trim(), accent)
    setCreating(false)
    setName('')
    go({ screen: 'project', projectId: p.id, tab: 'cronograma' })
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="brand">MySocial</h1>
        <div className="spacer" />
        <button className="btn cal" onClick={() => go({ screen: 'global-cal' })}>
          <I n="calendar" size={18} /> Cronograma geral
        </button>
      </div>

      <div className="screen">
        {projects.length === 0 ? (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="big"><I n="folder" size={34} /></div>
            <b>Seu painel de trabalho começa aqui</b>
            <p>
              Crie um projeto para cada cliente.<br />
              Dentro dele ficam o cronograma, os roteiros, as ideias e as inspirações.
            </p>
          </div>
        ) : (
          <div className="section">
            <div className="section-head">
              <h2>Sua semana</h2>
            </div>

            <div className="stat-row">
              <div className="stat">
                <b>{weekPosts.length}</b>
                <span>{weekPosts.length === 1 ? 'post nos próximos 7 dias' : 'posts nos próximos 7 dias'}</span>
              </div>
              <div className="stat">
                <b>{waiting}</b>
                <span>aguardando aprovação</span>
              </div>
              <div className="stat">
                <b>{backlog}</b>
                <span>{backlog === 1 ? 'post sem data' : 'posts sem data'}</span>
              </div>
              <div className="stat">
                <b>{loose}</b>
                <span>{loose === 1 ? 'ideia no banco' : 'ideias no banco'}</span>
              </div>
            </div>

            <div className="week-strip">
              {week.map(d => {
                const dayPosts = posts
                  .filter(p => p.date === d.iso)
                  .sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'))
                return (
                  <div key={d.iso} className={'day-col' + (d.today ? ' today' : '')}>
                    <div className="day-head">
                      <span className="dow">{d.dow}</span>
                      <span className="day">{d.day}</span>
                    </div>
                    {dayPosts.length === 0 && <span className="day-free">livre</span>}
                    {dayPosts.map(p => {
                      const proj = projectOf(p)
                      return (
                        <button
                          key={p.id}
                          className="day-post"
                          style={{ ['--pcolor' as string]: proj?.accent }}
                          onClick={() =>
                            go({ screen: 'project', projectId: p.projectId, tab: 'cronograma', postId: p.id })
                          }
                        >
                          <span className="cli">{proj?.name}</span>
                          <span className="ttl">{p.time ? `${p.time} · ` : ''}{p.title || 'Post'}</span>
                          <span className="st" style={{ color: STATUS_COLOR[p.status] }}>
                            {STATUS_LABEL[p.status]}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>

            <div className="section-head" style={{ marginTop: 10 }}>
              <h2>Clientes</h2>
            </div>
          </div>
        )}

        <div className="project-grid">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <button className="card-new" onClick={() => setCreating(true)}>
            <span className="plus"><I n="plus" size={22} /></span>
            Novo cliente
          </button>
        </div>
      </div>

      {creating && (
        <div className="overlay" onClick={() => setCreating(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Novo cliente</h3>
            <div className="field">
              <label>Nome da empresa</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="Ex: Cafeteria Aroma"
              />
            </div>
            <div className="field">
              <label>Cor do cliente</label>
              <div className="swatch-row">
                {ACCENTS.map(c => (
                  <button
                    key={c}
                    className={'swatch' + (accent === c ? ' on' : '')}
                    style={{ background: c }}
                    onClick={() => setAccent(c)}
                  />
                ))}
              </div>
            </div>
            <div className="actions">
              <button className="btn ghost" onClick={() => setCreating(false)}>Cancelar</button>
              <button className="btn primary" onClick={create}>Criar cliente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
