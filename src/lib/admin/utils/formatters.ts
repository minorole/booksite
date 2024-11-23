import type { Book, Order, ShippingAddress } from '@prisma/client'
import { CATEGORY_NAMES } from '../constants/categories'

export class Formatters {
  static formatBookInfo(book: Partial<Book> & { category?: { type: string } }): string {
    const category = book.category ? CATEGORY_NAMES[book.category.type as keyof typeof CATEGORY_NAMES] : null
    
    return `Title (Chinese): ${book.title_zh || 'N/A'}
Title (English): ${book.title_en || 'N/A'}
Category: ${category ? `${category.zh} / ${category.en}` : 'N/A'}
${book.quantity !== undefined ? `Quantity: ${book.quantity}` : ''}
${book.search_tags?.length ? `Tags: ${book.search_tags.join(', ')}` : ''}
${book.discontinued ? 'DISCONTINUED' : ''}`
  }

  static formatOrderInfo(order: Partial<Order> & { 
    order_items?: Array<{ book: Book, quantity: number }>,
    address?: ShippingAddress,
    user?: { email: string, name: string | null }
  }): string {
    let output = `Order #${order.id}\n`
    output += `Status: ${order.status}\n`
    
    if (order.user) {
      output += `Customer: ${order.user.name || 'Unknown'} (${order.user.email})\n`
    }

    if (order.order_items?.length) {
      output += 'Items:\n'
      order.order_items.forEach(item => {
        output += `- ${item.book.title_zh} / ${item.book.title_en || 'No English title'} (${item.quantity})\n`
      })
    }

    if (order.address) {
      output += `Shipping to: ${order.address.address1}, ${order.address.city}, ${order.address.state}\n`
    }

    if (order.notes) {
      output += `Notes: ${order.notes}\n`
    }

    if (order.tracking_number) {
      output += `Tracking: ${order.tracking_number}\n`
    }

    return output.trim()
  }

  static formatDate(date: Date | string): string {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  static formatAddress(address: Partial<ShippingAddress>): string {
    const parts = [
      address.address1,
      address.address2,
      address.city,
      address.state,
      address.zip,
      address.country
    ].filter(Boolean)

    return parts.join(', ')
  }
} 