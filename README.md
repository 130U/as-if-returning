# As If Leaving, As If Returning

若往若还: an essay in Chinese and English on a new version of the *Der Freischütz* fantasy, at <https://www.theodoreoy.com/as-if-returning/>.

The page opens on a handscroll, the *Nymph of the Luo River*. It unrolls from the right as the recording plays, and moving the scroll moves the music. Beneath it lies the shadow of the melody, the recording's spectrum drawn as ink.

## Layout

- `src/content/` holds the essay in each language.
- `src/components/Page.astro` assembles both pages; the plates and captions live there.
- `src/scripts/scroll.ts` ties the scroll to the recording.
- `scripts/` prepares what is committed under `public/` and `src/assets/`: `plates.mjs` places the artworks, `shadow.mjs` draws the shadow from a WAV, and `font.mjs` subsets the Chinese typeface. Run `npm run font -- <NotoSerifSC.ttf>` after any change to the Chinese text.

## Credits

Plates: *Nymph of the Luo River*, attributed to Gu Kaizhi, Song dynasty copy, Palace Museum, Beijing; Feng Chengsu's Tang dynasty copy of Wang Xizhi's *Orchid Pavilion Preface*, Palace Museum, Beijing; set design for the Wolf's Glen, Weimar, 1822, by Carl Wilhelm Holdermann, Karl Wilhelm Lieber and Carl August Schwerdgeburth. The works are in the public domain. The scroll is published unaltered; the other plates are only cropped or scaled.

Type: Noto Serif SC and Newsreader, both under the SIL Open Font License 1.1.
