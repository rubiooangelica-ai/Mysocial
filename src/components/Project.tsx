import { useStore } from '../store'
import { useNav, type Tab } from '../nav'
import type { ID } from '../types'
import Calendar from './Calendar'
import Notes from './Notes'
import Inspirations from './Inspirations'
import Ai from './Ai'
import { I } from '../icons'

const TABS: { id: Tab; label: string; ic: string; cls: string }[] = [
  { id: 'cronograma', label: 'Cronograma', ic: 'calendar', cls: 'on-cal' },
  { id: 'roteiros', label: 'Roteiros & Ideias', ic: 'note', cls: 'on-notes' },
  { id: 'inspiracoes', label: 'Inspirações', ic: 'palette', cls: 'on-editor' },
  { id: 'ia', label: 'Assistente IA', ic: 'sparkle', cls: 'on-ai' },
]

export default function Project({
  projectId, tab, noteId, postId,
}: { projectId: ID; tab: Tab; noteId?: ID; postId?: ID }) {
  const project = useStore(s => s.projects.find(p => p.id === projectId))
  const removeProject = useStore(s => s.removeProject)
  const go = useNav(s => s.go)

  if (!project) {
    go({ screen: 'home' })
    return null
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => go({ screen: 'home' })}><I n="back" /></button>
        <h1 style={{ color: project.accent }}>{project.name}</h1>
        <div className="spacer" />
        <button
          className="icon-btn"
          title="Excluir cliente"
          onClick={() => {
            if (confirm(`Excluir "${project.name}" e todo o conteúdo dele?`)) {
              removeProject(project.id)
              go({ screen: 'home' })
            }
          }}
        >
          <I n="trash" size={18} />
        </button>
      </div>

      <div className="screen">
        {tab === 'cronograma' && <Calendar project={project} openPostId={postId} />}
        {tab === 'roteiros' && <Notes project={project} openNoteId={noteId} />}
        {tab === 'inspiracoes' && <Inspirations project={project} />}
        {tab === 'ia' && <Ai project={project} />}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' ' + t.cls : '')}
            onClick={() => go({ screen: 'project', projectId, tab: t.id })}
          >
            <I n={t.ic} size={22} />
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
