import { useRef, useState } from 'react'
import { fileToDataUrl, getAssetUrlSync, useStore } from '../store'
import { FONTS, type Project } from '../types'

export default function BrandKitSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const updateBrand = useStore(s => s.updateBrand)
  const addAsset = useStore(s => s.addAsset)
  const removeAsset = useStore(s => s.removeAsset)
  const brand = project.brand
  const [newColor, setNewColor] = useState('#7c5cff')
  const logoInput = useRef<HTMLInputElement>(null)
  const elInput = useRef<HTMLInputElement>(null)

  const uploadLogo = async (file: File) => {
    const url = await fileToDataUrl(file, 800)
    const asset = await addAsset({ projectId: project.id, name: file.name, kind: 'logo' }, url)
    updateBrand(project.id, { logoAssetId: asset.id })
  }

  const uploadElement = async (files: FileList) => {
    const ids: string[] = []
    for (const file of Array.from(files)) {
      const url = await fileToDataUrl(file, 1200)
      const asset = await addAsset({ projectId: project.id, name: file.name, kind: 'element' }, url)
      ids.push(asset.id)
    }
    updateBrand(project.id, { elementAssetIds: [...brand.elementAssetIds, ...ids] })
  }

  const logoUrl = brand.logoAssetId ? getAssetUrlSync(brand.logoAssetId) : undefined

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet wide" onClick={e => e.stopPropagation()}>
        <h3>🎨 Kit de Marca · {project.name}</h3>
        <p className="muted">
          Cores, fontes e logo deste cliente ficam disponíveis automaticamente no Editor.
        </p>

        <div className="field">
          <label>Paleta de cores</label>
          <div className="swatch-row">
            {brand.colors.map((c, i) => (
              <button
                key={i}
                className="swatch"
                style={{ background: c }}
                title="Toque para remover"
                onClick={() =>
                  updateBrand(project.id, { colors: brand.colors.filter((_, j) => j !== i) })
                }
              />
            ))}
            <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} />
            <button
              className="btn small ghost"
              onClick={() => updateBrand(project.id, { colors: [...brand.colors, newColor] })}
            >
              ＋ Adicionar
            </button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Toque em uma cor para removê-la.</p>
        </div>

        <div className="prop-grid">
          <div className="field">
            <label>Fonte de títulos</label>
            <select
              value={brand.headingFont}
              onChange={e => updateBrand(project.id, { headingFont: e.target.value })}
            >
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Fonte de texto</label>
            <select
              value={brand.bodyFont}
              onChange={e => updateBrand(project.id, { bodyFont: e.target.value })}
            >
              {FONTS.map(f => (
                <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: 14 }}>
          <div style={{ fontFamily: brand.headingFont, fontSize: 22, fontWeight: 700 }}>
            Título com {brand.headingFont}
          </div>
          <div style={{ fontFamily: brand.bodyFont, fontSize: 15 }}>
            Texto corrido com {brand.bodyFont} — prévia das fontes da marca.
          </div>
        </div>

        <div className="field">
          <label>Logo</label>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {logoUrl && (
              <img src={logoUrl} alt="logo" style={{ width: 64, height: 64, objectFit: 'contain', borderRadius: 12, background: 'var(--surface-2)' }} />
            )}
            <button className="btn ghost" onClick={() => logoInput.current?.click()}>
              {logoUrl ? 'Trocar logo' : '⬆️ Enviar logo'}
            </button>
            {logoUrl && (
              <button
                className="btn small danger"
                onClick={() => updateBrand(project.id, { logoAssetId: undefined })}
              >
                Remover
              </button>
            )}
            <input
              ref={logoInput}
              type="file"
              accept="image/*"
              hidden
              onChange={e => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
          </div>
        </div>

        <div className="field">
          <label>Elementos visuais da marca</label>
          <div className="insp-grid">
            {brand.elementAssetIds.map(id => {
              const url = getAssetUrlSync(id)
              return (
                <div key={id} className="item">
                  {url && <img src={url} alt="" />}
                  <button
                    className="rm"
                    onClick={() => {
                      updateBrand(project.id, {
                        elementAssetIds: brand.elementAssetIds.filter(x => x !== id),
                      })
                      removeAsset(id)
                    }}
                  >
                    ✕
                  </button>
                </div>
              )
            })}
            <button className="item" onClick={() => elInput.current?.click()} style={{ fontSize: 24 }}>
              ＋
            </button>
            <input
              ref={elInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={e => e.target.files && uploadElement(e.target.files)}
            />
          </div>
        </div>

        <div className="field">
          <label>Tom de voz / personalidade da marca</label>
          <textarea
            rows={3}
            value={brand.voice}
            placeholder="Ex: Acolhedora e leve, fala com jovens adultos, evita jargões…"
            onChange={e => updateBrand(project.id, { voice: e.target.value })}
          />
        </div>

        <div className="actions">
          <button className="btn primary" onClick={onClose}>Concluir</button>
        </div>
      </div>
    </div>
  )
}
