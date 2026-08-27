# Campus video

| File | Used by |
| --- | --- |
| `school-01.mp4` … `school-03.mp4` | **Inside the school** section on the home page |
| `summer-camp-01.mp4` … `summer-camp-04.mp4` | **Summer Camp** section on the home page |
| `posters/*.webp` | Cover images — a still from each clip |

Clips are re-encoded for the web: capped at 720p, H.264 CRF 28, with the moov
atom moved to the front so playback can start before the file has finished
downloading. Nothing is fetched until the visitor presses play — the sections
load the cover image only (13–27 KB each).

Both sections are the same **Video gallery** block type. To change what they
show, go to **Admin → Website Builder** and open the section: each clip has a
caption, a video file and a cover image, and clips can be added, reordered or
removed. Upload new files from the Media Library, or drop them here and
reference them as `/assets/video/<name>.mp4`.

> **Before publishing:** these clips show identifiable students, including
> children. Make sure the school holds written consent for each one.
