#!/usr/bin/env node

/**
 * Generate app icons from SVG source
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function generateIcons() {
  // Install dependencies if needed
  try {
    require.resolve('sharp');
  } catch (e) {
    console.log('Installing sharp...');
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
  }

  const sharp = require('sharp');
  const svgPath = path.join(__dirname, '../src-tauri/icons/bilibili-icon.svg');
  const iconsDir = path.join(__dirname, '../src-tauri/icons');

  const svgBuffer = fs.readFileSync(svgPath);

  // PNG sizes needed for Tauri
  const sizes = [
    { name: '32x32.png', size: 32 },
    { name: '128x128.png', size: 128 },
    { name: '128x128@2x.png', size: 256 },
    { name: 'icon.png', size: 512 },
    { name: 'Square30x30Logo.png', size: 30 },
    { name: 'Square44x44Logo.png', size: 44 },
    { name: 'Square71x71Logo.png', size: 71 },
    { name: 'Square89x89Logo.png', size: 89 },
    { name: 'Square107x107Logo.png', size: 107 },
    { name: 'Square142x142Logo.png', size: 142 },
    { name: 'Square150x150Logo.png', size: 150 },
    { name: 'Square284x284Logo.png', size: 284 },
    { name: 'Square310x310Logo.png', size: 310 },
    { name: 'StoreLogo.png', size: 50 },
  ];

  console.log('Generating PNG icons...');

  for (const { name, size } of sizes) {
    const outputPath = path.join(iconsDir, name);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  Created ${name} (${size}x${size})`);
  }

  // Generate .icns for macOS using iconutil
  console.log('\nGenerating macOS .icns...');
  const iconsetDir = path.join(iconsDir, 'icon.iconset');

  if (!fs.existsSync(iconsetDir)) {
    fs.mkdirSync(iconsetDir);
  }

  const icnsSizes = [16, 32, 64, 128, 256, 512, 1024];
  for (const size of icnsSizes) {
    await sharp(svgBuffer).resize(size, size).png().toFile(path.join(iconsetDir, `icon_${size}x${size}.png`));
    if (size <= 512) {
      await sharp(svgBuffer).resize(size * 2, size * 2).png().toFile(path.join(iconsetDir, `icon_${size}x${size}@2x.png`));
    }
  }

  try {
    execSync(`iconutil -c icns "${iconsetDir}" -o "${path.join(iconsDir, 'icon.icns')}"`, { stdio: 'inherit' });
    console.log('  Created icon.icns');
    fs.rmSync(iconsetDir, { recursive: true });
  } catch (e) {
    console.log('  Warning: Could not create .icns (iconutil not available)');
  }

  // Generate .ico for Windows
  console.log('\nGenerating Windows .ico...');
  try {
    require.resolve('png-to-ico');
  } catch (e) {
    console.log('Installing png-to-ico...');
    execSync('npm install png-to-ico --save-dev', { stdio: 'inherit' });
  }

  try {
    const pngToIco = require('png-to-ico');
    const png256 = await sharp(svgBuffer).resize(256, 256).png().toBuffer();
    const ico = await pngToIco(png256);
    fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
    console.log('  Created icon.ico');
  } catch (e) {
    console.log('  Warning: Could not create .ico:', e.message);
  }

  console.log('\nDone! All icons generated.');
}

generateIcons().catch(console.error);
