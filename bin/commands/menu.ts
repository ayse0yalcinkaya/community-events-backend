import inquirer from 'inquirer';
import { colors } from '../utils/colors';
import { EnvironmentWizard } from '../config/wizard';
import { SimpleWizard } from '../config/simple-wizard';

export class Menu {
  static async show(): Promise<void> {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Ne yapmak istiyorsunuz?',
        choices: [
          { name: '🚀 Hızlı Kurulum (1-2 dk)', value: 'quick-setup' },
          { name: '🔧 Detaylı Kurulum (10+ dk)', value: 'setup' },
          { name: '💻 Development Server Başlat', value: 'dev' },
          { name: '📊 Database Migration', value: 'migrate' },
          { name: '🌱 Seed Data', value: 'seed' },
          { name: '🧪 Test Çalıştır', value: 'test' },
          { name: '📝 Build', value: 'build' },
          { name: '💻 Lint Kontrol', value: 'lint' },
          { name: '❓ Help', value: 'help' },
          { name: '🚪 Exit', value: 'exit' }
        ]
      }
    ]);

    await this.execute(action);
  }

  private static async execute(action: string): Promise<void> {
    switch (action) {
      case 'quick-setup':
        console.log(colors.primary.bold('\n🚀 Hızlı Kurulum başlatılıyor...\n'));
        await SimpleWizard.quickSetup();
        break;

      case 'setup':
        console.log(colors.primary.bold('\n🔧 Detaylı Environment Setup Wizard başlatılıyor...\n'));
        const config = await EnvironmentWizard.setup();
        await EnvironmentWizard.saveToFile(config);
        break;

      case 'dev':
        console.log(colors.accent('\n💻 Development server başlatılıyor...'));
        console.log(colors.dim('Komut: npm run start:dev\n'));
        require('child_process').exec('npm run start:dev');
        break;

      case 'migrate':
        console.log(colors.accent('\n📊 Database migration çalıştırılıyor...'));
        console.log(colors.dim('Komut: npm run prisma:migrate\n'));
        require('child_process').exec('npm run prisma:migrate');
        break;

      case 'seed':
        console.log(colors.accent('\n🌱 Seed data yükleniyor...'));
        console.log(colors.dim('Komut: npm run prisma:seed\n'));
        require('child_process').exec('npm run prisma:seed');
        break;

      case 'test':
        console.log(colors.accent('\n🧪 Testler çalıştırılıyor...'));
        console.log(colors.dim('Komut: npm test\n'));
        require('child_process').exec('npm test');
        break;

      case 'build':
        console.log(colors.accent('\n📝 Proje derleniyor...'));
        console.log(colors.dim('Komut: npm run build\n'));
        require('child_process').exec('npm run build');
        break;

      case 'lint':
        console.log(colors.accent('\n💻 Lint kontrolü yapılıyor...'));
        console.log(colors.dim('Komut: npm run lint\n'));
        require('child_process').exec('npm run lint');
        break;

      case 'help':
        this.showHelp();
        break;

      case 'exit':
        console.log(colors.accent('\n👋 Görüşürüz!\n'));
        process.exit(0);
        break;
    }

    if (action !== 'exit' && action !== 'help') {
      await this.show();
    }
  }

  private static showHelp(): void {
    console.log(colors.primary.bold('\n📚 CLI Komutları:\n'));
    console.log(colors.secondary('• ') + '🚀 Hızlı Kurulum: Enter\'a basarak 1-2 dk\'da kurulum');
    console.log(colors.secondary('• ') + '🔧 Detaylı Kurulum: Tüm ayarları manuel yapılandır');
    console.log(colors.secondary('• ') + '💻 Development Server: Local geliştirme sunucusu');
    console.log(colors.secondary('• ') + '📊 Database Migration: Veritabanı şemalarını güncelle');
    console.log(colors.secondary('• ') + '🌱 Seed Data: Test verilerini yükle');
    console.log(colors.secondary('• ') + '🧪 Test: Unit testleri çalıştır');
    console.log(colors.secondary('• ') + '📝 Build: Projeyi derle');
    console.log(colors.secondary('• ') + '💻 Lint: Kod kalitesi kontrolü\n');
  }
}
