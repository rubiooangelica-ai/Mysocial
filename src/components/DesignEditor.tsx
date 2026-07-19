import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getAssetUrlSync, fileToDataUrl, uid, useStore } from '../store'
import { useNav } from '../nav'
import {
  CATEGORIES, FORMATS, ICON_BANK, FONTS, PALETTE_PRESETS,
  type ID, type Layer, type ShapeKind, type TextLayer,
} from '../types'
import { exportDesign, makeThumb } from '../render'
import { resizeLayers } from '../designOps'
import { I } from '../icons'

type SideTab = 'marca' | 'camadas' | 'ajustes'

const MIN_SIZE = 24

export default function DesignEditor({ projectId, designId }: { projectId: ID; designId: ID }) {
  const design = useStore(s => s.designs.find(d => d.id === designId))
  const project = useStore(s => s.projects.find(p => p.id === projectId))
  const updateDesign = useStore(s => s.updateDesign)
  const setLayers = useStore(s => s.setLayers)
  const addDesign = useStore(s => s.addDesign)
  const addAsset = useStore(s => s.addAsset)
  const assets = useStore(s => s.assets)
  const go = useNav(s => s.go)

  const [selId, setSelId] = useState<ID | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('marca')
  const [exportOpen, setExportOpen] = useState(false)
  const [resizeOpen, setResizeOpen] = useState(false)
  const [scale, setScale] = useState(0.3)
  const stageRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── histórico (desfazer/refazer) ───
  const history = useRef<{ layers: Layer[]; bg: string }[]>([])
  const future = useRef<{ layers: Layer[]; bg: string }[]>([])
  const snapshot = useCallback(() => {
    if (!design) return
    history.current.push({ layers: design.layers, bg: design.bg })
    if (history.current.length > 60) history.current.shift()
    future.current = []
  }, [design])

  const undo = () => {
    if (!design || history.current.length === 0) return
    future.current.push({ layers: design.layers, bg: design.bg })
    const prev = history.current.pop()!
    updateDesign(design.id, { layers: prev.layers, bg: prev.bg })
  }
  const redo = () => {
    if (!design || future.current.length === 0) return
    history.current.push({ layers: design.layers, bg: design.bg })
    const nxt = future.current.pop()!
    updateDesign(design.id, { layers: nxt.layers, bg: nxt.bg })
  }

  // ─── escala do palco ───
  useEffect(() => {
    const el = stageRef.current
    if (!el || !design) return
    const compute = () => {
      const r = el.getBoundingClientRect()
      setScale(Math.min((r.width - 48) / design.w, (r.height - 48) / design.h))
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [design?.w, design?.h, design])

  const sel = useMemo(() => design?.layers.find(l => l.id === selId) ?? null, [design, selId])

  if (!design || !project) {
    go({ screen: 'project', projectId, tab: 'editor' })
    return null
  }
  const brand = project.brand

  const patchLayer = (id: ID, patch: Partial<Layer>, withSnapshot = false) => {
    if (withSnapshot) snapshot()
    setLayers(design.id, design.layers.map(l => (l.id === id ? ({ ...l, ...patch } as Layer) : l)))
  }

  const addLayer = (l: Layer) => {
    snapshot()
    setLayers(design.id, [...design.layers, l])
    setSelId(l.id)
    setSideTab('ajustes')
  }

  const center = (w: number, h: number) => ({ x: design.w / 2 - w / 2, y: design.h / 2 - h / 2 })

  const addText = (kind: 'title' | 'body') => {
    const size = kind === 'title' ? Math.round(design.w * 0.07) : Math.round(design.w * 0.035)
    const w = design.w * 0.8
    const h = size * 2.6
    addLayer({
      id: uid(), type: 'text',
      text: kind === 'title' ? 'Título' : 'Escreva seu texto aqui',
      font: kind === 'title' ? brand.headingFont : brand.bodyFont,
      size, color: brand.colors[0] ?? '#222222',
      align: 'center', lineHeight: 1.25, bold: kind === 'title', italic: false,
      ...center(w, h), w, h, rotation: 0, opacity: 1,
    })
  }

  const addShape = (shape: ShapeKind) => {
    const w = design.w * 0.4
    const h = shape === 'line' ? 24 : w
    addLayer({
      id: uid(), type: 'shape', shape,
      fill: brand.colors[1] ?? brand.colors[0] ?? '#4a4e69', radius: shape === 'rect' ? 16 : 0,
      ...center(w, h), w, h, rotation: 0, opacity: 1,
    })
  }

  const addIcon = (glyph: string) => {
    const s = design.w * 0.18
    addLayer({ id: uid(), type: 'icon', glyph, ...center(s, s), w: s, h: s, rotation: 0, opacity: 1 })
  }

  const addImage = (assetId: ID) => {
    const w = design.w * 0.6
    addLayer({ id: uid(), type: 'image', assetId, radius: 0, ...center(w, w), w, h: w, rotation: 0, opacity: 1 })
  }

  const uploadImage = async (file: File) => {
    const url = await fileToDataUrl(file)
    const asset = await addAsset({ projectId, name: file.name, kind: 'image' }, url)
    addImage(asset.id)
  }

  // ─── interação por toque: mover / redimensionar / girar ───
  const gesture = useRef<{
    mode: 'move' | 'resize' | 'rotate'
    layerId: ID
    startX: number
    startY: number
    orig: Layer
    moved: boolean
  } | null>(null)

  const onLayerPointerDown = (e: React.PointerEvent, l: Layer, mode: 'move' | 'resize' | 'rotate') => {
    e.stopPropagation()
    setSelId(l.id)
    gesture.current = { mode, layerId: l.id, startX: e.clientX, startY: e.clientY, orig: l, moved: false }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current
    if (!g) return
    const dx = (e.clientX - g.startX) / scale
    const dy = (e.clientY - g.startY) / scale
    if (!g.moved && Math.hypot(dx, dy) * scale > 3) {
      snapshot()
      g.moved = true
    }
    if (!g.moved) return
    if (g.mode === 'move') {
      patchLayer(g.layerId, { x: g.orig.x + dx, y: g.orig.y + dy })
    } else if (g.mode === 'resize') {
      const w = Math.max(MIN_SIZE, g.orig.w + dx)
      const h = Math.max(MIN_SIZE, g.orig.h + dy)
      const patch: Partial<Layer> = { w, h }
      if (g.orig.type === 'icon') {
        const s = Math.max(w, h)
        patch.w = s
        patch.h = s
      }
      patchLayer(g.layerId, patch)
    } else {
      // girar em torno do centro
      const frame = stageRef.current?.querySelector('.canvas-frame')?.getBoundingClientRect()
      if (!frame) return
      const cx = frame.left + (g.orig.x + g.orig.w / 2) * scale
      const cy = frame.top + (g.orig.y + g.orig.h / 2) * scale
      const ang = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90
      patchLayer(g.layerId, { rotation: Math.round(ang) })
    }
  }

  const onPointerUp = () => {
    gesture.current = null
  }

  // ─── camadas: ordem / duplicar / excluir ───
  const moveLayer = (id: ID, dir: 1 | -1) => {
    const idx = design.layers.findIndex(l => l.id === id)
    const j = idx + dir
    if (idx < 0 || j < 0 || j >= design.layers.length) return
    snapshot()
    const arr = [...design.layers]
    ;[arr[idx], arr[j]] = [arr[j], arr[idx]]
    setLayers(design.id, arr)
  }
  const duplicateLayer = (l: Layer) => {
    snapshot()
    const copy = { ...l, id: uid(), x: l.x + 30, y: l.y + 30 }
    setLayers(design.id, [...design.layers, copy])
    setSelId(copy.id)
  }
  const deleteLayer = (id: ID) => {
    snapshot()
    setLayers(design.id, design.layers.filter(l => l.id !== id))
    if (selId === id) setSelId(null)
  }

  const saveThumbAndBack = async () => {
    const thumb = await makeThumb(design)
    updateDesign(design.id, { thumb })
    go({ screen: 'project', projectId, tab: 'editor' })
  }

  const saveAsTemplate = async () => {
    const thumb = await makeThumb(design)
    addDesign({
      projectId, name: design.name + ' (template)',
      formatId: design.formatId, w: design.w, h: design.h, bg: design.bg,
      layers: design.layers.map(l => ({ ...l, id: uid() })),
      category: design.category, isTemplate: true, thumb,
    })
    alert('Template salvo! Ele aparece em "Meus templates" na lista de designs.')
  }

  const resizeTo = async (formatId: string) => {
    const f = FORMATS.find(x => x.id === formatId)!
    const layers = resizeLayers(design.layers, design.w, design.h, f.w, f.h)
    const nd = addDesign({
      projectId, name: `${design.name} · ${f.label}`,
      formatId: f.id, w: f.w, h: f.h, bg: design.bg, layers,
      category: design.category, isTemplate: false,
    })
    const thumb = await makeThumb({ ...nd })
    updateDesign(nd.id, { thumb })
    setResizeOpen(false)
    setSelId(null)
    go({ screen: 'design', projectId, designId: nd.id })
  }

  const projectImages = assets.filter(
    a => a.kind === 'image' && (!a.projectId || a.projectId === projectId),
  )

  const layerLabel = (l: Layer) =>
    l.type === 'text' ? `Texto: ${(l as TextLayer).text.slice(0, 18)}`
    : l.type === 'image' ? 'Imagem'
    : l.type === 'icon' ? `Ícone ${l.glyph}`
    : `Forma (${{ rect: 'retângulo', circle: 'círculo', triangle: 'triângulo', line: 'linha' }[l.shape]})`

  return (
    <div className="editor-root">
      <div className="editor-top">
        <button className="icon-btn" onClick={saveThumbAndBack}><I n="back" /></button>
        <input
          className="name"
          value={design.name}
          onChange={e => updateDesign(design.id, { name: e.target.value })}
        />
        <select
          className="dark"
          value={design.category ?? ''}
          onChange={e => updateDesign(design.id, { category: e.target.value || undefined })}
        >
          <option value="">Sem pasta</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="spacer" />
        <button className="icon-btn" onClick={undo} title="Desfazer"><I n="undo" size={18} /></button>
        <button className="icon-btn" onClick={redo} title="Refazer"><I n="redo" size={18} /></button>
        <button className="btn small dark" onClick={() => setResizeOpen(true)}><I n="resize" size={16} /> Formato</button>
        <button className="btn small dark" onClick={saveAsTemplate}><I n="grid" size={16} /> Salvar template</button>
        <button className="btn small editor" onClick={() => setExportOpen(true)}><I n="download" size={16} /> Exportar</button>
      </div>

      <div className="editor-main">
        <div className="tool-rail">
          <button className="icon-btn" title="Título" onClick={() => addText('title')}>T</button>
          <button className="icon-btn" title="Texto" style={{ fontSize: 14 }} onClick={() => addText('body')}>t</button>
          <button className="icon-btn" title="Imagem" onClick={() => fileRef.current?.click()}><I n="image" /></button>
          <button className="icon-btn" title="Retângulo" onClick={() => addShape('rect')}>▭</button>
          <button className="icon-btn" title="Círculo" onClick={() => addShape('circle')}>◯</button>
          <button className="icon-btn" title="Triângulo" onClick={() => addShape('triangle')}>△</button>
          <button className="icon-btn" title="Linha" onClick={() => addShape('line')}>—</button>
          <input
            ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])}
          />
        </div>

        <div
          ref={stageRef}
          className="editor-stage"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerDown={() => setSelId(null)}
        >
          <div
            className="canvas-frame"
            style={{ width: design.w * scale, height: design.h * scale, background: design.bg }}
          >
            {design.layers.map(l => {
              const isSel = l.id === selId
              const base: React.CSSProperties = {
                left: l.x * scale,
                top: l.y * scale,
                width: l.w * scale,
                height: l.h * scale,
                opacity: l.opacity,
                transform: `rotate(${l.rotation}deg)`,
                touchAction: 'none',
              }
              return (
                <div
                  key={l.id}
                  className={'layer-el' + (isSel ? ' selected' : '')}
                  style={base}
                  onPointerDown={e => onLayerPointerDown(e, l, 'move')}
                >
                  {l.type === 'text' && (
                    <div
                      style={{
                        fontFamily: `"${l.font}", sans-serif`,
                        fontSize: l.size * scale,
                        color: l.color,
                        textAlign: l.align,
                        lineHeight: l.lineHeight,
                        fontWeight: l.bold ? 700 : 400,
                        fontStyle: l.italic ? 'italic' : 'normal',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        width: '100%',
                      }}
                    >
                      {l.text}
                    </div>
                  )}
                  {l.type === 'image' && (() => {
                    const url = getAssetUrlSync(l.assetId)
                    return url ? (
                      <img
                        src={url} alt="" draggable={false}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: l.radius * scale, pointerEvents: 'none' }}
                      />
                    ) : null
                  })()}
                  {l.type === 'shape' && (
                    <div
                      style={{
                        width: '100%', height: '100%', background: l.shape === 'line' ? 'transparent' : l.fill,
                        borderRadius: l.shape === 'circle' ? '50%' : l.shape === 'rect' ? l.radius * scale : 0,
                        clipPath: l.shape === 'triangle' ? 'polygon(50% 0, 100% 100%, 0 100%)' : undefined,
                        display: 'flex', alignItems: 'center',
                      }}
                    >
                      {l.shape === 'line' && (
                        <div style={{ width: '100%', height: Math.max(2, l.h * 0.08 * scale), background: l.fill }} />
                      )}
                    </div>
                  )}
                  {l.type === 'icon' && (
                    <div style={{ fontSize: Math.min(l.w, l.h) * 0.85 * scale, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      {l.glyph}
                    </div>
                  )}
                  {isSel && (
                    <>
                      <div className="handle br" onPointerDown={e => onLayerPointerDown(e, l, 'resize')}><I n="resize" size={15} /></div>
                      <div className="handle rot" onPointerDown={e => onLayerPointerDown(e, l, 'rotate')}><I n="rotate" size={15} /></div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="editor-side">
          <div className="side-tabs">
            <button className={sideTab === 'marca' ? 'on' : ''} onClick={() => setSideTab('marca')}>Marca</button>
            <button className={sideTab === 'camadas' ? 'on' : ''} onClick={() => setSideTab('camadas')}>Camadas</button>
            <button className={sideTab === 'ajustes' ? 'on' : ''} onClick={() => setSideTab('ajustes')}>Ajustes</button>
          </div>

          <div className="side-body">
            {sideTab === 'marca' && (
              <>
                <div className="field">
                  <label>Cores da marca</label>
                  <div className="swatch-row">
                    {brand.colors.map((c, i) => (
                      <button
                        key={i} className="swatch" style={{ background: c }}
                        onClick={() => {
                          if (!sel) { snapshot(); updateDesign(design.id, { bg: c }); return }
                          if (sel.type === 'text') patchLayer(sel.id, { color: c }, true)
                          else if (sel.type === 'shape') patchLayer(sel.id, { fill: c }, true)
                          else { snapshot(); updateDesign(design.id, { bg: c }) }
                        }}
                      />
                    ))}
                  </div>
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {sel ? 'Aplica no elemento selecionado.' : 'Sem seleção: aplica no fundo.'}
                  </p>
                </div>
                <div className="field">
                  <label>Fontes da marca</label>
                  <button className="btn ghost" style={{ fontFamily: brand.headingFont, justifyContent: 'flex-start' }}
                    onClick={() => sel?.type === 'text' && patchLayer(sel.id, { font: brand.headingFont }, true)}>
                    Aa · {brand.headingFont}
                  </button>
                  <button className="btn ghost" style={{ fontFamily: brand.bodyFont, justifyContent: 'flex-start', marginTop: 8 }}
                    onClick={() => sel?.type === 'text' && patchLayer(sel.id, { font: brand.bodyFont }, true)}>
                    Aa · {brand.bodyFont}
                  </button>
                </div>
                {brand.logoAssetId && (
                  <div className="field">
                    <label>Logo</label>
                    <button className="btn ghost" onClick={() => addImage(brand.logoAssetId!)}><I n="plus" size={16} /> Inserir logo</button>
                  </div>
                )}
                {brand.elementAssetIds.length > 0 && (
                  <div className="field">
                    <label>Elementos da marca</label>
                    <div className="asset-grid">
                      {brand.elementAssetIds.map(id => {
                        const url = getAssetUrlSync(id)
                        return (
                          <button key={id} onClick={() => addImage(id)}>
                            {url ? <img src={url} alt="" /> : '…'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
                <div className="field">
                  <label>Banco de ícones</label>
                  <div className="icon-grid">
                    {ICON_BANK.map(g => (
                      <button key={g} onClick={() => addIcon(g)}>{g}</button>
                    ))}
                  </div>
                </div>
                {projectImages.length > 0 && (
                  <div className="field">
                    <label>Minhas imagens</label>
                    <div className="asset-grid">
                      {projectImages.map(a => {
                        const url = getAssetUrlSync(a.id)
                        return (
                          <button key={a.id} onClick={() => addImage(a.id)}>
                            {url ? <img src={url} alt={a.name} /> : '…'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {sideTab === 'camadas' && (
              <>
                <div className="field">
                  <label>Fundo</label>
                  <div className="range-row">
                    <input
                      type="color" value={design.bg}
                      onChange={e => updateDesign(design.id, { bg: e.target.value })}
                    />
                    <span className="muted">{design.bg}</span>
                  </div>
                </div>
                <div className="field">
                  <label>Camadas (topo primeiro)</label>
                  {design.layers.length === 0 && <p className="muted">Nenhuma camada ainda.</p>}
                  {[...design.layers].reverse().map(l => (
                    <div
                      key={l.id}
                      className={'layer-row' + (l.id === selId ? ' on' : '')}
                      onClick={() => setSelId(l.id)}
                      style={{ marginBottom: 8 }}
                    >
                      <span className="grow">{layerLabel(l)}</span>
                      <button onClick={e => { e.stopPropagation(); moveLayer(l.id, 1) }} title="Para frente">▲</button>
                      <button onClick={e => { e.stopPropagation(); moveLayer(l.id, -1) }} title="Para trás">▼</button>
                      <button onClick={e => { e.stopPropagation(); duplicateLayer(l) }} title="Duplicar">⧉</button>
                      <button onClick={e => { e.stopPropagation(); deleteLayer(l.id) }} title="Excluir"><I n="trash" size={16} /></button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sideTab === 'ajustes' && !sel && (
              <p className="muted">Toque em um elemento no canvas para editar suas propriedades.</p>
            )}

            {sideTab === 'ajustes' && sel && (
              <>
                {sel.type === 'text' && (
                  <>
                    <div className="field">
                      <label>Texto</label>
                      <textarea
                        rows={3}
                        value={sel.text}
                        onChange={e => patchLayer(sel.id, { text: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Fonte</label>
                      <select value={sel.font} onChange={e => patchLayer(sel.id, { font: e.target.value }, true)}>
                        {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
                      </select>
                    </div>
                    <div className="prop-grid">
                      <div className="field">
                        <label>Tamanho</label>
                        <input
                          type="number" value={sel.size} min={8}
                          onChange={e => patchLayer(sel.id, { size: Number(e.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label>Cor</label>
                        <input type="color" value={sel.color} onChange={e => patchLayer(sel.id, { color: e.target.value })} />
                      </div>
                    </div>
                    <div className="field">
                      <label>Alinhamento e estilo</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {(['left', 'center', 'right'] as const).map(a => (
                          <button key={a} className={'icon-btn' + (sel.align === a ? ' on' : '')}
                            onClick={() => patchLayer(sel.id, { align: a }, true)}>
                            {a === 'left' ? '⇤' : a === 'center' ? '☰' : '⇥'}
                          </button>
                        ))}
                        <button className={'icon-btn' + (sel.bold ? ' on' : '')} style={{ fontWeight: 800 }}
                          onClick={() => patchLayer(sel.id, { bold: !sel.bold }, true)}>B</button>
                        <button className={'icon-btn' + (sel.italic ? ' on' : '')} style={{ fontStyle: 'italic' }}
                          onClick={() => patchLayer(sel.id, { italic: !sel.italic }, true)}>I</button>
                      </div>
                    </div>
                    <div className="field">
                      <label>Espaçamento entre linhas · {sel.lineHeight.toFixed(2)}</label>
                      <input
                        type="range" min={0.9} max={2.4} step={0.05} value={sel.lineHeight}
                        onChange={e => patchLayer(sel.id, { lineHeight: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}

                {sel.type === 'shape' && (
                  <>
                    <div className="field">
                      <label>Cor de preenchimento</label>
                      <input type="color" value={sel.fill} onChange={e => patchLayer(sel.id, { fill: e.target.value })} />
                    </div>
                    <div className="field">
                      <label>Cores rápidas</label>
                      <div className="swatch-row">
                        {[...brand.colors, ...PALETTE_PRESETS.slice(0, 8)].map((c, i) => (
                          <button key={i} className="swatch" style={{ background: c }}
                            onClick={() => patchLayer(sel.id, { fill: c }, true)} />
                        ))}
                      </div>
                    </div>
                    {sel.shape === 'rect' && (
                      <div className="field">
                        <label>Cantos arredondados · {sel.radius}</label>
                        <input type="range" min={0} max={200} value={sel.radius}
                          onChange={e => patchLayer(sel.id, { radius: Number(e.target.value) })} />
                      </div>
                    )}
                  </>
                )}

                {sel.type === 'image' && (
                  <div className="field">
                    <label>Cantos arredondados · {sel.radius}</label>
                    <input type="range" min={0} max={400} value={sel.radius}
                      onChange={e => patchLayer(sel.id, { radius: Number(e.target.value) })} />
                  </div>
                )}

                <div className="field">
                  <label>Opacidade · {Math.round(sel.opacity * 100)}%</label>
                  <input type="range" min={0.05} max={1} step={0.05} value={sel.opacity}
                    onChange={e => patchLayer(sel.id, { opacity: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label>Rotação · {sel.rotation}°</label>
                  <input type="range" min={-180} max={180} value={sel.rotation}
                    onChange={e => patchLayer(sel.id, { rotation: Number(e.target.value) })} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn ghost" onClick={() => duplicateLayer(sel)}>⧉ Duplicar</button>
                  <button className="btn danger" onClick={() => deleteLayer(sel.id)}><I n="trash" size={16} /> Excluir</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {exportOpen && (
        <div className="overlay" onClick={() => setExportOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3><I n="download" /> Exportar design</h3>
            <p className="muted">A imagem é baixada pronta para postagem manual.</p>
            <div className="prop-grid">
              <button className="btn primary" onClick={() => { exportDesign(design, 'png', 1); setExportOpen(false) }}>
                PNG · {design.w}×{design.h}
              </button>
              <button className="btn primary" onClick={() => { exportDesign(design, 'png', 2); setExportOpen(false) }}>
                PNG · {design.w * 2}×{design.h * 2}
              </button>
              <button className="btn ghost" onClick={() => { exportDesign(design, 'jpg', 1); setExportOpen(false) }}>
                JPG · {design.w}×{design.h}
              </button>
              <button className="btn ghost" onClick={() => { exportDesign(design, 'jpg', 2); setExportOpen(false) }}>
                JPG · {design.w * 2}×{design.h * 2}
              </button>
            </div>
          </div>
        </div>
      )}

      {resizeOpen && (
        <div className="overlay" onClick={() => setResizeOpen(false)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3><I n="resize" /> Redimensionar para outro formato</h3>
            <p className="muted">
              Cria uma cópia deste design no novo formato, com os elementos ajustados
              proporcionalmente — você pode refinar manualmente depois.
            </p>
            {FORMATS.filter(f => f.id !== design.formatId).map(f => (
              <button key={f.id} className="btn ghost" onClick={() => resizeTo(f.id)}>
                {f.label} · {f.w}×{f.h}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
