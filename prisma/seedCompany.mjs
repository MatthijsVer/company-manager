// prisma/seedCompany.mjs
import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import bcrypt from 'bcryptjs'
import readline from 'node:readline'

const prisma = new PrismaClient()

// ------------------ CONFIG ------------------
const COMPANIES_COUNT = 20
const MIN_CONTACTS_PER_COMPANY = 1
const MAX_CONTACTS_PER_COMPANY = 5
const MIN_NOTES_PER_COMPANY = 0
const MAX_NOTES_PER_COMPANY = 10
const MIN_DOCUMENTS_PER_COMPANY = 0
const MAX_DOCUMENTS_PER_COMPANY = 5
const MIN_ACTIVITIES_PER_COMPANY = 3
const MAX_ACTIVITIES_PER_COMPANY = 15

const COMPANY_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'ARCHIVED']
const COMPANY_TYPES = ['PROSPECT', 'CLIENT', 'PARTNER', 'VENDOR', 'PAST_CLIENT']
const NOTE_CATEGORIES = ['general', 'meeting', 'call', 'email', 'task']
const ACTIVITY_TYPES = [
  'company_created', 'company_updated', 'status_changed', 'type_changed',
  'contact_added', 'contact_updated', 'contact_deleted',
  'note_added', 'note_updated', 'note_deleted',
  'document_uploaded', 'document_deleted',
  'meeting_scheduled', 'call_logged', 'email_sent', 'follow_up_added'
]
const DOCUMENT_CATEGORIES = ['contract', 'proposal', 'invoice', 'quote', 'presentation', 'report', 'legal', 'other']
const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']
const INDUSTRIES = [
  'Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail',
  'Education', 'Real Estate', 'Hospitality', 'Transportation',
  'Energy', 'Media', 'Telecommunications', 'Construction',
  'Agriculture', 'Automotive',
]

// ------------------ HELPERS ------------------
async function hashPassword(password) {
  return bcrypt.hash(password, 12)
}

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(query, (ans) => { rl.close(); resolve(ans) }))
}

function getMimeType(extension) {
  const mimeTypes = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
  }
  return mimeTypes[extension] || 'application/octet-stream'
}

// ------------------ ORG/USER CREATION ------------------
async function createOrganizationAndUser() {
  const existingOrg = await prisma.organization.findFirst()
  const existingUser = await prisma.user.findFirst()
  if (existingOrg && existingUser) {
    console.log('📊 Using existing organization and user')
    return { organization: existingOrg, user: existingUser }
  }

  const organization = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      locale: 'en-US',
      currency: 'USD',
    },
  })

  const adminPassword = 'Admin123!@#'
  const adminPasswordHash = await hashPassword(adminPassword)

  const user = await prisma.user.upsert({
    where: { email: 'admin@acme.com' },
    update: {},
    create: {
      email: 'admin@acme.com',
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      passwordHash: adminPasswordHash,
      status: 'ACTIVE',
      emailVerified: new Date(),
      locale: 'en-US',
      timezone: 'Europe/Amsterdam',
    },
  })

  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: 'OWNER',
      isDefault: true,
    },
  })

  console.log('🏢 Created organization and admin user')
  console.log(`   📧 Email: ${user.email}`)
  console.log(`   🔑 Password: ${adminPassword}`)

  return { organization, user }
}

// ------------------ CUSTOM FIELDS ------------------
async function seedCustomFields(organizationId) {
  const existingFields = await prisma.customFieldDefinition.findMany({
    where: { organizationId, entityType: 'company' },
  })
  if (existingFields.length > 0) {
    console.log('  ℹ️ Custom fields already exist, skipping...')
    return existingFields
  }

  const customFields = [
    { organizationId, entityType: 'company', fieldKey: 'account_manager', fieldLabel: 'Account Manager', fieldType: 'text', isActive: true },
    { organizationId, entityType: 'company', fieldKey: 'contract_value', fieldLabel: 'Contract Value', fieldType: 'number', isActive: true },
    { organizationId, entityType: 'company', fieldKey: 'renewal_date', fieldLabel: 'Renewal Date', fieldType: 'date', isActive: true },
    { organizationId, entityType: 'company', fieldKey: 'is_strategic', fieldLabel: 'Strategic Account', fieldType: 'boolean', isActive: true },
    { organizationId, entityType: 'company', fieldKey: 'lead_source', fieldLabel: 'Lead Source', fieldType: 'select', options: ['Website', 'Referral', 'Cold Outreach', 'Trade Show', 'Social Media', 'Other'], isActive: true },
  ]
  await prisma.customFieldDefinition.createMany({ data: customFields })
  console.log(`  ✅ Created ${customFields.length} custom field definitions`)
  return prisma.customFieldDefinition.findMany({ where: { organizationId, entityType: 'company' } })
}

