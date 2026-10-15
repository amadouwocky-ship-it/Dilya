'use server'

import { searchProducts, getCategories } from '@/lib/products'
import { prisma } from '@/lib/db'
import { isDuplicateSlugError, slugify } from '@/lib/slug'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import { cookies } from 'next/headers'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function loginAdmin(code: string) {
  if (code === '3577') {
    const cookieStore = await cookies()
    cookieStore.set('admin_session', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    })
    return { success: true }
  }
  return { error: 'Code incorrect' }
}

export async function logoutAdmin() {
  const cookieStore = await cookies()
  cookieStore.delete('admin_session')
  return { success: true }
}

export async function searchProductsAction(query: string) {
  return searchProducts(query)
}

export async function getCategoriesAction() {
  return getCategories()
}

export async function submitReview(productId: string, formData: FormData) {
  const author = formData.get('author') as string
  const text = formData.get('text') as string
  const ratingStr = formData.get('rating') as string
  
  if (!author || !text || !ratingStr) {
    return { error: 'Veuillez remplir tous les champs.' }
  }
  
  const rating = parseInt(ratingStr, 10)
  if (isNaN(rating) || rating < 1 || rating > 5) {
    return { error: 'Note invalide.' }
  }

  try {
    await prisma.review.create({
      data: {
        author,
        text,
        rating,
        date: new Date(),
        status: 'PENDING',
        productId,
      },
    })
    
    // We revalidate the product path but since it's PENDING it won't show up immediately anyway.
    revalidatePath(`/produit/[slug]`, 'page')
    return { success: true }
  } catch (err) {
    console.error('Error submitting review:', err)
    return { error: 'Erreur lors de la soumission de l\'avis.' }
  }
}

export async function updateReviewStatus(reviewId: string, status: 'PUBLISHED' | 'REJECTED' | 'PENDING') {
  try {
    const updatedReview = await prisma.review.update({
      where: { id: reviewId },
      data: { status },
      include: { product: true } // Need product slug to revalidate correctly
    })
    
    if (updatedReview.product) {
      revalidatePath(`/produit/${updatedReview.product.slug}`)
    }
    revalidatePath('/admin/avis')
    
    return { success: true }
  } catch (err) {
    console.error('Error updating review status:', err)
    return { error: 'Erreur lors de la mise à jour.' }
  }
}

export async function deleteReview(reviewId: string) {
  try {
    const deleted = await prisma.review.delete({
      where: { id: reviewId },
      include: { product: true }
    })
    
    if (deleted.product) {
      revalidatePath(`/produit/${deleted.product.slug}`)
    }
    revalidatePath('/admin/avis')
    
    return { success: true }
  } catch (err) {
    console.error('Error deleting review:', err)
    return { error: 'Erreur lors de la suppression.' }
  }
}

export async function updateOrderStatus(orderId: string, status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED') {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status }
    })
    
    revalidatePath('/admin/commandes')
    revalidatePath(`/admin/commandes/${orderId}`)
    
    return { success: true }
  } catch (err) {
    console.error('Error updating order status:', err)
    return { error: 'Erreur lors de la mise à jour du statut de la commande.' }
  }
}

export async function saveCategory(id: string | null, data: { name: string; slug: string; tagline: string; image: string }) {
  try {
    if (id) {
      await prisma.category.update({
        where: { id },
        data
      })
    } else {
      await prisma.category.create({
        data
      })
    }
    revalidatePath('/admin/categories')
    revalidatePath('/categorie/[slug]', 'page')
    return { success: true }
  } catch (err) {
    console.error('Error saving category:', err)
    return { error: 'Erreur lors de la sauvegarde de la catégorie.' }
  }
}

export async function deleteCategory(id: string) {
  try {
    await prisma.category.delete({
      where: { id }
    })
    revalidatePath('/admin/categories')
    return { success: true }
  } catch (err) {
    console.error('Error deleting category:', err)
    return { error: 'Erreur lors de la suppression de la catégorie.' }
  }
}

async function uniqueProductSlug(base: string, excludeId: string | null) {
  const normalized = slugify(base)
  for (let n = 0; n < 50; n++) {
    const candidate = n === 0 ? normalized : `${normalized}-${n + 1}`
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (!existing || existing.id === excludeId) return candidate
  }
  return `${normalized}-${Date.now().toString(36)}`
}

