import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Add query deduplication middleware
function addMiddleware(prisma: PrismaClient) {
  const queryCache = new Map()
  
  prisma.$use(async (params, next) => {
    // Only cache SELECT queries
    if (params.action !== 'findMany' && params.action !== 'findFirst' && params.action !== 'findUnique') {
      return next(params)
    }

    const cacheKey = JSON.stringify(params)
    
    // Check if we have a cached result within the same tick
    if (queryCache.has(cacheKey)) {
      return queryCache.get(cacheKey)
    }

    const result = await next(params)
    
    // Cache the result
    queryCache.set(cacheKey, result)
    
    // Clear cache on next tick
    setTimeout(() => {
      queryCache.clear()
    }, 0)

    return result
  })
}

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  addMiddleware(prisma)
}

export { prisma } 