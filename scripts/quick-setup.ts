#!/usr/bin/env node

/**
 * 🚀 Hızlı Kurulum Script'i
 *
 * Bu script, proje kurulumunu tamamen otomatik yapar:
 * 1. .env dosyasını oluşturur
 * 2. Docker container'larını başlatır
 * 3. Database migration çalıştırır
 * 4. Seed data yükler
 *
 * Kullanım: npm run setup
 *        veya: npx ts-node scripts/quick-setup.ts
 */

import { SimpleWizard } from '../bin/config/simple-wizard';
import { colors } from '../bin/utils/colors';
import { execSync } from 'child_process';

async function main() {
  try {
    console.clear();
    await SimpleWizard.quickSetup();

    console.log(colors.accent('\n🚀 Docker container\'ları başlatılıyor...\n'));
    execSync('npm run docker:up', { stdio: 'inherit' });

    console.log(colors.accent('\n⏳ Database migration çalıştırılıyor...\n'));
    execSync('npm run docker:migrate', { stdio: 'inherit' });

    console.log(colors.accent('\n⏳ Seed data yükleniyor...\n'));
    execSync('npm run docker:seed', { stdio: 'inherit' });

    console.log(colors.success('\n╔═══════════════════════════════════════╗'));
    console.log(colors.success('║          🎉 KURULUM TAMAM! 🎉          ║'));
    console.log(colors.success('╚═══════════════════════════════════════╝\n'));

    console.log(colors.primary.bold('📌 Uygulamanız hazır!'));
    console.log(colors.secondary('   🌐 URL: http://localhost:3000'));
    console.log(colors.secondary('   📚 API Docs: http://localhost:3000/api/docs'));
    console.log(colors.secondary('   📊 Prisma Studio: npm run docker:exec npx prisma studio\n'));

  } catch (error) {
    console.error(colors.error('\n❌ Kurulum sırasında bir hata oluştu:'), error);
    process.exit(1);
  }
}

main();