export async function saveProduct(id: string | null, data: any) {
  try {
    const images: string[] = Array.isArray(data.images) ? data.images : []
    const informations: string[] = Array.isArray(data.informations) ? data.informations : []
    const name = String(data.name ?? '').trim()
    if (!name) {
      return { error: 'Le nom du produit est obligatoire.' }
    }
    if (!data.categoryId) {
      return { error: 'La catégorie est obligatoire.' }
    }

    const slug = await uniqueProductSlug(data.slug || name, id)

    const productData = {
      name,
      slug,
      categoryId: data.categoryId,
      price: Number(data.price) || 0,
      oldPrice:
        data.oldPrice !== null && data.oldPrice !== undefined && data.oldPrice !== ''
          ? Number(data.oldPrice)
          : null,
      isNew: Boolean(data.isNew),
      inStock: Boolean(data.inStock),
      stock: Number(data.stock) || 0,
      shortDescription: String(data.shortDescription ?? ''),
      description: String(data.description ?? ''),
      sizes: data.sizes ?? null,
      colors: data.colors ?? null,
    }

    if (id) {
      await prisma.product.update({
        where: { id },
        data: {
          ...productData,
          images: {
            deleteMany: {},
            create: images.map((url: string, index: number) => ({ url, position: index })),
          },
          informations: {
            deleteMany: {},
            create: informations.map((value: string, index: number) => ({ value, position: index })),
          },
        },
      })
    } else {
      await prisma.product.create({
        data: {
          ...productData,
          images: {
            create: images.map((url: string, index: number) => ({ url, position: index })),
          },
          informations: {
            create: informations.map((value: string, index: number) => ({ value, position: index })),
          },
        },
      })
    }
    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: unknown) {
    console.error('Error saving product:', err)
    if (isDuplicateSlugError(err)) {
      return { error: 'Un produit avec cette URL (slug) existe déjà. Changez le nom ou le slug, puis réessayez.' }
    }
    return { error: 'Erreur lors de la sauvegarde du produit.' }
  }
}

export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({
      where: { id }
    })
    revalidatePath('/admin/produits')
    return { success: true }
  } catch (err) {
    console.error('Error deleting product:', err)
    return { error: 'Erreur lors de la suppression du produit.' }
  }
}

export async function saveSetting(key: string, value: string) {
  try {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    })
    revalidatePath('/admin/parametres')
    return { success: true }
  } catch (err) {
    console.error('Error saving setting:', err)
    return { error: 'Erreur lors de la sauvegarde.' }
  }
}

export async function deleteShippingRule(id: string) {
  try {
    await prisma.shippingRule.delete({ where: { id } })
    revalidatePath('/admin/livraison')
    return { success: true }
  } catch (err) {
    return { error: 'Erreur lors de la suppression.' }
  }
}

export async function saveShippingRule(id: string | null, data: { name: string; zone: string; price: number; minOrderVal: number | null }) {
  try {
    if (id) {
      await prisma.shippingRule.update({ where: { id }, data })
    } else {
      await prisma.shippingRule.create({ data })
    }
    revalidatePath('/admin/livraison')
    return { success: true }
  } catch (err) {
    return { error: 'Erreur lors de la sauvegarde.' }
  }
}

