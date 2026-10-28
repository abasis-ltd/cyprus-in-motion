// Export the show to a looping 1080p MP4, frame by frame, from the page's deterministic render mode.
// Needs Playwright (Chromium) and ffmpeg. Loads the show from this folder via file:// (needs no server;
// a simple local HTTP server without Range support would break video seeking).
// usage: node render_show.cjs out.mp4 [fps=30] [fromSec=0] [toSec=end] [playwrightModulePath]
const { spawn } = require('child_process');
const [out, fpsArg = '30', fromArg = '0', toArg = '', pwPath = 'playwright'] = process.argv.slice(2);
const { chromium } = require(pwPath);
const fps = +fpsArg;
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto('file://' + require('path').join(__dirname, 'show/index.html') + '?render=1', { waitUntil: 'load' });
  await page.evaluate(() => window.__show.ready);
  const total = await page.evaluate(() => window.__show.total);
  const from = Math.round(+fromArg * fps), to = Math.round((toArg ? +toArg * 1000 : total) / 1000 * fps);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    // JPEG frames are full-range; convert to TV range + High@4.1 so TVs and USB players show correct contrast
    '-vf', 'scale=in_range=full:out_range=limited,format=yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-profile:v', 'high', '-level', '4.1', '-g', String(fps * 2), '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    await page.evaluate(ms => window.__show.render(ms), f * 1000 / fps);
    const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - from) % (fps * 10) === 0) console.log(`frame ${f - from}/${to - from}  ${((Date.now() - t0) / 1000).toFixed(0)} s elapsed`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log(`done: ${to - from} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
})().catch(e => { console.error(e); process.exit(1); });
