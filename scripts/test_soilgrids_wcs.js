/* eslint-disable no-console */

// Quick manual verification script for SoilGrids WCS point sampling.
// Run: node scripts/test_soilgrids_wcs.js

// d3-geo-projection is ESM-only; import dynamically inside main.

async function main() {
  const { fromArrayBuffer } = await import('geotiff');
  const { geoInterruptedHomolosine } = await import('d3-geo-projection');

  const lon = 25.99652834677493;
  const lat = 44.43918552093787;
  const rootDepthCm = 170;

  const EARTH_RADIUS_M = 6371007.181;
  const proj = geoInterruptedHomolosine().scale(EARTH_RADIUS_M).translate([0, 0]);
  const out = proj([lon, lat]);
  if (!out) throw new Error('Projection failed');

  const x = out[0];
  const y = -out[1];

  const DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm', '100-200cm'];
  const PROPS = /** @type {const} */ (['clay', 'sand', 'silt']);

  const half = 250;
  const axisCrs = 'http://www.opengis.net/def/crs/EPSG/0/152160';

  async function fetchValue(prop, depth) {
    const coverageId = `${prop}_${depth}_mean`;
    const url =
      'https://maps.isric.org/mapserv?' +
      `map=/map/${prop}.map&` +
      'SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&' +
      `COVERAGEID=${encodeURIComponent(coverageId)}&` +
      'FORMAT=image/tiff&' +
      `SUBSETTINGCRS=${encodeURIComponent(axisCrs)}&` +
      `OUTPUTCRS=${encodeURIComponent(axisCrs)}&` +
      `SUBSET=X(${x - half},${x + half})&` +
      `SUBSET=Y(${y - half},${y + half})`;

    const res = await fetch(url);
    const ab = await res.arrayBuffer();
    if (!res.ok) {
      const txt = Buffer.from(ab).toString('utf8').slice(0, 200);
      throw new Error(`HTTP ${res.status} for ${coverageId}: ${txt}`);
    }

    const tiff = await fromArrayBuffer(ab);
    const image = await tiff.getImage();
    const width = image.getWidth();
    const height = image.getHeight();
    const raster = await image.readRasters({ interleave: true });

    const cx = Math.floor(width / 2);
    const cy = Math.floor(height / 2);
    const idx = cy * width + cx;
    return Number(raster[idx]); // g/kg
  }

  async function mapWithConcurrency(items, limit, fn) {
    const results = new Array(items.length);
    let nextIndex = 0;
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
      while (true) {
        const i = nextIndex++;
        if (i >= items.length) return;
        results[i] = await fn(items[i]);
      }
    });
    await Promise.all(workers);
    return results;
  }

  const tasks = [];
  for (const depth of DEPTHS) {
    for (const prop of PROPS) tasks.push({ prop, depth });
  }

  const started = Date.now();
  const values = await mapWithConcurrency(tasks, 4, (t) => fetchValue(t.prop, t.depth));
  const elapsedMs = Date.now() - started;

  const profile = { clay: [], sand: [], silt: [] };
  for (let i = 0; i < tasks.length; i++) {
    const { prop, depth } = tasks[i];
    const [topStr, bottomStr] = depth.replace('cm', '').split('-');
    const top = Number(topStr);
    const bottom = Number(bottomStr);
    profile[prop].push({ depth, top, bottom, pct: values[i] / 10 });
  }
  for (const prop of PROPS) profile[prop].sort((a, b) => a.top - b.top);

  function aggregate(propArr) {
    let thicknessSum = 0;
    let weighted = 0;
    for (const layer of propArr) {
      const overlap = Math.max(0, Math.min(rootDepthCm, layer.bottom) - layer.top);
      if (overlap <= 0) continue;
      thicknessSum += overlap;
      weighted += layer.pct * overlap;
    }
    return thicknessSum ? weighted / thicknessSum : 0;
  }

  const clay = aggregate(profile.clay);
  const sand = aggregate(profile.sand);
  const silt = aggregate(profile.silt);
  console.log(JSON.stringify({ elapsedMs, clay, sand, silt, sum: clay + sand + silt }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
