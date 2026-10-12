'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Loader2, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/format'
import { COUNTRIES } from '@/lib/countries'
import { createOrder } from '@/app/actions'

const WAVE_URL = 'https://pay.wave.com/m/M_sn_jgLTJQDWgtBq/c/sn/'

export function CheckoutForm() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('Wave')
  const [orderConfirmed, setOrderConfirmed] = useState(false)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const { subtotal, items, clear } = useCart()
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    address: '',
    complement: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }))
  }

  const phonePrefix = COUNTRIES.find(c => c.code === selectedCountry)?.prefix || '+...'

  if (items.length === 0 && !orderConfirmed) {
    return null
  }

  // Wave payment confirmation screen
  if (orderConfirmed && paymentMethod === 'Wave') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#1dc3f5]/10">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#1dc3f5" opacity="0.15"/>
            <path d="M12 21l6 6 10-12" stroke="#1dc3f5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Commande enregistrée !</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Appuyez sur le bouton ci-dessous pour finaliser votre paiement de{' '}
            <strong>{formatPrice(confirmedTotal)}</strong> via Wave.
          </p>
        </div>
        <a
          href={WAVE_URL}
          className="flex items-center gap-3 rounded-xl bg-[#1dc3f5] px-8 py-4 font-semibold text-white text-base shadow-lg active:scale-95 transition-transform"
        >
          <svg width="22" height="22" viewBox="0 0 32 32" fill="white">
            <rect width="32" height="32" rx="8" fill="white" fillOpacity="0.2"/>
            <path d="M8 16c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8-8-3.6-8-8zm8-5l-1.4 1.4L17 15H11v2h6l-2.4 2.6L16 21l5-5-5-5z" fill="white"/>
          </svg>
          Payer avec Wave
        </a>
        <button
          onClick={() => router.push('/')}
          className="text-sm text-muted-foreground underline underline-offset-2"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  // Orange Money confirmation
  if (orderConfirmed && paymentMethod === 'Orange Money') {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#f16e00]/10">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="20" fill="#f16e00" opacity="0.15"/>
            <path d="M12 21l6 6 10-12" stroke="#f16e00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Commande confirmée !</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Envoyez <strong>{formatPrice(confirmedTotal)}</strong> via Orange Money au numéro :
          </p>
          <p className="mt-3 text-2xl font-bold tracking-widest text-[#f16e00]">+221 77 477 20 51</p>
          <p className="mt-2 text-xs text-muted-foreground">Mentionnez votre nom en objet du transfert.</p>
        </div>
        <button
          onClick={() => router.push('/')}
          className="rounded-xl bg-[#f16e00] px-8 py-4 font-semibold text-white text-base shadow-lg"
        >
          Retour à l'accueil
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="flex-1">
          <div className="flex flex-col gap-6">
              <h3 className="font-medium">Informations personnelles</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input id="firstName" value={formData.firstName} onChange={handleChange} placeholder="Votre prénom" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom complet</Label>
                  <Input id="lastName" value={formData.lastName} onChange={handleChange} placeholder="Votre nom" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="email">Adresse e-mail (pour le reçu)</Label>
                  <Input id="email" type="email" value={formData.email} onChange={handleChange} placeholder="exemple@email.com" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="flex">
                    <span className="inline-flex items-center rounded-l-md border border-input border-r-0 bg-muted/50 px-3 text-sm text-muted-foreground">
                      {phonePrefix}
                    </span>
                    <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} className="rounded-l-none" placeholder="6 00 00 00 00" />
                  </div>
                </div>
              </div>

              <h3 className="mt-4 font-medium">Adresse</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Pays</Label>
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez un pays..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ville / Quartier</Label>
                  <Input id="city" value={formData.city} onChange={handleChange} placeholder="Dakar, Plateau..." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Adresse complète</Label>
                  <Input id="address" value={formData.address} onChange={handleChange} placeholder="N° et nom de rue" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="complement">Informations complémentaires (facultatif)</Label>
                  <Input id="complement" value={formData.complement} onChange={handleChange} placeholder="Bâtiment, étage, interphone..." />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-6 rounded-xl border bg-card p-6">
                <div>
                  <h3 className="font-medium">Livraison et Paiement</h3>
                  <p className="mt-1 text-sm text-muted-foreground mb-4">
                    Choisissez votre méthode de paiement préférée. Livraison standard (3 à 5 jours).
                  </p>
                  
                  <div className="flex flex-col gap-3">
                    <label className={`flex items-center justify-between rounded-lg border p-3.5 cursor-pointer transition-colors ${paymentMethod === 'Wave' ? 'border-[#1dc3f5] bg-[#1dc3f5]/5 ring-1 ring-[#1dc3f5]' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="Wave" 
                          checked={paymentMethod === 'Wave'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-[#1dc3f5]"
                        />
                        <Image src="/wave.jpg" alt="Wave" width={28} height={28} className="rounded-md object-cover" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">Wave Business</span>
                            <span className="text-[10px] bg-[#1dc3f5]/15 text-[#0284c7] dark:text-[#38bdf8] px-2 py-0.5 rounded-full font-semibold">Paiement direct</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Redirection immédiate vers le lien officiel Wave
                          </p>
                        </div>
                      </div>
                    </label>

                    <label className={`flex items-center justify-between rounded-lg border p-3.5 cursor-pointer transition-colors ${paymentMethod === 'Orange Money' ? 'border-[#f16e00] bg-[#f16e00]/5 ring-1 ring-[#f16e00]' : 'hover:bg-muted/50'}`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="paymentMethod" 
                          value="Orange Money" 
                          checked={paymentMethod === 'Orange Money'}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-4 h-4 text-[#f16e00]"
                        />
                        <Image src="/orange-money.png" alt="Orange Money" width={28} height={28} className="rounded-md object-cover" />
                        <div>
                          <span className="font-medium text-sm">Orange Money</span>
                          <p className="text-xs text-muted-foreground mt-0.5">Transfert au +221 77 477 20 51 après validation</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
                
                <Button 
                  size="lg"
                  className="w-full mt-2"
                  onClick={async () => {
                    if (!formData.firstName || !formData.lastName || !formData.phone || !formData.city || !formData.address || !selectedCountry) {
                      toast.error('Veuillez remplir tous les champs obligatoires.')
                      return
                    }

                    setIsSubmitting(true)
                    
                    const countryName = COUNTRIES.find(c => c.code === selectedCountry)?.name || selectedCountry

                    const orderResult = await createOrder({
                      ...formData,
                      country: countryName,
                      subtotal: subtotal,
                      items: items,
                      paymentMethod: paymentMethod
                    })

                    setIsSubmitting(false)

                    if (orderResult.error) {
                      toast.error(orderResult.error)
                      return
                    }

                    const total = subtotal
                    clear()
                    setConfirmedTotal(total)
                    setOrderConfirmed(true)
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {paymentMethod === 'Wave' ? 'Confirmer et payer avec Wave' : 'Confirmer la commande'}
                </Button>
              </div>
            </div>
        </div>

        {/* Desktop Mini-summary on the right */}
        <div className="hidden w-80 shrink-0 lg:block">
          <div className="sticky top-24 rounded-2xl border bg-card p-6">
            <h3 className="mb-4 font-medium">Votre commande</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Livraison</span>
                <span>Gratuit</span>
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between font-medium">
                <span>Total</span>
                <span className="text-lg">{formatPrice(subtotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
