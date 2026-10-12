# YouTube for Gyakorló

A plugin for [Gyakorló](https://github.com/egyedia/mac-gyakorlo): paste a YouTube link (in the Add dialog, or anywhere
in the window) and the video, its sound and its thumbnail are downloaded into the library with
[yt-dlp](https://github.com/yt-dlp/yt-dlp).

It is not part of Gyakorló itself: install it in **Settings → Plugins → Install from a link…** with

    https://github.com/egyedia/gyakorlo-plugin-youtube

Needs ffmpeg (`brew install ffmpeg`). yt-dlp comes from Homebrew (`brew install yt-dlp`), or the plugin downloads its own
copy: Settings → Plugins → YouTube → **Update yt-dlp** (do that, too, when downloads stop working because YouTube
changed something).

Settings: the video quality (480p … 4K) and the audio quality (YouTube's best audio as AAC 256 k / 320 k, or its AAC stream
as it is).

Mind the terms of the sites you download from, and only download what you may.

A plugin of category `source`, plugin API 1 — see Gyakorló's `docs/PLUGINS.md`.
