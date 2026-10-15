import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { formatPrice } from '@/lib/format'
import Image from 'next/image'
import { ChevronLeft, MapPin, User, Package, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { OrderStatusUpdater } from '@/components/admin/order-status-updater'
import { Badge } from '@/components/ui/badge'

export const dynamic = 'force-dynamic'

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            include: { images: true }
          }
        }
      }
    }
  })

  if (!order) {
    notFound()
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/admin/commandes" 
            className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-serif text-2xl font-medium">Commande #{order.id.slice(-6).toUpperCase()}</h1>
          {order.status === 'PENDING' && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>}
          {order.status === 'CONFIRMED' && <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Confirmée</Badge>}
          {order.status === 'SHIPPED' && <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Expédiée</Badge>}
          {order.status === 'DELIVERED' && <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Livrée</Badge>}
          {order.status === 'CANCELLED' && <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Annulée</Badge>}
        </div>
        
        <OrderStatusUpdater orderId={order.id} currentStatus={order.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Colonne gauche : Articles */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-muted-foreground" />
                Articles commandés
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                {order.items.map((item) => {
                  // Utiliser l'image choisie enregistrée, sinon la première image du produit
                  const imageUrl = item.image || (item.product.images.length > 0 ? item.product.images[0].url : '/images/placeholder.jpg')
                  
                  return (
                    <div key={item.id} className="flex gap-4">
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border bg-secondary/20">
                        {imageUrl && (
                          <Image
                            src={imageUrl}
                            alt={item.name}
                            fill
                            className="object-cover object-center"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 justify-between">
                        <div>
                          <h4 className="font-medium">{item.name}</h4>
                          {item.variant && (
                            <p className="mt-1 text-sm text-muted-foreground">Variante : {item.variant}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(item.price)}</p>
                          <p className="text-sm text-muted-foreground">Qté : {item.quantity}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <Separator className="my-6" />
              
              <div className="flex justify-between items-center text-lg font-medium">
                <span>Total de la commande</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Colonne droite : Client & Livraison */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="w-5 h-5 text-muted-foreground" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-4">
              <div>
                <p className="font-medium text-foreground">{order.firstName} {order.lastName}</p>
                <a href={`mailto:${order.email}`} className="text-primary hover:underline">{order.email}</a>
                <p className="text-muted-foreground mt-1">{order.phone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                Adresse de livraison
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">{order.firstName} {order.lastName}</p>
              <p>{order.address}</p>
              {order.complement && <p>{order.complement}</p>}
              <p>{order.city}, {order.country}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                Détails
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2 text-muted-foreground">
              <p>Passée le : {new Date(order.createdAt).toLocaleString('fr-FR')}</p>
              <p>Mise à jour : {new Date(order.updatedAt).toLocaleString('fr-FR')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
