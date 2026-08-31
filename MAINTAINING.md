# Maintaining the site

Practical notes for editing and publishing. For what the project *is*, see
[README.md](README.md).

## The loop

```bash
# 1. edit content.py in your editor
# 2. rebuild
python build.py

# 3. see it locally before publishing (open http://localhost:8000)
python -m http.server 8000

# 4. publish
git add -A
git commit -m "Add the new certificate"
git push
```

GitHub Pages redeploys within a minute or two of the push.

`build.py` uses only the Python standard library (3.8+), so there is nothing to
install.

## Which file does what

| File | What it is |
|---|---|
| **`content.py`** | **Everything the site says. This is the file you edit.** |
| `build.py` | Turns `content.py` into the site. Rarely needs changing. |
| `templates/page.html` | The design: all CSS and browser JavaScript. Edit to change how it *looks*. |
| `index.html` | **Generated. Do not edit** — `build.py` overwrites it. |
| `assistant-config.js` | **Generated. Do not edit** — change `ASSISTANT` in `content.py`. |
| `certs/` | Certificate images shown on the page. |
| `supabase/functions/chat/` | The chatbot backend that holds the OpenRouter API key. |
| `.gitattributes` | Pins line endings so rebuilds don't show phantom changes. |

## Common edits

**Add a certificate course.** In `content.py`, find `COURSES`, copy the last
block, paste it below, and change the values:

```python
{
    "title": "Your New Course",
    "category": "agents",          # must match a COURSE_FILTERS key
    "image": "certs/your-image.png",
    "date": "Sep 15, 2026",
    "code": "ABC123XYZ",           # becomes a coursera.org/verify link
},
```

Drop the image into `certs/`, then run `python build.py`.

**Change what the chatbot knows.** Edit `ASSISTANT["prompt"]` in `content.py`,
then rebuild. Write plain prose; quotes and apostrophes are safe to type.

**Change the hero text, stats, or About section.** They are the `HERO`, `STATS`
and `ABOUT` entries near the top of `content.py`.

**Change colors, fonts, or animations.** Those live in the `<style>` block in
`templates/page.html`.

**Change the chatbot's model or daily limit.** The three constants at the top of
`supabase/functions/chat/index.ts`. That function must be redeployed afterwards:

```bash
supabase functions deploy chat --project-ref kfhcaphutihlhuaalzjk
```

## If the build complains

`build.py` stops with a plain-English message rather than publishing a broken
page. The two usual causes:

- **`SyntaxError` in content.py** — usually a missing comma or quote. The error
  names the line number.
- **`course ... has category 'x', which is not one of the COURSE_FILTERS keys`** —
  a course's `category` must match one of the `key` values in `COURSE_FILTERS`.

Nothing is written to `index.html` when the build fails, so the live site is
never left half-updated.

## Publishing setup

GitHub Pages serves the repository root of the `main` branch. Settings → Pages →
Source: "Deploy from a branch" → `main` → `/ (root)`.

Because Pages serves the committed files directly, **the generated `index.html`
and `assistant-config.js` must be committed** — they are build output, but they
are also what visitors load.

## API key safety

The OpenRouter key lives only as a Supabase secret, never in this repository and
never in the browser. The page calls the Edge Function; the function adds the key
server-side. Keep it that way — anything committed here is public.
