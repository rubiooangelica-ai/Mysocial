import { useMemo, useState } from 'react'
import { getAssetUrlSync, useStore } from '../store'
import { useNav } from '../nav'
import { STATUS_LABEL, type Project } from '../types'
import { I } from '../icons'

const ACCENTS = ['#7c5cff', '#2f80ed', '#e8930c', '#0aa984', '#ef476f', '#118ab2', '#8338ec', '#fb5607']

function fmtDate(d: string) {
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

function ProjectCard({ project }: { project: Project }) {
  const go = useNav(s => s.go)
  const posts = useStore(s => s.posts)
  const designs = useStore(s => s.designs)

  const next = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return posts
      .filter(p => p.projectId === project.id && p.date && p.date >= today && p.status !== 'publicado')
      .sort((a, b) => (a.date! + (a.time ?? '')).localeCompare(b.date! + (b.time ?? '')))[0]
  }, [posts, project.id])

  const nextThumb = next?.designId
    ? designs.find(d => d.id === next.designId)?.thumb
    : undefined
  const logoUrl = project.brand.logoAssetId ? getAssetUrlSync(project.brand.logoAssetId) : undefined
  const nDesigns = useStore(s => s.designs.filter(d => d.projectId === project.id && !d.isTemplate).length)
  const nNotes = useStore(s => s.notes.filter(n => n.projectId === project.id).length)

  return (
    <button
      className="project-card"
      style={{ ['--accent' as string]: project.accent }}
      onClick={() => go({ screen: 'project', projectId: project.id, tab: 'editor' })}
    >
      <div className="head">
        <div className="logo" style={{ background: logoUrl ? 'transparent' : project.accent }}>
          {logoUrl ? <img src={logoUrl} alt="" /> : project.name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <h3>{project.name}</h3>
          <div className="meta">{nDesigns} designs · {nNotes} notas</div>
        </div>
      </div>
      {next ? (
        <div className="next-post">
          {nextThumb && <img src={nextThumb} alt="" />}
          <div>
            <b>Próximo: {fmtDate(next.date!)}{next.time ? ` · ${next.time}` : ''}</b>
            <div className="muted" style={{ fontSize: 12 }}>
              {next.title || STATUS_LABEL[next.status]}
            </div>
          </div>
        </div>
      ) : (
        <div className="next-post muted">Nenhum post agendado</div>
      )}
    </button>
  )
}

export default function Home() {
  const projects = useStore(s => s.projects)
  const addProject = useStore(s => s.addProject)
  const go = useNav(s => s.go)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [accent, setAccent] = useState(ACCENTS[0])

  const create = () => {
    if (!name.trim()) return
    const p = addProject(name.trim(), accent)
    setCreating(false)
    setName('')
    go({ screen: 'project', projectId: p.id, tab: 'editor' })
  }

  return (
    <div className="app">
      <div className="topbar">
        <h1 className="brand">MySocial</h1>
        <div className="spacer" />
        <button className="btn cal" onClick={() => go({ screen: 'global-cal' })}>
          <I n="calendar" size={18} /> Calendário geral
        </button>
      </div>
      <div className="screen">
        {projects.length === 0 && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="big"><I n="folder" size={34} /></div>
            <b>Bem-vinda ao seu estúdio de social media</b>
            <p>Crie um projeto para cada empresa/cliente.<br />Cada projeto reúne Editor, Calendário, Notas e Assistente de IA.</p>
          </div>
        )}
        <div className="project-grid">
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} />
          ))}
          <button className="card-new" onClick={() => setCreating(true)}>
            <span className="plus"><I n="plus" size={22} /></span>
            Novo projeto
          </button>
        </div>
      </div>

      {creating && (
        <div className="overlay" onClick={() => setCreating(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Novo projeto</h3>
            <div className="field">
              <label>Nome da empresa / cliente</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && create()}
                placeholder="Ex: Cafeteria Aroma"
              />
            </div>
            <div className="field">
              <label>Cor do projeto</label>
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
              <button className="btn primary" onClick={create}>Criar projeto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
