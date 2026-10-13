// The YouTube plugin for Gyakorló and Vetito: a YouTube link becomes a song (Gyakorló) or a video / a song in the
// library (Vetito) — the video (with its sound), or in Vetito the sound only if so set, and its thumbnail are downloaded
// into its own folder with yt-dlp. A plugin of category "source", API 1 (see the apps' docs/PLUGINS.md).
const fs = require('fs');
const path = require('path');

function videoId(url) {
  try {
    const u = new URL(url.trim());
    if (/(^|\.)youtu\.be$/i.test(u.hostname)) return u.pathname.slice(1).split('/')[0] || null;
    if (/(^|\.)youtube\.com$/i.test(u.hostname)) {
      if (u.searchParams.get('v')) return u.searchParams.get('v');
      const m = /^\/(shorts|embed|live)\/([\w-]{6,})/.exec(u.pathname);
      if (m) return m[2];
    }
  } catch { /* not a URL */ }
  return null;
}

exports.activate = host => {
  const bin = path.join(host.plugin.dataDir, 'bin');
  // our own copy (Update yt-dlp) first, then the one the app finds (Homebrew…)
  const ytdlp = () => (fs.existsSync(path.join(bin, 'yt-dlp')) ? path.join(bin, 'yt-dlp') : host.tools.which('yt-dlp'));
  const need = () => { const p = ytdlp(); if (!p) throw new Error('yt-dlp is not installed — Settings → Plugins → YouTube → Update yt-dlp (or brew install yt-dlp)'); return p; };

  async function info(url) {
    const j = JSON.parse(await host.tools.run(need(), ['-J', '--no-playlist', '--no-warnings', url]));
    const ud = j.upload_date || j.release_date; // YYYYMMDD
    return { id: j.id, title: j.title, duration: j.duration, uploader: j.uploader || j.channel || '', artist: j.artist || j.creator || '', date: ud ? `${ud.slice(0, 4)}-${ud.slice(4, 6)}-${ud.slice(6, 8)}` : null, url: j.webpage_url || url };
  }

  async function download(url, dir, { height, audio, progress, signal }) {
    const ffmpeg = host.tools.which('ffmpeg');
    if (!ffmpeg) throw new Error('ffmpeg is not installed (brew install ffmpeg)');
    fs.mkdirSync(dir, { recursive: true });
    // the sound only (Vetito's "What to download"): YouTube's AAC sound, or its best one made AAC, as an .m4a
    if (audio === 'only') return downloadSound(url, dir, { ffmpeg, progress, signal });
    // audio: 'best' — YouTube's best audio (usually Opus, above the AAC one) made AAC 256 k for the mp4; 'best320' — the same at
    // 320 k; 'aac' — the AAC stream as it is (no re-encoding)
    const audioBest = audio !== 'aac', kbps = audio === 'best320' ? 320 : 256;
    const fmt = audioBest ? `bv*[height<=${height}]+ba[acodec=opus]/bv*[height<=${height}]+ba/b[height<=${height}]/b`
      : `bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/bv*[height<=${height}]+ba/b[height<=${height}]/b`;
    let part = 0; // video, then audio
    const args = ['--no-playlist', '--newline', '--no-warnings', '-f', fmt, '--merge-output-format', 'mp4',
      ...(audioBest ? ['--postprocessor-args', `Merger+ffmpeg:-c:a aac -b:a ${kbps}k`] : []),
      '--ffmpeg-location', path.dirname(ffmpeg),
      '--write-thumbnail', '--convert-thumbnails', 'jpg',
      '-o', path.join(dir, 'video.%(ext)s'), '-o', `thumbnail:${path.join(dir, 'thumb.%(ext)s')}`, url];
    let lastErr = null;
    // YouTube refuses a download now and then (HTTP 403): try again before giving up
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await host.tools.run(need(), args, {
          signal,
          onLine: line => {
            if (/Destination:.*video\./.test(line) && !/thumb/.test(line)) part++;
            const m = /\[download\]\s+([\d.]+)%/.exec(line);
            if (m) { const p = Number(m[1]) / 100; progress(part <= 1 ? p * 0.8 : 0.8 + p * 0.18, attempt > 1 ? `retry ${attempt}` : ''); }
            if (/\[Merger\]|\[VideoConvertor\]/.test(line)) progress(0.99, '');
          },
        });
        const file = fs.readdirSync(dir).find(f => /^video\.(mp4|mkv|webm|m4a|mp3)$/i.test(f));
        if (!file) throw new Error('yt-dlp finished but no file was found');
        return file;
      } catch (e) {
        lastErr = e;
        if (signal?.aborted) throw e;
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }
    throw lastErr;
  }

  async function downloadSound(url, dir, { ffmpeg, progress, signal }) {
    await host.tools.run(need(), ['--no-playlist', '--newline', '--no-warnings', '-f', 'ba[ext=m4a]/ba', '-x', '--audio-format', 'm4a',
      '--ffmpeg-location', path.dirname(ffmpeg), '--write-thumbnail', '--convert-thumbnails', 'jpg',
      '-o', path.join(dir, 'audio.%(ext)s'), '-o', `thumbnail:${path.join(dir, 'thumb.%(ext)s')}`, url], {
      signal,
      onLine: line => { const m = /\[download\]\s+([\d.]+)%/.exec(line); if (m) progress(Number(m[1]) / 100 * 0.95, ''); },
    });
    const file = fs.readdirSync(dir).find(f => /^audio\.(m4a|mp3|opus|webm)$/i.test(f));
    if (!file) throw new Error('yt-dlp finished but no file was found');
    return file;
  }

  return {
    sources: [{
      id: 'youtube',
      kind: 'link',
      priority: 10,
      order: 0,
      icon: 'video',
      label: 'A YouTube link',
      description: 'paste it here, or anywhere in the window (⌘V)',
      placeholder: 'YouTube link…',
      types: ['youtube'],
      matches: text => !!videoId(text),
      async add({ text }) {
        const id = videoId(text);
        const old = host.library.get(id);
        if (old?.file) return { songs: [old], existed: true };
        const inf = await info(text.trim());
        const song = host.library.add({ id: inf.id, title: inf.title, source: { type: 'youtube', url: inf.url, uploader: inf.uploader, artist: inf.artist, date: inf.date, duration: inf.duration, thumbUrl: `https://i.ytimg.com/vi/${encodeURIComponent(inf.id)}/mqdefault.jpg` } });
        host.library.save();
        return { songs: [song] };
      },
      async fetch(song, { folder, signal, progress }) {
        const soundOnly = host.app === 'vetito' && host.settings.get('what') === 'sound';
        const file = await download(song.source.url, folder, { height: host.settings.get('videoHeight'), audio: soundOnly ? 'only' : host.settings.get('audioQuality'), progress, signal });
        return { file, thumb: fs.existsSync(path.join(folder, 'thumb.jpg')) ? 'thumb.jpg' : null };
      },
      // what an older song lacks (the artist, the date) — looked up once
      async info(song) { const inf = await info(song.source.url); return { artist: inf.artist, date: inf.date }; },
    }],
    actions: [
      {
        id: 'which', label: 'Which yt-dlp?',
        async run() {
          const p = ytdlp();
          if (!p) return { message: 'yt-dlp is not installed' };
          return { message: `yt-dlp ${(await host.tools.run(p, ['--version'])).trim()} — ${p}` };
        },
      },
      {
        id: 'update', label: 'Update yt-dlp',
        description: 'Download the latest yt-dlp from its releases into the plugin’s folder; it is used before Homebrew’s. Do this when downloads stop working.',
        async run() {
          fs.mkdirSync(bin, { recursive: true });
          const r = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos', { redirect: 'follow' });
          if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
          const buf = Buffer.from(await r.arrayBuffer());
          if (buf.length < 1e6) throw new Error('the download is too small');
          const tmp = path.join(bin, 'yt-dlp.new');
          fs.writeFileSync(tmp, buf, { mode: 0o755 });
          fs.renameSync(tmp, path.join(bin, 'yt-dlp'));
          return { message: `yt-dlp ${(await host.tools.run(path.join(bin, 'yt-dlp'), ['--version'])).trim()} is installed` };
        },
      },
    ],
  };
};

exports.videoId = videoId; // (for the tests)
