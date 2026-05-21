#!/usr/bin/env node

import { Logo } from './utils/logo';
import { Menu } from './commands/menu';
import { colors } from './utils/colors';

async function main() {
  try {
    // Logo göster
    await Logo.welcome();

    // Hoşgeldin mesajı
    console.log(colors.accent('🎉 Hoşgeldiniz!'));
    console.log(colors.dim('Bu CLI, projenizi hızlıca yapılandırmanıza yardımcı olur.\n'));

    // Ana menüyü göster
    await Menu.show();
  } catch (error) {
    console.error(colors.error('\n❌ Bir hata oluştu:'), error);
    process.exit(1);
  }
}

// CLI'yı başlat
main();
