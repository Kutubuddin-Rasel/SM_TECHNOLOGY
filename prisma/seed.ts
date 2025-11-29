import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            password: adminPassword,
            role: 'admin'
        },
        create: {
            email: 'admin@example.com',
            password: adminPassword,
            role: 'admin'
        }
    });

    // Create super admin user
    const superAdminPassword = await bcrypt.hash('superadmin123', 10);

    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@example.com' },
        update: {
            password: superAdminPassword,
            role: 'super_admin'
        },
        create: {
            email: 'superadmin@example.com',
            password: superAdminPassword,
            role: 'super_admin'
        }
    });

    // Create regular test user
    const userPassword = await bcrypt.hash('user123', 10);

    const user = await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {
            password: userPassword,
            role: 'user'
        },
        create: {
            email: 'user@example.com',
            password: userPassword,
            role: 'user'
        }
    });

    console.log('✅ Seed completed successfully!');
    console.log('\n📋 Created/Updated users:');
    console.log(`  👤 Regular User: ${user.email} (password: user123)`);
    console.log(`  👨‍💼 Admin: ${admin.email} (password: admin123)`);
    console.log(`  👑 Super Admin: ${superAdmin.email} (password: superadmin123)`);
    console.log('\n🎯 You can now login with any of these accounts!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
