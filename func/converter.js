const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const cheerio = require('cheerio');
const axios = require('axios');
const BodyForm = require('form-data');
const crypto = require('crypto');
const webp = require('node-webpmux'); // Certifique-se de instalar essa biblioteca: npm install node-webpmux

/**
 * Função genérica para executar FFmpeg com argumentos específicos.
 * @param {Buffer} buffer - Buffer da mídia a ser convertida.
 * @param {Array} args - Argumentos do FFmpeg.
 * @param {String} ext - Extensão do arquivo de entrada.
 * @param {String} ext2 - Extensão do arquivo de saída.
 * @returns {Promise<Buffer>} - Buffer do arquivo convertido.
 */
function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const mediaDir = path.join(__dirname, 'media');
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      const tmp = path.join(mediaDir, `${Date.now()}.${ext}`);
      const out = `${tmp}.${ext2}`;

      await fs.promises.writeFile(tmp, buffer);

      const ffmpegProcess = spawn('ffmpeg', [
        '-y',
        '-i', tmp,
        ...args,
        out
      ]);

      ffmpegProcess.on('error', reject);

      ffmpegProcess.on('close', async (code) => {
        try {
          await fs.promises.unlink(tmp);
          if (code !== 0) return reject(new Error(`FFmpeg exited with code ${code}`));
          const convertedBuffer = await fs.promises.readFile(out);
          await fs.promises.unlink(out);
          resolve(convertedBuffer);
        } catch (e) {
          reject(e);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Converte uma imagem para o formato WebP.
 * @param {Buffer} buffer - Buffer da imagem.
 * @returns {Promise<Buffer>} - Buffer da imagem convertida.
 */
async function imageToWebp(buffer) {
  return ffmpeg(buffer, [
    '-vcodec', 'libwebp',
    '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
  ], 'jpg', 'webp');
}

/**
 * Converte um vídeo para o formato WebP.
 * @param {Buffer} buffer - Buffer do vídeo.
 * @returns {Promise<Buffer>} - Buffer do vídeo convertido.
 */
async function videoToWebp(buffer) {
  return ffmpeg(buffer, [
    '-vcodec', 'libwebp',
    '-vf', "scale='min(320,iw)':'min(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
    '-loop', '0',
    '-ss', '00:00:00',
    '-t', '00:00:05',
    '-preset', 'default',
    '-an',
    '-vsync', '0'
  ], 'mp4', 'webp');
}

/**
 * Escreve metadados EXIF em uma imagem WebP.
 * @param {Buffer} media - Buffer da imagem WebP.
 * @param {Object} metadata - Metadados (packname, author, categories).
 * @returns {Promise<String>} - Caminho do arquivo WebP com EXIF.
 */
async function writeExifImg(media, metadata) {
  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);

  fs.writeFileSync(tmpFileIn, media);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis": metadata.categories || [""]
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }

  return tmpFileIn;
}

/**
 * Escreve metadados EXIF em um vídeo WebP.
 * @param {Buffer} media - Buffer do vídeo WebP.
 * @param {Object} metadata - Metadados (packname, author, categories).
 * @returns {Promise<String>} - Caminho do arquivo WebP com EXIF.
 */
async function writeExifVid(media, metadata) {
  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);

  fs.writeFileSync(tmpFileIn, media);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis": metadata.categories || [""]
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }

  return tmpFileIn;
}

/**
 * Escreve metadados EXIF em uma mídia (imagem ou vídeo).
 * @param {Buffer} media - Buffer da mídia.
 * @param {Object} metadata - Metadados (packname, author, categories).
 * @returns {Promise<String>} - Caminho do arquivo WebP com EXIF.
 */
async function writeExif(media, metadata) {
  let wMedia = /webp/.test(media.mimetype) ? media.data :
               /image/.test(media.mimetype) ? await imageToWebp(media.data) :
               /video/.test(media.mimetype) ? await videoToWebp(media.data) : "";

  if (!wMedia) {
    throw new Error("Tipo de mídia não suportado para EXIF.");
  }

  const tmpFileIn = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);
  const tmpFileOut = path.join(os.tmpdir(), `${crypto.randomBytes(6).toString('hex')}.webp`);

  fs.writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-name": metadata.packname || "",
      "sticker-pack-publisher": metadata.author || "",
      "emojis": metadata.categories || [""]
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2A, 0x00,
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x16, 0x00,
      0x00, 0x00
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(tmpFileIn);
    fs.unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }

  return tmpFileIn;
}

module.exports = {
  toAudio,
  toPTT,
  toVideo,
  ffmpeg,
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
  writeExif
};
