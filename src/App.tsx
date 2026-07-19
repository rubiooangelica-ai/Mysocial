import { useEffect } from 'react'
import { useStore } from './store'
import { useNav } from './nav'
import Home from './components/Home'
import Project from './components/Project'
import DesignEditor from './components/DesignEditor'
import GlobalCalendar from './components/GlobalCalendar'

export default function App() {
  const hydrated = useStore(s => s.hydrated)
  const hydrate = useStore(s => s.hydrate)
  const route = useNav(s => s.route)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!hydrated) {
    return (
      <div className="app" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="spin" />
      </div>
    )
  }

  switch (route.screen) {
    case 'home':
      return <Home />
    case 'global-cal':
      return <GlobalCalendar />
    case 'project':
      return <Project projectId={route.projectId} tab={route.tab} noteId={route.noteId} />
    case 'design':
      return <DesignEditor projectId={route.projectId} designId={route.designId} />
  }
}
