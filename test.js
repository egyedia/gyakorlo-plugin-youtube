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

console.log(failures ? `\n${failures} failed` : '\nyoutube plugin: all passed');
process.exitCode = failures ? 1 : 0;