// ------------------ COMPANY SEEDING ------------------
async function seedCompanies(organizationId, userId) {
  console.log('🌱 Starting company data seed...')
  const companies = []
  const activities = []
  const customFields = await seedCustomFields(organizationId)

  for (let i = 0; i < COMPANIES_COUNT; i++) {
    const companyName = faker.company.name()
    const createdAt = faker.date.past({ years: 2 })
    const updatedAt = faker.date.between({ from: createdAt, to: new Date() })

    // Custom field values
    const customFieldValues = {}
    for (const field of customFields) {
      if (field.fieldType === 'text') customFieldValues[field.fieldKey] = faker.lorem.words(3)
      if (field.fieldType === 'number') customFieldValues[field.fieldKey] = faker.number.int({ min: 1, max: 1000 }).toString()
      if (field.fieldType === 'boolean') customFieldValues[field.fieldKey] = faker.datatype.boolean()
      if (field.fieldType === 'select' && field.options) customFieldValues[field.fieldKey] = faker.helpers.arrayElement(field.options)
      if (field.fieldType === 'date') customFieldValues[field.fieldKey] = faker.date.recent().toISOString()
    }

    const company = await prisma.company.create({
      data: {
        organizationId,
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        email: faker.internet.email({ firstName: companyName }),
        phone: faker.phone.number(),
        website: faker.internet.url(),
        address: {
          street: faker.location.streetAddress(),
          city: faker.location.city(),
          state: faker.location.state({ abbreviated: true }),
          country: faker.location.country(),
          postalCode: faker.location.zipCode(),
        },
        industry: faker.helpers.arrayElement(INDUSTRIES),
        size: faker.helpers.arrayElement(COMPANY_SIZES),
        annualRevenue: `$${faker.number.int({ min: 100, max: 50000 })}K`,
        description: faker.company.catchPhrase() + '. ' + faker.lorem.paragraph(),
        status: faker.helpers.arrayElement(COMPANY_STATUSES),
        type: faker.helpers.arrayElement(COMPANY_TYPES),
        tags: faker.helpers.arrayElements(['strategic', 'high-priority', 'new', 'established'], { min: 1, max: 3 }).join(','),
        rating: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 5 }), { probability: 0.7 }),
        customFields: customFieldValues,
        createdBy: userId,
        updatedBy: userId,
        createdAt,
        updatedAt,
      },
    })

    companies.push(company)
    console.log(`✅ Created company: ${company.name}`)

    // Contacts
    const contactsCount = faker.number.int({ min: MIN_CONTACTS_PER_COMPANY, max: MAX_CONTACTS_PER_COMPANY })
    for (let j = 0; j < contactsCount; j++) {
      await prisma.companyContact.create({
        data: {
          companyId: company.id,
          name: faker.person.fullName(),
          title: faker.person.jobTitle(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          isPrimary: j === 0,
          department: faker.helpers.arrayElement(['Sales', 'Marketing', 'Engineering', 'HR', 'Finance', 'Operations']),
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.5 }),
        },
      })
    }

    // Notes
    const notesCount = faker.number.int({ min: MIN_NOTES_PER_COMPANY, max: MAX_NOTES_PER_COMPANY })
    for (let k = 0; k < notesCount; k++) {
      await prisma.companyNote.create({
        data: {
          companyId: company.id,
          userId,
          content: faker.lorem.paragraph(),
          category: faker.helpers.arrayElement(NOTE_CATEGORIES),
        },
      })
    }

    // Documents
    const docsCount = faker.number.int({ min: MIN_DOCUMENTS_PER_COMPANY, max: MAX_DOCUMENTS_PER_COMPANY })
    for (let d = 0; d < docsCount; d++) {
      const ext = faker.helpers.arrayElement(['pdf', 'docx', 'xlsx', 'pptx', 'png', 'jpg'])
      const fileName = `doc_${faker.string.alphanumeric(8)}.${ext}`
      await prisma.companyDocument.create({
        data: {
          companyId: company.id,
          uploadedBy: userId,
          fileName,
          fileUrl: `/uploads/${company.id}/${fileName}`,
          fileSize: faker.number.int({ min: 10000, max: 10000000 }),
          mimeType: getMimeType(ext),
          category: faker.helpers.arrayElement(DOCUMENT_CATEGORIES),
        },
      })
    }

    // Activities
    const activitiesCount = faker.number.int({ min: MIN_ACTIVITIES_PER_COMPANY, max: MAX_ACTIVITIES_PER_COMPANY })
    const activityStartDate = faker.date.between({ from: createdAt, to: new Date() })
    
    for (let a = 0; a < activitiesCount; a++) {
      const activityType = faker.helpers.arrayElement(ACTIVITY_TYPES)
      const activityDate = faker.date.between({ from: activityStartDate, to: new Date() })
      
      let description = ''
      let metadata = {}
      
      switch (activityType) {
        case 'company_created':
          description = `Company ${companyName} was created`
          metadata = { companyName }
          break
        case 'company_updated':
          description = `Updated company information`
          metadata = { fields: ['name', 'status', 'type'] }
          break
        case 'status_changed':
          description = `Status changed to ${faker.helpers.arrayElement(COMPANY_STATUSES)}`
          metadata = { newStatus: faker.helpers.arrayElement(COMPANY_STATUSES) }
          break
        case 'contact_added':
          description = `Added new contact ${faker.person.firstName()}`
          metadata = { contactName: faker.person.firstName() }
          break
        case 'note_added':
          description = `Added a ${faker.helpers.arrayElement(NOTE_CATEGORIES)} note`
          metadata = { category: faker.helpers.arrayElement(NOTE_CATEGORIES) }
          break
        case 'document_uploaded':
          description = `Uploaded document ${faker.system.fileName()}`
          metadata = { fileName: faker.system.fileName(), category: faker.helpers.arrayElement(DOCUMENT_CATEGORIES) }
          break
        case 'meeting_scheduled':
          description = `Scheduled meeting with ${faker.person.firstName()}`
          metadata = { meetingTitle: faker.company.buzzPhrase(), attendees: [faker.person.firstName()] }
          break
        case 'call_logged':
          description = `Logged call with ${faker.person.firstName()}`
          metadata = { duration: faker.number.int({ min: 5, max: 120 }), outcome: faker.helpers.arrayElement(['positive', 'neutral', 'follow-up-needed']) }
          break
        case 'email_sent':
          description = `Sent email regarding ${faker.company.buzzPhrase()}`
          metadata = { subject: faker.company.buzzPhrase(), recipient: faker.person.firstName() }
          break
        case 'follow_up_added':
          description = `Added follow-up task: ${faker.company.buzzPhrase()}`
          metadata = { taskTitle: faker.company.buzzPhrase(), priority: faker.helpers.arrayElement(['low', 'medium', 'high']) }
          break
        default:
          description = `${activityType.replace('_', ' ')} activity`
          metadata = { type: activityType }
      }

      await prisma.companyActivity.create({
        data: {
          companyId: company.id,
          userId,
          type: activityType,
          description,
          metadata,
          createdAt: activityDate,
        },
      })
    }
  }

  console.log(`\n✨ Successfully seeded ${companies.length} companies with related data!`)
}

