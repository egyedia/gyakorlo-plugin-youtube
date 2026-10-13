// node test.js — the links the plugin takes, and that it loads against a host like Gyakorló's (plugin API 1)
const { videoId, activate } = require('./index.js');
let failures = 0;
const eq = (got, want, msg) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(`${ok ? '  ✓' : '  ✗'} ${msg}${ok ? '' : ` — got ${JSON.stringify(got)}`}`); if (!ok) failures++; };

eq(videoId('https://www.youtube.com/watch?v=gNdXw0Iu2cM&t=10s'), 'gNdXw0Iu2cM', 'watch link');
eq(videoId('https://youtu.be/gNdXw0Iu2cM?si=xyz'), 'gNdXw0Iu2cM', 'short link');
eq(videoId('https://www.youtube.com/shorts/abcdefghijk'), 'abcdefghijk', 'shorts link');
eq(videoId('https://music.youtube.com/watch?v=abcdefghijk&list=x'), 'abcdefghijk', 'YouTube Music link');
eq(videoId('https://example.com/watch?v=abcdefghijk'), null, 'another site');
eq(videoId('hello'), null, 'not a link');

const host = { plugin: { dataDir: require('os').tmpdir() }, tools: { which: () => null, run: async () => '' }, settings: { get: () => undefined }, library: {} };
const got = activate(host), src = got.sources[0];
eq([src.kind, src.types, src.matches('https://youtu.be/gNdXw0Iu2cM'), src.matches('https://example.com/a.mp3')], ['link', ['youtube'], true, false], 'a link source for YouTube songs, and only YouTube links');
eq(got.actions.map(a => a.id), ['which', 'update'], 'its buttons: which yt-dlp, update yt-dlp');

eq(require('./plugin.json').apps, ['gyakorlo', 'vetito'], 'for both apps');
// a list link, with "Whole playlist" on: all its videos, in order, and the list's name
(async () => {
  const fs = require('fs'), os = require('os'), path = require('path');
  const added = [], settings = { playlist: true, videoHeight: 1080 };
  const calls = [];
  const fake = {
    app: 'vetito', plugin: { dataDir: os.tmpdir() }, settings: { get: k => settings[k] },
    tools: {
      which: n => `/usr/bin/${n}`,
      run: async (bin, args, opts) => {
        calls.push(args);
        if (args.includes('--flat-playlist')) return 'aaaaaaaaaaa\tMy list\tOne\nbbbbbbbbbbb\tMy list\tTwo\n';
        const o = args[args.indexOf('-o') + 1];
        fs.writeFileSync(o.replace('%(ext)s', 'mp4'), 'x');
        return '';
      },
    },
    library: { get: () => null, add: m => (added.push(m), { ...m, file: null }), save() {} },
  };
  const src2 = activate(fake).sources[0];
  const r = await src2.add({ text: 'https://www.youtube.com/watch?v=aaaaaaaaaaa&list=PL123' });
  eq([r.songs.map(x => x.id), r.playlist?.name], [['aaaaaaaaaaa', 'bbbbbbbbbbb'], 'My list'], 'a list link with Whole playlist on: its videos in order, and the list');
  eq(src2.matches('https://www.youtube.com/playlist?list=PL123'), true, 'a playlist page is a YouTube link too');
  settings.playlist = false;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-'));
  const got = await src2.fetch({ source: { url: 'https://youtu.be/aaaaaaaaaaa' } }, { folder: dir, progress() {}, height: 2160, name: 'video-4K' });
  const last = calls[calls.length - 1];
  eq([got.file, last[last.indexOf('-f') + 1].includes('height<=2160')], ['video-4K.mp4', true], 'another quality: its own height and its own file (the first one stays)');
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(failures ? `\n${failures} failed` : '\nyoutube plugin: all passed');
  process.exitCode = failures ? 1 : 0;
})();
