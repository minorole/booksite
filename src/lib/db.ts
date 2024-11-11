import { prisma } from './prisma'

export async function getUser(email: string) {
  return await prisma.user.findUnique({
    where: { email }
  })
}

export async function createUser(email: string, name?: string) {
  return await prisma.user.create({
    data: {
      email,
      name
    }
  })
}

// Add more database utility functions as needed 