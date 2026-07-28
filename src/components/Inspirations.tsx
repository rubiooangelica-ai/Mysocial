import { useRef, useState } from 'react'
import { fileToDataUrl, getAssetUrlSync, useStore } from '../store'
import { FONTS, type AssetMeta, type Project } from '../types'
import { I } from '../icons'

/** Mural de referências do cliente + a marca dele em um lugar só. */
export default function Inspirations({ project }: { project: Project }) {
  const assets = useStore(s => s.assets)
  const addAsset = useStore(s => s.addAsset)
  const updateAsset = useStore(s => s.updateAsset)
  const removeAsset = useStore(s => s.removeAsset)
  const updateProject = useStore(s => s.updateProject)
  const updateBrand = useStore(s => s.updateBrand)

  const brand = project.brand
  const links = project.inspirationLinks ?? []
  const [newLink, setNewLink] = useState('')
  const [newColor, setNewColor] = useState('#e07a9f')
  const [openAsset, setOpenAsset] = useState<AssetMeta | null>(null)
  const inspInput = useRef<HTMLInputElement>(null)
  const logoInput = useRef<HTMLInputElement>(null)

  const inspirations = assets.filter(a => a.projectId === project.id && a.kind === 'inspiration')
  const logoUrl = brand.logoAssetId ? getAssetUrlSync(brand.logoAssetId) : undefined

  const upload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const url = await fileToDataUrl(file, 1400)
      await addAsset({ projectId: project.id, name: file.name, kind: 'inspiration' }, url)
    }
  }

  const uploadLogo = async (file: File) => {
    const url = await fileToDataUrl(file, 800)
    const asset = await addAsset({ projectId: project.id, name: file.name, kind: 'logo' }, url)
    if (brand.logoAssetId) removeAsset(brand.logoAssetId)
    updateBrand(project.id, { logoAssetId: asset.id })
  }

  return (
    <div className="section">
      <div className="section-head">
        <h2 style={{ color: 'var(--m-editor)' }}><I n="palette" size={24} /> Inspirações & Marca</h2>
        <div className="spacer" />
        <button className="btn editor" onClick={() => inspInput.current?.click()}>
          <I n="plus" size={18} /> Adicionar referência
        </button>
        <input
          ref={inspInput} type="file" accept="image/*" multiple hidden
          onChange={e => e.target.files && upload(e.target.files)}
        />
      </div>

      <p className="muted">
        O mural de referências deste cliente. O assistente de IA usa estas imagens e links
        para entender a cara da marca.
      </p>

      {inspirations.length === 0 ? (
        <div className="empty">
          <div className="big"><I n="image" size={34} /></div>
          <b>Mural vazio</b>
          <p>Salve prints, fotos e paletas que representam a marca deste cliente.</p>
        </div>
      ) : (
        <div className="mood-grid">
          {inspirations.map(a => {
            const url = getAssetUrlSync(a.id)
            return (
              <button key={a.id} className="mood-card" onClick={() => setOpenAsset(a)}>
                {url && <img src={url} alt={a.name} />}
                {a.note && <span className="mood-note">{a.note}</span>}
              </button>
            )
          })}
        </div>
      )}

      <div className="board">
        <h3><I n="link" size={18} /> Links de referência</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 200 }}
            value={newLink}
            onChange={e => setNewLink(e.target.value)}
            placeholder="https://perfil-ou-site-de-referencia.com"
          />
          <button
            className="btn ghost"
            disabled={!newLink.trim()}
            onClick={() => {
              updateProject(project.id, { inspirationLinks: [...links, newLink.trim()] })
              setNewLink('')
            }}
          >
            <I n="plus" size={15} /> Salvar link
          </button>
        </div>
        {links.length > 0 && (
          <div className="link-list">
            {links.map((l, i) => (
              <div key={i} className="link-row">
                <a href={l} target="_blank" rel="noreferrer">
                  <I n="link" size={15} /> {l.replace(/^https?:\/\//, '')}
                </a>
                <button
                  className="icon-btn"
                  style={{ width: 36, height: 36 }}
                  onClick={() =>
                    updateProject(project.id, { inspirationLinks: links.filter((_, j) => j !== i) })
                  }
                >
                  <I n="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="board">
        <h3><I n="palette" size={18} /> A marca deste cliente</h3>
        <p className="muted">
          A referência que você consulta na hora de criar a arte em outro app — e que a IA
          usa para escrever no tom certo.
        </p>

        <div className="field">
          <label>Paleta</label>
          <div className="swatch-row">
            {brand.colors.map((c, i) => (
              <button
                key={i}
                className="swatch"
                style={{ background: c }}
                title={`${c} · toque para copiar, segure para remover`}
                onClick={() => navigator.clipboard?.writeText(c)}
                onContextMenu={e => {
                  e.preventDefault()
                  updateBrand(project.id, { colors: brand.colors.filter((_, j) => j !== i) })
                }}
              />
            ))}
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} />
            <button
              className="btn small ghost"
              onClick={() => updateBrand(project.id, { colors: [...brand.colors, newColor] })}
            >
              <I n="plus" size={15} /> Cor
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Toque em uma cor para copiar o código dela.
          </p>
          <div className="hex-row">
            {brand.colors.map((c, i) => (
              <span key={i} className="hex">{c.toUpperCase()}</span>
            ))}
          </div>
        </div>

        <div className="prop-grid">
          <div className="field">
            <label>Fonte de títulos</label>
            <select
              value={brand.headingFont}
              onChange={e => updateBrand(project.id, { headingFont: e.target.value })}
            >
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Fonte de texto</label>
            <select
              value={brand.bodyFont}
              onChange={e => updateBrand(project.id, { bodyFont: e.target.value })}
            >
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
        <div className="type-preview">
          <div style={{ fontFamily: brand.headingFont, fontSize: 24, fontWeight: 700 }}>
            Título em {brand.headingFont}
          </div>
          <div style={{ fontFamily: brand.bodyFont, fontSize: 15 }}>
            Texto corrido em {brand.bodyFont} — prévia das fontes da marca.
          </div>
        </div>

        <div className="field">
          <label>Logo</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt="logo"
                style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 14, background: 'var(--surface-2)' }}
              />
            )}
            <button className="btn ghost small" onClick={() => logoInput.current?.click()}>
              <I n="image" size={15} /> {logoUrl ? 'Trocar logo' : 'Enviar logo'}
            </button>
            {logoUrl && (
              <button
                className="btn danger small"
                onClick={() => {
                  if (brand.logoAssetId) removeAsset(brand.logoAssetId)
                  updateBrand(project.id, { logoAssetId: undefined })
                }}
              >
                Remover
              </button>
            )}
            <input
              ref={logoInput} type="file" accept="image/*" hidden
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
          </div>
        </div>

        <div className="field">
          <label>Tom de voz e personalidade</label>
          <textarea
            rows={4}
            value={brand.voice}
            placeholder="Ex: Acolhedora e leve, fala com jovens adultos, evita jargões…"
            onChange={e => updateBrand(project.id, { voice: e.target.value })}
          />
        </div>
      </div>

      {openAsset && (
        <div className="overlay" onClick={() => setOpenAsset(null)}>
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <h3>Referência</h3>
            {getAssetUrlSync(openAsset.id) && (
              <img
                src={getAssetUrlSync(openAsset.id)}
                alt=""
                style={{ width: '100%', borderRadius: 16, maxHeight: '46vh', objectFit: 'contain', background: 'var(--surface-2)' }}
              />
            )}
            <div className="field">
              <label>O que te chamou atenção aqui</label>
              <textarea
                rows={3}
                value={openAsset.note ?? ''}
                placeholder="Ex: gostei da paleta e do jeito que o texto fica no canto"
                onChange={e => {
                  updateAsset(openAsset.id, { note: e.target.value })
                  setOpenAsset({ ...openAsset, note: e.target.value })
                }}
              />
            </div>
            <div className="actions">
              <button
                className="btn danger"
                onClick={() => {
                  removeAsset(openAsset.id)
                  setOpenAsset(null)
                }}
              >
                Excluir
              </button>
              <div className="spacer" />
              <button className="btn primary" onClick={() => setOpenAsset(null)}>Concluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
