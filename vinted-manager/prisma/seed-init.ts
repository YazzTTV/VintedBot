import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = `${process.env.DATABASE_URL}`
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@vinted-manager.io' },
    update: {},
    create: {
      email: 'admin@vinted-manager.io',
      name: 'Gaëtan Admin',
      password: 'default_init_pwd_temp' // Temporary placeholder
    }
  })
  console.log('--- SEEDING SUCCESS ---')
  console.log('Admin User Created ID:', user.id)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
