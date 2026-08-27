# Campus video

| File | Used by |
| --- | --- |
| `summer-camp-01.mp4` … `-03.mp4` | The **Summer Camp** section on the home page |
| `campus-01.mp4` … `campus-03.mp4`, `campus-07.mp4` | Not used yet |
| `posters/*.webp` | Cover images — a still from each clip |

Clips are re-encoded for the web: capped at 720p, H.264 CRF 28, with the moov
atom moved to the front so playback can start before the file has finished
downloading. Nothing is fetched until the visitor presses play — the section
loads the cover image only.

To change what the Summer Camp section shows, go to **Admin → Website Builder →
Summer Camp**: each clip has a caption, a video file and a cover image, and
clips can be added, reordered or removed. Upload new files from the Media
Library, or drop them here and reference them as `/assets/video/<name>.mp4`.

> **Before publishing:** these clips show identifiable children. Make sure the
> school holds written parental consent for each one.
