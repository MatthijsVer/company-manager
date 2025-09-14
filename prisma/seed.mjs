// /prisma/seed.mjs
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Password hashing function
async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

async function main() {
  console.log('🌱 Starting database seed...\n')

  const args = process.argv.slice(2)
  const force = args.includes('--force') || args.includes('-f')

  try {
    // Check if organization already exists
    const existingOrg = await prisma.organization.findFirst({
      where: { slug: 'acme-corp' }
    })

    if (existingOrg && !force) {
      console.log('⚠️  Organization already exists. Use --force to reseed.')
      console.log(`   Organization: ${existingOrg.name} (${existingOrg.slug})`)
      
      const existingMembers = await prisma.membership.count({
        where: { organizationId: existingOrg.id }
      })
      console.log(`   Members: ${existingMembers}`)
      console.log('\n   Run: node prisma/seed.mjs --force to reseed\n')
      
      process.exit(0)
    }

    if (existingOrg && force) {
      console.log('🗑️  Force flag detected. Cleaning up existing data...')
      
      // Delete all data (order matters due to foreign keys)
      await prisma.twoFactorToken.deleteMany()
      await prisma.session.deleteMany()
      await prisma.invite.deleteMany()
      await prisma.membership.deleteMany()
      await prisma.account.deleteMany()
      await prisma.verificationToken.deleteMany()
      await prisma.user.deleteMany()
      await prisma.organization.deleteMany()
      
      console.log('✅ Existing data removed\n')
    }

    // Create organization
    console.log('🏢 Creating organization...')
    const organization = await prisma.organization.create({
      data: {
        name: 'Acme Corporation',
        slug: 'acme-corp',
        locale: 'en-US',
        currency: 'USD',
        branding: {
          primaryColor: '#2563eb',
          logo: null,
          favicon: null
        }
      }
    })
    console.log(`✅ Organization created: ${organization.name} (${organization.slug})\n`)

    // Create admin user
    console.log('👤 Creating admin user...')
    const adminPassword = 'Admin123!@#'
    const adminPasswordHash = await hashPassword(adminPassword)
    
    const adminUser = await prisma.user.create({
      data: {
        email: 'matthijsverhoef@live.nl',
        emailVerified: new Date(),
        passwordHash: adminPasswordHash,
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        status: 'ACTIVE',
        locale: 'en-US',
        timezone: 'America/New_York',
        twoFactorEnabled: false,
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            inApp: true
          }
        }
      }
    })
    console.log(`✅ Admin user created: ${adminUser.email}\n`)

    // Create membership (make them OWNER)
    console.log('🔗 Creating membership...')
    await prisma.membership.create({
      data: {
        userId: adminUser.id,
        organizationId: organization.id,
        role: 'OWNER',
        title: 'Founder & CEO',
        isDefault: true
      }
    })
    console.log('✅ Admin user assigned as OWNER\n')

    // Create sample users
    console.log('👥 Creating sample team members...')
    
    const sampleUsers = [
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'ADMIN',
        title: 'CTO'
      },
      {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'HR',
        title: 'HR Manager'
      },
      {
        email: 'mike.wilson@example.com',
        firstName: 'Mike',
        lastName: 'Wilson',
        role: 'PROJECT_MANAGER',
        title: 'Senior Project Manager'
      },
      {
        email: 'sarah.jones@example.com',
        firstName: 'Sarah',
        lastName: 'Jones',
        role: 'MEMBER',
        title: 'Software Engineer'
      }
    ]

    const samplePassword = 'Demo123!@#'
    const samplePasswordHash = await hashPassword(samplePassword)

    for (const sampleUser of sampleUsers) {
      const user = await prisma.user.create({
        data: {
          email: sampleUser.email.toLowerCase(),
          emailVerified: new Date(),
          passwordHash: samplePasswordHash,
          firstName: sampleUser.firstName,
          lastName: sampleUser.lastName,
          name: `${sampleUser.firstName} ${sampleUser.lastName}`,
          status: 'ACTIVE',
          locale: 'en-US',
          timezone: 'America/New_York',
          twoFactorEnabled: false
        }
      })

      await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: sampleUser.role,
          title: sampleUser.title,
          isDefault: true
        }
      })

      console.log(`   ✅ ${sampleUser.firstName} ${sampleUser.lastName} (${sampleUser.role})`)
    }

    // Success message
    console.log('\n' + '='.repeat(60))
    console.log('🎉 Database seeded successfully!\n')
    console.log('📝 Login Credentials:')
    console.log('='.repeat(60))
    console.log(`🏢 Organization: ${organization.name}`)
    console.log(`🔗 Slug: ${organization.slug}`)
    console.log(`📧 Admin Email: admin@example.com`)
    console.log(`🔑 Admin Password: ${adminPassword}`)
    console.log('\n📝 Sample User Credentials:')
    console.log(`   All sample users have password: ${samplePassword}`)
    sampleUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.role})`)
    })
    console.log('='.repeat(60))
    console.log('\n💡 Tips:')
    console.log('   - Login at: http://localhost:3000/auth/login')
    console.log('   - Enable 2FA in security settings after login')
    console.log('   - Invite more users from the admin panel')
    console.log('   - Change the default passwords after first login\n')

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
main()
  .catch((error) => {
    console.error('❌ Unhandled error:', error)
    process.exit(1)
  })