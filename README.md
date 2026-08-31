# DanielC | Portfolio

Live at **https://tacocruz.github.io/Portfolio/**

The site is built from Python. You edit `content.py`, run one command, and the
published page is regenerated for you.

## Changing the site

```bash
python build.py
```

That reads `content.py` and writes `index.html` and `assistant-config.js`.
No `pip install` needed — it uses only the Python standard library (3.8+).

The full loop:

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

## If the build complains

`build.py` stops with a plain-English message rather than publishing a broken
page. The two usual causes:

- **`SyntaxError` in content.py** — usually a missing comma or quote. The error
  names the line number.
- **`course ... has category 'x', which is not one of the COURSE_FILTERS keys`** —
  a course's `category` must match one of the `key` values in `COURSE_FILTERS`.

Nothing is written to `index.html` when the build fails, so the live site is
never left half-updated.