// ------------------ MAIN ------------------
async function main() {
  console.log('🚀 Starting database seed...\n')
  try {
    faker.seed(123)
    const { organization, user } = await createOrganizationAndUser()

    const existingCompanies = await prisma.company.count({ where: { organizationId: organization.id } })
    if (existingCompanies > 0) {
      const ans = await askQuestion(`⚠️ Found ${existingCompanies} companies. Delete and reseed? (yes/no): `)
      if (ans.toLowerCase() === 'yes') {
        await prisma.companyActivity.deleteMany({ where: { company: { organizationId: organization.id } } })
        await prisma.companyDocument.deleteMany({ where: { company: { organizationId: organization.id } } })
        await prisma.companyNote.deleteMany({ where: { company: { organizationId: organization.id } } })
        await prisma.companyContact.deleteMany({ where: { company: { organizationId: organization.id } } })
        await prisma.company.deleteMany({ where: { organizationId: organization.id } })
        console.log('✅ Existing data deleted\n')
      } else {
        console.log('❌ Cancelled'); process.exit(0)
      }
    }

    await seedCompanies(organization.id, user.id)

    console.log('\n🎉 Database seeded successfully!')
    console.log('📝 Login with:')
    console.log(`   📧 Email: admin@acme.com`)
    console.log(`   🔑 Password: Admin123!@#`)
  } catch (e) {
    console.error('❌ Error during seed:', e)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
