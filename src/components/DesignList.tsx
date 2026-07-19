import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { useNav } from '../nav'
import { CATEGORIES, FORMATS, type Design, type Project } from '../types'
import { blankDesign, instantiateTemplate } from '../designOps'
import { I } from '../icons'

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.floor(h / 24)} d`
}

export default function DesignList({ project }: { project: Project }) {
  const allDesigns = useStore(s => s.designs)
  const addDesign = useStore(s => s.addDesign)
  const removeDesign = useStore(s => s.removeDesign)
  const go = useNav(s => s.go)
  const [cat, setCat] = useState<string>('todos')
  const [creating, setCreating] = useState(false)

  const designs = useMemo(
    () =>
      allDesigns
        .filter(d => d.projectId === project.id && !d.isTemplate)
        .filter(d => cat === 'todos' || d.category === cat)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    [allDesigns, project.id, cat],
  )
  const templates = useMemo(
    () => allDesigns.filter(d => d.projectId === project.id && d.isTemplate),
    [allDesigns, project.id],
  )

  const createBlank = (formatId: string) => {
    const d = addDesign(blankDesign(project.id, formatId, 'Novo design'))
    setCreating(false)
    go({ screen: 'design', projectId: project.id, designId: d.id })
  }

  const createFromTemplate = (tpl: Design) => {
    const d = addDesign(instantiateTemplate(tpl, tpl.name + ' (cópia)'))
    setCreating(false)
    go({ screen: 'design', projectId: project.id, designId: d.id })
  }

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-editor)' }}><I n="palette" size={24} /> Editor</h2>
        <div className="spacer" />
        <button className="btn editor" onClick={() => setCreating(true)}><I n="plus" size={18} /> Novo design</button>
      </div>

      <div className="chip-row">
        <button className={'chip' + (cat === 'todos' ? ' on' : '')} onClick={() => setCat('todos')}>
          Todos
        </button>
        {CATEGORIES.map(c => (
          <button key={c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      {designs.length === 0 ? (
        <div className="empty">
          <div className="big"><I n="image" size={34} /></div>
          <b>Nenhum design {cat !== 'todos' ? `em "${cat}"` : 'ainda'}</b>
          <p>Crie um design a partir de um formato pronto ou de um template salvo.</p>
        </div>
      ) : (
        <div className="design-grid">
          {designs.map(d => (
            <div key={d.id} style={{ position: 'relative' }}>
              <button
                className="design-card"
                style={{ width: '100%' }}
                onClick={() => go({ screen: 'design', projectId: project.id, designId: d.id })}
              >
                <div className="thumb">
                  {d.thumb ? <img src={d.thumb} alt="" /> : <I n="image" size={30} />}
                  <span className="fmt">{FORMATS.find(f => f.id === d.formatId)?.label ?? `${d.w}×${d.h}`}</span>
                </div>
                <div className="info">
                  <b>{d.name}</b>
                  <span>{d.category ? d.category + ' · ' : ''}{timeAgo(d.updatedAt)}</span>
                </div>
              </button>
              <button
                className="card-float-del"
                onClick={() => confirm(`Excluir "${d.name}"?`) && removeDesign(d.id)}
              >
                <I n="trash" size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {templates.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 18 }}><I n="grid" size={19} /> Meus templates</h2>
          </div>
          <div className="design-grid">
            {templates.map(t => (
              <div key={t.id} style={{ position: 'relative' }}>
                <button className="design-card" style={{ width: '100%' }} onClick={() => createFromTemplate(t)}>
                  <div className="thumb">
                    {t.thumb ? <img src={t.thumb} alt="" /> : <I n="grid" size={30} />}
                    <span className="fmt">{FORMATS.find(f => f.id === t.formatId)?.label}</span>
                  </div>
                  <div className="info">
                    <b>{t.name}</b>
                    <span>Toque para usar</span>
                  </div>
                </button>
                <button
                  className="card-float-del"
                  onClick={() => confirm(`Excluir template "${t.name}"?`) && removeDesign(t.id)}
                >
                  <I n="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {creating && (
        <div className="overlay" onClick={() => setCreating(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Novo design</h3>
            <div className="field">
              <label>Formatos prontos</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    className="btn ghost"
                    style={{ flexDirection: 'column', minHeight: 84, gap: 4 }}
                    onClick={() => createBlank(f.id)}
                  >
                    <span
                      style={{
                        display: 'block',
                        border: '2px solid var(--m-editor)',
                        borderRadius: 4,
                        height: 34,
                        aspectRatio: `${f.w} / ${f.h}`,
                      }}
                    />
                    {f.label}
                    <span className="muted" style={{ fontSize: 11 }}>{f.w} × {f.h}</span>
                  </button>
                ))}
              </div>
            </div>
            {templates.length > 0 && (
              <div className="field">
                <label>Ou use um template salvo</label>
                <div className="design-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
                  {templates.map(t => (
                    <button key={t.id} className="design-card" onClick={() => createFromTemplate(t)}>
                      <div className="thumb">
                        {t.thumb ? <img src={t.thumb} alt="" /> : <I n="grid" size={24} />}
                      </div>
                      <div className="info"><b>{t.name}</b></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
