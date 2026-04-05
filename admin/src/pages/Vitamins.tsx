import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Save, Trash2, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface Product {
  id: string
  slug: string
  name: string
  description_md: string | null
  composition: string | null
  talking_points_md: string | null
  key_ingredients: string[] | null
  targets: string[] | null
  usps: string[] | null
  audiences: string[] | null
  active: boolean | null
}

interface DeficiencyMap {
  id: string
  deficiency_key: string
  name: string
  product_slug: string
  priority: number | null
  reason: string | null
  food_sources: string[] | null
}

const emptyProduct: Omit<Product, 'id'> = {
  slug: '',
  name: '',
  description_md: '',
  composition: null,
  talking_points_md: null,
  key_ingredients: [],
  targets: [],
  usps: [],
  audiences: [],
  active: true,
}

export default function Vitamins() {
  const [products, setProducts] = useState<Product[]>([])
  const [defMap, setDefMap] = useState<DeficiencyMap[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Product | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [tagInput, setTagInput] = useState<Record<string, string>>({})

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [pRes, dRes] = await Promise.all([
      supabase.from('nutri_moonvit_products').select('*').order('name'),
      supabase.from('nutri_deficiency_map').select('*').order('priority'),
    ])
    setProducts((pRes.data as Product[]) ?? [])
    setDefMap((dRes.data as DeficiencyMap[]) ?? [])
    setLoading(false)
  }

  function startCreate() {
    setEditing({ id: '', ...emptyProduct } as Product)
    setIsNew(true)
    setTagInput({})
  }

  function startEdit(p: Product) {
    setEditing({ ...p })
    setIsNew(false)
    setTagInput({})
  }

  async function save() {
    if (!editing) return
    setSaving(true)

    const { id, ...data } = editing

    if (isNew) {
      const { error } = await supabase.from('nutri_moonvit_products').insert(data)
      if (error) {
        alert('Error: ' + error.message)
        setSaving(false)
        return
      }
    } else {
      const { error } = await supabase.from('nutri_moonvit_products').update(data).eq('id', id)
      if (error) {
        alert('Error: ' + error.message)
        setSaving(false)
        return
      }
    }

    setEditing(null)
    setSaving(false)
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this product?')) return
    await supabase.from('nutri_moonvit_products').delete().eq('id', id)
    load()
  }

  function addTag(field: 'key_ingredients' | 'targets' | 'usps') {
    const val = tagInput[field]?.trim()
    if (!val || !editing) return
    const arr = editing[field] ?? []
    if (!arr.includes(val)) {
      setEditing({ ...editing, [field]: [...arr, val] })
    }
    setTagInput({ ...tagInput, [field]: '' })
  }

  function removeTag(field: 'key_ingredients' | 'targets' | 'usps', idx: number) {
    if (!editing) return
    const arr = [...(editing[field] ?? [])]
    arr.splice(idx, 1)
    setEditing({ ...editing, [field]: arr })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading...
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{products.length} products</p>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="space-y-3">
        {products.map((p) => {
          const linked = defMap.filter((d) => d.product_slug === p.slug)
          const isExpanded = expanded === p.id
          return (
            <div key={p.id} className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 p-4">
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${p.active ? 'bg-emerald-500' : 'bg-gray-300'}`}
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{p.name}</h3>
                  <p className="text-xs text-gray-500 truncate">{p.slug}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {linked.length > 0 && (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : p.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(p)}
                    className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {(p.key_ingredients?.length ?? 0) > 0 && (
                <div className="px-4 pb-3 flex flex-wrap gap-1">
                  {p.key_ingredients!.map((t) => (
                    <span key={t} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {isExpanded && linked.length > 0 && (
                <div className="border-t px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Deficiency Map</p>
                  <div className="space-y-1">
                    {linked.map((d) => (
                      <div key={d.id} className="text-xs flex gap-2">
                        <span className="font-mono text-gray-600 w-28 shrink-0">{d.deficiency_key}</span>
                        <span className="text-gray-500">{d.name}</span>
                        {d.reason && <span className="text-gray-400 truncate">- {d.reason}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-8 px-4" onClick={() => setEditing(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold">{isNew ? 'New Product' : 'Edit Product'}</h2>
              <button onClick={() => setEditing(null)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <Field label="Slug">
                <input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="input"
                  placeholder="e.g. omega-3"
                />
              </Field>
              <Field label="Name">
                <input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="input"
                />
              </Field>
              <Field label="Description (MD)">
                <textarea
                  value={editing.description_md ?? ''}
                  onChange={(e) => setEditing({ ...editing, description_md: e.target.value })}
                  rows={4}
                  className="input font-mono text-xs"
                />
              </Field>

              {(['key_ingredients', 'targets', 'usps'] as const).map((field) => (
                <Field key={field} label={field.replace(/_/g, ' ')}>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {(editing[field] ?? []).map((t, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-xs rounded-full"
                      >
                        {t}
                        <button onClick={() => removeTag(field, i)} className="text-gray-400 hover:text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={tagInput[field] ?? ''}
                      onChange={(e) => setTagInput({ ...tagInput, [field]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(field))}
                      placeholder="Type and press Enter"
                      className="input flex-1"
                    />
                    <button
                      onClick={() => addTag(field)}
                      className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Add
                    </button>
                  </div>
                </Field>
              ))}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active ?? true}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  className="rounded"
                />
                Active
              </label>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !editing.slug || !editing.name}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`.input { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; font-size: 0.875rem; outline: none; } .input:focus { border-color: #10b981; }`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </label>
      {children}
    </div>
  )
}