export async function createOrder(data: any) {
  try {
    const { items, paymentMethod, ...orderData } = data

    let complementStr = orderData.complement || ''
    if (paymentMethod) {
      complementStr = complementStr 
        ? `${complementStr} | Paiement : ${paymentMethod}` 
        : `Paiement : ${paymentMethod}`
    }

    const order = await prisma.order.create({
      data: {
        ...orderData,
        complement: complementStr,
        items: {
          create: items.map((item: any) => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            variant: item.variant || null,
            image: item.image,
          }))
        }
      }
    })

    if (process.env.RESEND_API_KEY) {
      // 1. Email to Admin
      await resend.emails.send({
        from: 'DILYA Boutique <onboarding@resend.dev>',
        to: 'Attoufanemaiga60@gmail.com', // To the admin
        subject: `Nouvelle commande ! - ${order.firstName} ${order.lastName}`,
        html: `
          <h1>Nouvelle commande de ${order.firstName} ${order.lastName}</h1>
          <p><strong>Email :</strong> ${order.email}</p>
          <p><strong>Téléphone :</strong> ${order.phone}</p>
          <p><strong>Total :</strong> ${order.subtotal} FCFA</p>
          <p><strong>Paiement / Notes :</strong> ${complementStr}</p>
          <br/>
          <h2>Détails de livraison</h2>
          <p>${order.address}<br/>${order.city}, ${order.country}</p>
          <br/>
          <p>Connectez-vous à l'administration pour voir les détails de la commande.</p>
        `
      })

      // 2. Email to Customer
      if (order.email) {
        let paymentInstruction = ''
        if (paymentMethod === 'Wave') {
          paymentInstruction = `<p style="color: #1dc3f5; font-weight: bold;">Vous avez choisi le paiement par Wave. Si vous n'avez pas encore finalisé votre règlement, vous pouvez utiliser notre lien Wave direct : <a href="https://pay.wave.com/m/M_sn_jgLTJQDWgtBq/c/sn/" target="_blank" style="color: #1dc3f5; text-decoration: underline;">Payer avec Wave</a>.</p>`
        } else if (paymentMethod === 'Orange Money') {
          paymentInstruction = `<p style="color: #f16e00; font-weight: bold;">Vous avez choisi le paiement par Orange Money. Notre équipe vous contactera au ${order.phone} ou sur WhatsApp au +221 77 477 20 51 pour finaliser le règlement.</p>`
        } else {
          paymentInstruction = `<p>Votre commande a été prise en compte avec succès.</p>`
        }

        await resend.emails.send({
          from: 'DILYA Boutique <onboarding@resend.dev>',
          to: order.email,
          subject: 'Votre commande DILYA est confirmée ! 🎉',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
              <h1 style="color: #e2959c;">Merci pour votre commande, ${order.firstName} !</h1>
              <p>Nous avons bien reçu votre commande et nous la préparons avec amour. 💕</p>
              
              <div style="background-color: #f9f9f9; padding: 20px; border-radius: 12px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Informations importantes</h3>
                ${paymentInstruction}
                <p><strong>Montant total à régler :</strong> ${order.subtotal} FCFA</p>
              </div>

              <p>Nous vous tiendrons informée de l'expédition de votre colis.</p>
              <br/>
              <p>Avec amour,</p>
              <p><strong>L'équipe DILYA</strong></p>
            </div>
          `
        })
      }
    }

    revalidatePath('/admin/commandes')
    return { success: true }
  } catch (err) {
    console.error('Error creating order:', err)
    return { error: 'Erreur lors de la création de la commande.' }
  }
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export async function saveArticle(
  id: string | null,
  data: {
    slug: string
    title: string
    excerpt: string
    content: string
    category: string
    readTime: string
    image: string
    isPublished: boolean
  }
) {
  try {
    const payload = {
      ...data,
      publishedAt: data.isPublished ? new Date() : null,
    }

    if (id) {
      await prisma.article.update({ where: { id }, data: payload })
    } else {
      await prisma.article.create({ data: payload })
    }

    revalidatePath('/admin/articles')
    revalidatePath('/journal')
    revalidatePath('/journal/[slug]', 'page')
    return { success: true }
  } catch (err) {
    console.error('Error saving article:', err)
    return { error: 'Erreur lors de la sauvegarde de l\'article.' }
  }
}

export async function deleteArticle(id: string) {
  try {
    await prisma.article.delete({ where: { id } })
    revalidatePath('/admin/articles')
    revalidatePath('/journal')
    return { success: true }
  } catch (err) {
    console.error('Error deleting article:', err)
    return { error: 'Erreur lors de la suppression de l\'article.' }
  }
}

export async function toggleArticlePublished(id: string, isPublished: boolean) {
  try {
    await prisma.article.update({
      where: { id },
      data: {
        isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    })
    revalidatePath('/admin/articles')
    revalidatePath('/journal')
    revalidatePath('/journal/[slug]', 'page')
    return { success: true }
  } catch (err) {
    return { error: 'Erreur lors de la mise à jour.' }
  }
}

// ---------------------------------------------------------------------------
// Static Pages
// ---------------------------------------------------------------------------

export async function savePage(
  id: string | null,
  data: { slug: string; title: string; content: string; isPublished: boolean }
) {
  try {
    if (id) {
      await prisma.page.update({ where: { id }, data })
    } else {
      await prisma.page.create({ data })
    }
    revalidatePath('/admin/pages')
    revalidatePath('/' + data.slug) // Revalidate the actual page route
    return { success: true }
  } catch (err) {
    console.error('Error saving page:', err)
    return { error: 'Erreur lors de la sauvegarde de la page.' }
  }
}

export async function deletePage(id: string) {
  try {
    await prisma.page.delete({ where: { id } })
    revalidatePath('/admin/pages')
    return { success: true }
  } catch (err) {
    console.error('Error deleting page:', err)
    return { error: 'Erreur lors de la suppression de la page.' }
  }
}

// ---------------------------------------------------------------------------
// Newsletter
// ---------------------------------------------------------------------------

export async function subscribeToNewsletter(email: string) {
  try {
    const existing = await prisma.subscriber.findUnique({
      where: { email },
    })

    if (existing) {
      return { error: 'Cette adresse e-mail est déjà inscrite.' }
    }

    await prisma.subscriber.create({
      data: { email },
    })

    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'DILYA Boutique <onboarding@resend.dev>',
        to: email,
        subject: 'Bienvenue dans l\'univers DILYA ! 🎉',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h1 style="color: #e2959c;">Bienvenue chez DILYA !</h1>
            <p>Merci de vous être inscrit(e) à notre newsletter.</p>
            <p>Vous serez désormais la première informée de nos nouvelles collections, de nos offres exclusives et de nos ventes privées.</p>
            <br/>
            <p>Pour vous remercier, utilisez le code <strong>BIENVENUE10</strong> lors de votre prochaine commande pour bénéficier de 10% de réduction !</p>
            <br/>
            <p>Avec amour,</p>
            <p><strong>L'équipe DILYA</strong></p>
          </div>
        `,
      })
    }

    return { success: true }
  } catch (err) {
    console.error('Error subscribing to newsletter:', err)
    return { error: 'Une erreur est survenue lors de l\'inscription.' }
  }
}
