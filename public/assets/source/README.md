# Original files as supplied

Untouched originals, kept for reference so the processed versions can always be
regenerated:

| File | Becomes |
| --- | --- |
| `logo-original.jpg` | `../logo/logo.png` — the school's mark, background removed |
| `partner-…-18-29-25.jpeg` | `../partners/manchester-city.png` |
| `partner-…-18-29-31.jpeg` | `../partners/british-council.png` + `../partners/ielts.png` (one file holding two marks, cropped) |
| `partner-…-18-29-38.jpeg` | `../partners/bsc-education.png` |
| `partner-…-18-29-49.jpeg` | `../partners/toles.png` |

Processing applied: the uniform background was made transparent (alpha computed
from colour distance, feathered over a narrow band so anti-aliased edges keep
their shape) and the margin trimmed. No pixel of the artwork itself was altered.
