import { useStore } from '../store'
import { useNav } from '../nav'
import { CalendarCore } from './Calendar'

// Visão consolidada: todos os projetos juntos, para enxergar a carga
// de trabalho da semana/mês inteira.
export default function GlobalCalendar() {
  const projects = useStore(s => s.projects)
  const go = useNav(s => s.go)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => go({ screen: 'home' })}>←</button>
        <h1>📅 Calendário geral</h1>
        <div className="spacer" />
      </div>
      <div className="screen">
        {projects.length === 0 ? (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="big">📅</div>
            <b>Crie um projeto primeiro</b>
            <p>O calendário geral mostra os posts de todos os seus clientes juntos.</p>
          </div>
        ) : (
          <CalendarCore projects={projects} />
        )}
      </div>
    </div>
  )
}
