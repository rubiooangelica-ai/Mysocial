import { useStore } from '../store'
import { useNav } from '../nav'
import { CalendarCore } from './Calendar'
import { I } from '../icons'

// Visão consolidada: todos os clientes juntos, para enxergar a carga
// de trabalho da semana ou do mês inteiro.
export default function GlobalCalendar() {
  const projects = useStore(s => s.projects)
  const go = useNav(s => s.go)

  return (
    <div className="app">
      <div className="topbar">
        <button className="icon-btn" onClick={() => go({ screen: 'home' })}><I n="back" /></button>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--m-cal)' }}>
          <I n="calendar" size={22} /> Cronograma geral
        </h1>
        <div className="spacer" />
      </div>
      <div className="screen">
        {projects.length === 0 ? (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="big"><I n="calendar" size={34} /></div>
            <b>Cadastre um cliente primeiro</b>
            <p>O cronograma geral reúne os posts de todos os seus clientes.</p>
          </div>
        ) : (
          <CalendarCore projects={projects} />
        )}
      </div>
    </div>
  )
}
