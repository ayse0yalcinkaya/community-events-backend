import chalk from 'chalk';
import * as figlet from 'figlet';
import { colors } from './colors';

export class Logo {
  static async display(title: string = 'Boilerplate CLI', subtitle: string = 'Gelişmiş CLI v2.0') {
    const logo = figlet.textSync('Boilerplate', {
      font: 'Standard',
      horizontalLayout: 'full',
      verticalLayout: 'default',
      width: 80,
      whitespaceBreak: true
    });

    console.log('\n');
    console.log(colors.logo.topBorder);
    console.log(colors.logo.content(logo));
    console.log(colors.logo.side + ' '.repeat(37) + colors.logo.side);

    // Title
    const titleWidth = 37;
    const titlePadding = Math.floor((titleWidth - title.length) / 2);
    const titleLine = ' '.repeat(titlePadding) + colors.logo.text(chalk.bold(title)) + ' '.repeat(titleWidth - title.length - titlePadding);
    console.log(colors.logo.side + titleLine + colors.logo.side);

    // Subtitle
    const subtitleWidth = 37;
    const subtitlePadding = Math.floor((subtitleWidth - subtitle.length) / 2);
    const subtitleLine = ' '.repeat(subtitlePadding) + colors.secondary(subtitle) + ' '.repeat(subtitleWidth - subtitle.length - subtitlePadding);
    console.log(colors.logo.side + subtitleLine + colors.logo.side);

    console.log(colors.logo.side + ' '.repeat(37) + colors.logo.side);
    console.log(colors.logo.bottomBorder);
    console.log('\n');
  }

  static async welcome() {
    await this.display('Boilerplate', '🚀 Gelişmiş CLI v2.0');
  }
}
