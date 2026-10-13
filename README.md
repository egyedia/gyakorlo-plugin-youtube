# YouTube for Gyakorló and Vetito

A plugin for [Gyakorló](https://github.com/egyedia/mac-gyakorlo) and [Vetito](https://github.com/egyedia/mac-vetito):
paste a YouTube link (Gyakorló: the Add dialog, or anywhere in the window; Vetito: the library's **Add from the web**)
and the video, its sound and its thumbnail are downloaded into the library with [yt-dlp](https://github.com/yt-dlp/yt-dlp).

It is not part of either app: install it in **Settings → Plugins** by pasting

    https://github.com/egyedia/gyakorlo-plugin-youtube

Needs ffmpeg (`brew install ffmpeg`). yt-dlp comes from Homebrew (`brew install yt-dlp`), or the plugin downloads its own
copy: Settings → Plugins → YouTube → **Update yt-dlp** (do that, too, when downloads stop working because YouTube
changed something).

Settings: the video quality (480p … 4K) and the audio quality (YouTube's best audio as AAC 256 k / 320 k, or its AAC stream
as it is). In Vetito also **What to download**: the video, or the sound only (an .m4a).

Mind the terms of the sites you download from, and only download what you may.

A plugin of category `source`, plugin API 1 (lib-plugin) — see the apps' `docs/PLUGINS.md`.
