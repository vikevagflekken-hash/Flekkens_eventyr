/**
 * Build-time script:
 * - scans /steder/
 * - parses informasjon.txt
 * - detects images
 * - copies all place files into /public/steder/
 * - generates /public/generert/steder.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const STEDER_DIR = path.join(ROOT, "steder");
const PUBLIC_DIR = path.join(ROOT, "public");
const PUBLIC_STEDER_DIR = path.join(PUBLIC_DIR, "steder");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "generert");

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".jfif"];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDirIfExists(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function parseInformasjon(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const data = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const idx = line.indexOf(":");
    if (idx === -1) continue;

    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();

    if (key) {
      data[key] = val;
    }
  }

  return data;
}

function detectImages(folderPath, folderName) {
  return fs
    .readdirSync(folderPath)
    .filter((file) => IMAGE_EXTS.includes(path.extname(file).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
    .map((file) => `steder/${folderName}/${file}`);
}

function copyFolderContents(sourceDir, targetDir) {
  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir)) {
    const sourcePath = path.join(sourceDir, entry);
    const targetPath = path.join(targetDir, entry);
    const stat = fs.statSync(sourcePath);

    if (stat.isDirectory()) {
      copyFolderContents(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

async function tryExifGps(imagePath) {
  try {
    const exifr = await import("exifr");
    const gps = await exifr.gps(imagePath);

    if (gps && gps.latitude && gps.longitude) {
      return {
        breddegrad: gps.latitude,
        lengdegrad: gps.longitude,
      };
    }
  } catch {
    // ignore EXIF errors
  }

  return null;
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function getPrimaryImage(meta, folder, bilder) {
  if (meta.forsidebilde) {
    const candidate = `steder/${folder}/${meta.forsidebilde}`;
    if (bilder.includes(candidate)) {
      return candidate;
    }
  }

  return bilder[0] || null;
}

function buildImageSettings(meta, bilder) {
  const result = {};

  bilder.forEach((bildePath, index) => {
    const imageNumber = index + 1;
    const x = parseOptionalNumber(meta[`bilde_${imageNumber}_x`]);
    const y = parseOptionalNumber(meta[`bilde_${imageNumber}_y`]);
    const scale = parseOptionalNumber(meta[`bilde_${imageNumber}_scale`]);

    if (x !== null || y !== null || scale !== null) {
      result[bildePath] = {
        x: x ?? 50,
        y: y ?? 50,
        scale: scale ?? 1,
      };
    }
  });

  return result;
}

async function main() {
  ensureDir(PUBLIC_DIR);
  ensureDir(OUTPUT_DIR);

  if (!fs.existsSync(STEDER_DIR)) {
    fs.writeFileSync(path.join(OUTPUT_DIR, "steder.json"), "[]");
    console.log("No steder/ directory found. Generated empty steder.json");
    return;
  }

  // Rebuild public/steder from scratch so deleted files do not linger
  removeDirIfExists(PUBLIC_STEDER_DIR);
  ensureDir(PUBLIC_STEDER_DIR);

  const folders = fs
    .readdirSync(STEDER_DIR)
    .filter((entry) => fs.statSync(path.join(STEDER_DIR, entry)).isDirectory())
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const steder = [];

  for (const folder of folders) {
    const folderPath = path.join(STEDER_DIR, folder);
    const publicFolderPath = path.join(PUBLIC_STEDER_DIR, folder);
    const infoPath = path.join(folderPath, "informasjon.txt");

    // Copy all files for this place to public/steder/<folder>
    copyFolderContents(folderPath, publicFolderPath);

    const meta = fs.existsSync(infoPath) ? parseInformasjon(infoPath) : {};
    const bilder = detectImages(folderPath, folder);

    if ((!meta.breddegrad || !meta.lengdegrad) && bilder.length > 0) {
      const firstImagePath = path.join(ROOT, bilder[0]);

      if (fs.existsSync(firstImagePath)) {
        const exifCoords = await tryExifGps(firstImagePath);

        if (exifCoords) {
          if (!meta.breddegrad) meta.breddegrad = String(exifCoords.breddegrad);
          if (!meta.lengdegrad) meta.lengdegrad = String(exifCoords.lengdegrad);
        }
      }
    }

    const forsidebilde = getPrimaryImage(meta, folder, bilder);

    steder.push({
      id: meta.id || folder,
      mappe: folder,
      tittel: meta.tittel || folder,
      land: meta.land || null,
      by: meta.by || null,
      sted: meta.sted || null,
      dato: meta.dato || null,
      beskrivelse: meta.beskrivelse || null,
      morsom_fakta: meta.morsom_fakta || null,
      breddegrad: parseOptionalNumber(meta.breddegrad),
      lengdegrad: parseOptionalNumber(meta.lengdegrad),
      rekkefolge: parseOptionalNumber(meta.rekkefolge),
      map_zoom: parseOptionalNumber(meta.map_zoom ?? meta.kart_zoom),
      forsidebilde,
      bilder,
      bildeInnstillinger: buildImageSettings(meta, bilder),
    });
  }

  steder.sort((a, b) => {
    const aOrder = a.rekkefolge ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.rekkefolge ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    if (a.dato && b.dato && a.dato !== b.dato) {
      return a.dato.localeCompare(b.dato);
    }

    return a.tittel.localeCompare(b.tittel, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "steder.json"),
    JSON.stringify(steder, null, 2)
  );

  console.log(`Genererte ${steder.length} steder til public/generert/steder.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
