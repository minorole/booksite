import type { Book, Order, ShippingAddress, OrderItem } from '@prisma/client'
import { AppError } from './error-handler'
import { CATEGORY_MAP } from '../constants/categories'

export class Validators {
  static validateBookData(data: Partial<Book>) {
    // Title validation - at least one language required
    if (!data.title_zh && !data.title_en) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Book must have at least one title (Chinese or English)'
      })
    }

    // Quantity validation
    if (typeof data.quantity === 'number' && data.quantity < 0) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Quantity cannot be negative'
      })
    }

    // Category validation
    if (data.category_id && !Object.values(CATEGORY_MAP).includes(data.category_id as any)) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid category'
      })
    }

    // Tag validation
    if (data.search_tags && !Array.isArray(data.search_tags)) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Tags must be an array'
      })
    }

    return true
  }

  static validateOrderData(data: Partial<Order> & { items?: OrderItem[] }) {
    // Status validation
    const validStatuses = ['NEW', 'PROCESSING', 'SHIPPED', 'CANCELLED', 'COMPLETED']
    if (data.status && !validStatuses.includes(data.status)) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid order status'
      })
    }

    // Order items validation
    if (data.items && !Array.isArray(data.items)) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Order items must be an array'
      })
    }

    return true
  }

  static validateShippingAddress(address: Partial<ShippingAddress>) {
    const requiredFields = ['address1', 'city', 'state', 'zip', 'country']
    
    for (const field of requiredFields) {
      if (!address[field as keyof ShippingAddress]) {
        throw new AppError({
          type: 'VALIDATION_ERROR',
          message: `Missing required field: ${field}`
        })
      }
    }

    return true
  }

  static validateImageData(file: File) {
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/heic', 'image/heif']
    if (!validTypes.includes(file.type.toLowerCase())) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Invalid image format. Please upload JPEG, PNG, or HEIC/HEIF'
      })
    }

    // Check file size (19MB limit)
    const maxSize = 19 * 1024 * 1024 // 19MB in bytes
    if (file.size > maxSize) {
      throw new AppError({
        type: 'VALIDATION_ERROR',
        message: 'Image size exceeds 19MB limit'
      })
    }

    return true
  }
} 