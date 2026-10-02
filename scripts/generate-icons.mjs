import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const SRC = "public/channels4_profile.jpg";
const OUT = "public/icons";

await mkdir(OUT, { recursive: true });

async function square(size, padding, out) {
  const inner = Math.round(size * (1 - padding * 2));
  const logo = await sharp(SRC)
    .resize(inner, inner, { fit: "contain", background: "#ffffff" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#ffffff",
    },
  })
    .composite([{ input: logo, gravity: "centre" }])
    .png()
    .toFile(out);
}

await square(192, 0.12, `${OUT}/icon-192.png`);
await square(512, 0.12, `${OUT}/icon-512.png`);
await square(512, 0.22, `${OUT}/icon-maskable-512.png`);
await square(180, 0.12, `${OUT}/apple-touch-icon.png`);

console.log("icons generated");
