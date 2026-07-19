import { useState } from 'react'
import { useStore } from '../store'
import { useNav, type Tab } from '../nav'
import type { ID } from '../types'
import DesignList from './DesignList'
import Calendar from './Calendar'
import Notes from './Notes'
import Ai from './Ai'
import BrandKitSheet from './BrandKitSheet'

const TABS: { id: Tab; label: string; ic: string; cls: string }[] = [
  { id: 'editor', label: 'Editor', ic: '🎨', cls: 'on-editor' },
  { id: 'calendario', label: 'Calendário', ic: '📅', cls: 'on-cal' },
  { id: 'notas', label: 'Notas', ic: '📝', cls: 'on-notes' },
  { id: 'ia', label: 'Assistente IA', ic: '✨', cls: 'on-ai' },
]

export default function Project({ projectId, tab, noteId }: { projectId: ID; tab: Tab; noteId?: ID }) {
  const project = useStore(s => s.projects.find(p => p.id === projectId))
  const removeProject = useStore(s => s.removeProject)
  const go = useNav(s => s.go)
  const [brandOpen, setBrandOpen] = useState(false)

  if (!project) {
    go({ screen: 'home' })
    return null
  }

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => go({ screen: 'home' })}>←</button>
        <h1 style={{ color: project.accent }}>{project.name}</h1>
        <div className="spacer" />
        <button className="btn ghost" onClick={() => setBrandOpen(true)}>🎨 Kit de Marca</button>
        <button
          className="icon-btn"
          title="Excluir projeto"
          onClick={() => {
            if (confirm(`Excluir o projeto "${project.name}" e todo o seu conteúdo?`)) {
              removeProject(project.id)
              go({ screen: 'home' })
            }
          }}
        >
          🗑️
        </button>
      </div>

      <div className="screen">
        {tab === 'editor' && <DesignList project={project} />}
        {tab === 'calendario' && <Calendar project={project} />}
        {tab === 'notas' && <Notes project={project} openNoteId={noteId} />}
        {tab === 'ia' && <Ai project={project} />}
      </div>

      <div className="tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={'tab' + (tab === t.id ? ' ' + t.cls : '')}
            onClick={() => go({ screen: 'project', projectId, tab: t.id })}
          >
            <span className="ic">{t.ic}</span>
            {t.label}
          </button>
        ))}
      </div>

      {brandOpen && <BrandKitSheet project={project} onClose={() => setBrandOpen(false)} />}
    </div>
  )
}
