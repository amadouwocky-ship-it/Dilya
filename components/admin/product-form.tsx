'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { saveProduct, deleteProduct } from '@/app/actions'
import { toast } from 'sonner'
import { Loader2, Trash2, Plus, X } from 'lucide-react'

import { ImageUpload } from '@/components/admin/image-upload'
import { slugify } from '@/lib/slug'

interface ProductFormProps {
  categories: { id: string, name: string }[]
  initialData?: {
    id: string
    name: string
    slug: string
    categoryId: string
    price: number
    oldPrice: number | null
    isNew: boolean
    inStock: boolean
    stock: number
    shortDescription: string
    description: string
    images: { url: string }[]
    informations: { value: string }[]
    sizes: string | null
    colors: string | null
  }
}

export function ProductForm({ categories, initialData }: ProductFormProps) {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    slug: initialData?.slug || '',
    categoryId: initialData?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    price: initialData?.price || 0,
    oldPrice: initialData?.oldPrice || '',
    isNew: initialData?.isNew || false,
    inStock: initialData !== undefined ? initialData.inStock : true,
    stock: initialData?.stock || 0,
    shortDescription: initialData?.shortDescription || '',
    description: initialData?.description || '',
    images: initialData?.images.map(i => i.url) || [],
    informations: initialData?.informations.map(i => i.value) || [''],
    sizes: initialData?.sizes ? (JSON.parse(initialData.sizes) as string[]).join(', ') : '',
    colors: initialData?.colors ? JSON.parse(initialData.colors) as string[] : []
  })

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value
    setFormData(prev => ({
      ...prev,
      name: newName,
      ...(!initialData && {
        slug: slugify(newName)
      })
    }))
  }

  const handleArrayChange = (index: number, field: 'informations' | 'colors', value: string) => {
    const newArray = [...formData[field]]
    newArray[index] = value
    setFormData({ ...formData, [field]: newArray })
  }

  const addArrayItem = (field: 'informations' | 'colors') => {
    setFormData({ ...formData, [field]: [...formData[field], field === 'colors' ? '#000000' : ''] })
  }

  const removeArrayItem = (index: number, field: 'images' | 'informations' | 'colors') => {
    const newArray = formData[field].filter((_, i) => i !== index)
    setFormData({ ...formData, [field]: newArray })
  }

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, url]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    // Format data for Prisma
    const dataToSave = {
      ...formData,
      slug: slugify(formData.slug || formData.name),
      price: Number(formData.price),
      oldPrice: formData.oldPrice ? Number(formData.oldPrice) : null,
      stock: Number(formData.stock),
      sizes: formData.sizes ? JSON.stringify(formData.sizes.split(',').map(s => s.trim()).filter(Boolean)) : null,
      colors: formData.colors.length > 0 ? JSON.stringify(formData.colors.filter(c => c.trim() !== '')) : null,
      images: formData.images.filter(i => i.trim() !== ''),
      informations: formData.informations.filter(i => i.trim() !== '')
    }
    
    const result = await saveProduct(initialData?.id || null, dataToSave)
    
    setIsSaving(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(initialData ? 'Produit modifié avec succès' : 'Produit créé avec succès')
      router.push('/admin/produits')
    }
  }

  const handleDelete = async () => {
    if (!initialData || !confirm('Voulez-vous vraiment supprimer ce produit ?')) return
    
    setIsDeleting(true)
    const result = await deleteProduct(initialData.id)
    setIsDeleting(false)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Produit supprimé')
      router.push('/admin/produits')
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6">
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Informations principales */}
        <div>
          <h2 className="text-lg font-medium mb-4">Informations principales</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du produit *</Label>
              <Input id="name" value={formData.name} onChange={handleNameChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL) *</Label>
              <Input id="slug" value={formData.slug} onChange={(e) => setFormData({...formData, slug: e.target.value})} required />
            </div>
            
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={formData.categoryId} onValueChange={(v) => setFormData({...formData, categoryId: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie">
                    {categories.find(c => c.id === formData.categoryId)?.name || 'Sélectionner une catégorie'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Prix et Stock */}
        <div>
          <h2 className="text-lg font-medium mb-4">Prix et Stock</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Prix (FCFA) *</Label>
              <Input id="price" type="number" min="0" value={formData.price} onChange={(e) => setFormData({...formData, price: Number(e.target.value)})} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oldPrice">Ancien prix barré (FCFA)</Label>
              <Input id="oldPrice" type="number" min="0" value={formData.oldPrice} onChange={(e) => setFormData({...formData, oldPrice: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">Quantité en stock *</Label>
              <Input id="stock" type="number" min="0" value={formData.stock} onChange={(e) => setFormData({...formData, stock: Number(e.target.value)})} required />
            </div>
          </div>
          
          <div className="flex gap-8 mt-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="inStock" checked={formData.inStock} onCheckedChange={(c) => setFormData({...formData, inStock: c as boolean})} />
              <Label htmlFor="inStock">En stock (Affichage public)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="isNew" checked={formData.isNew} onCheckedChange={(c) => setFormData({...formData, isNew: c as boolean})} />
              <Label htmlFor="isNew">Badge "Nouveau"</Label>
            </div>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 mt-6">
            <div className="space-y-2">
              <Label htmlFor="sizes">Tailles (séparées par des virgules)</Label>
              <Input id="sizes" placeholder="Ex: S, M, L, XL" value={formData.sizes} onChange={(e) => setFormData({...formData, sizes: e.target.value})} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <Label>Couleurs (Aperçu visuel)</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('colors')} className="h-8">
                  <Plus className="w-3 h-3 mr-1" /> Ajouter
                </Button>
              </div>
              {formData.colors.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune couleur ajoutée.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.colors.map((color, index) => (
                    <div key={index} className="flex items-center gap-2 bg-secondary/50 rounded-md p-1 pr-2 border">
                      <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => handleArrayChange(index, 'colors', e.target.value)} 
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      />
                      <button 
                        type="button" 
                        onClick={() => removeArrayItem(index, 'colors')}
                        className="text-muted-foreground hover:text-destructive ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Descriptions */}
        <div>
          <h2 className="text-lg font-medium mb-4">Descriptions</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Description courte *</Label>
              <Textarea id="shortDescription" value={formData.shortDescription} onChange={(e) => setFormData({...formData, shortDescription: e.target.value})} required className="h-20" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description détaillée *</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required className="h-40" />
            </div>
          </div>
        </div>

        {/* Images */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Images du produit</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {formData.images.map((img, index) => (
              <div key={index} className="relative group rounded-md overflow-hidden border aspect-square">
                <img src={img} alt="preview" className="object-cover w-full h-full" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button type="button" variant="destructive" size="icon" onClick={() => removeArrayItem(index, 'images')}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <ImageUpload onClientUploadComplete={handleImageUploaded} />
        </div>

        {/* Informations */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium">Informations additionnelles</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('informations')}>
              <Plus className="w-4 h-4 mr-2" /> Ajouter une info
            </Button>
          </div>
          <div className="space-y-3">
            {formData.informations.map((info, index) => (
              <div key={index} className="flex gap-2">
                <Input value={info} onChange={(e) => handleArrayChange(index, 'informations', e.target.value)} placeholder="Ex: Contenance : 200ml" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeArrayItem(index, 'informations')} disabled={formData.informations.length === 1}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t">
          {initialData ? (
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting || isSaving}>
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Supprimer
            </Button>
          ) : (
            <div />
          )}
          
          <div className="flex gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/admin/produits')} disabled={isSaving || isDeleting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSaving || isDeleting}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? 'Enregistrer les modifications' : 'Créer le produit'}
            </Button>
          </div>
        </div>

      </form>
    </div>
  )
}
