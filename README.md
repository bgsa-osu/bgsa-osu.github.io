# BGSA @ The Ohio State University — Website

Live site: https://bgsa-osu.github.io

This guide is for whoever maintains the site. You can do everything below
directly on GitHub in the browser: open a file, click the pencil icon to edit
(or **Add file → Create new file**), then **Commit changes**. GitHub rebuilds
the site automatically, and your change is live in 1–2 minutes.

---

## Where things live

| To change…                        | Edit this                     |
| --------------------------------- | ----------------------------- |
| News: events & achievements       | `news/_posts/` (one file per item) |
| Blog stories                      | `blog/_posts/` (one file per story) |
| Executive Committee (current + past) | `_data/committees.yml`     |
| Gallery                           | `_data/gallery.yml`           |
| Homepage slideshow photos         | `_data/hero.yml`              |
| Resources links                   | `_data/resources.yml`         |
| Goals                             | `_data/goals.yml`             |
| Email, phone, social links, homepage counts | `_config.yml`       |
| About text, page layout           | `index.html`                  |
| Styles                            | `css/style.css`               |
| Member database spreadsheets      | `assets/csv/`                 |

Photos go in `assets/jpeg/`. **Resize photos to about 1600px wide before
uploading.** Phone photos are often 5–30 MB, which makes the site very slow
on mobile data and breaks Facebook/WhatsApp link previews.

---

## Add a news item

1. Upload the photo to `assets/jpeg/`.
2. In `news/_posts/`, create a file named `YYYY-MM-DD-short-title.md`,
   for example `2026-10-05-durga-puja-2026.md`. The date in the filename is
   the date shown on the site and decides the order (newest first).
3. Paste this in and fill it out:

```markdown
---
title: "Durga Puja 2026"
image: /assets/jpeg/durga_puja_2026.jpg
---
Write the announcement here.

A blank line starts a new paragraph. **Double asterisks** make text bold.
Links look like this: [Read more](https://example.com)

- Lists start with a dash
- like this
```

### Event or achievement?

News is split into two groups:

- **Events**: things BGSA organized or took part in (tournaments, festivals,
  fairs, volunteering, panels). This is the default, so you don't need to add anything.
- **Achievements**: members' defenses, awards, and fellowships. Add one line,
  `section: achievements`, to the top block:

```markdown
---
section: achievements
title: "Congratulations Dr. Rahman!"
image: /assets/jpeg/rahman_defense.jpg
---
```

The homepage shows the latest 4 events as full cards and the latest 6
achievements as a photo grid (change the numbers in `_config.yml`). Every item
also gets its own page (good for sharing), and the full lists are at
`/news/events/` and `/news/achievements/`. Long event posts show a preview on
the homepage with a "Read more" link.

Tip: the easiest way to start is to copy an existing post of the same kind
(an old defense post for a new defense), then change the filename, title,
image, and text.

Optional: add `image_alt: "..."` under `image` to describe the photo for
screen readers (otherwise the title is used).

## Add a blog story

Same idea, in `blog/_posts/`:

```markdown
---
title: "Story title"
author: Author Name
---
Story text here.

A blank line starts a new paragraph.
A single line break is kept as a line break (useful for poems and dialogue).
```

For a story written in Bangla, add `lang: bn` under `author`.

## Hand over to a new Executive Committee

Open `_data/committees.yml`. The **first** term in the file is shown as the
current committee; everything below it appears under "Previous Executive
Committees".

1. Upload the new members' photos, e.g. to a new folder `assets/jpeg/ExCom 26-27/`.
2. Copy the whole current-term block and paste it at the top of the file.
3. Change the `term`, then update each member's `role`, `name`, `degree`,
   `department`, `email`, and `photo`.

That's it. The previous committee moves to the "Previous" tab automatically.

## Gallery, slideshow, resources, goals

Each is a simple list in `_data/`. Add, remove, or reorder entries; the
comments at the top of each file show the format. Keep the indentation
(spaces, not tabs), and put text in "quotes" if it contains a colon (`:`).

---

## Previewing locally (optional)

Not required, since GitHub builds the site for you. If you want to preview
changes before committing:

```bash
gem install jekyll
jekyll serve
# then open http://localhost:4000
```

## Post not showing up? Check these first

- **The filename must end in `.md`.** `2026-05-01-minhaz-defense` is ignored;
  `2026-05-01-minhaz-defense.md` works.
- **The filename must start with the date**: `YYYY-MM-DD-title.md`.
- **Dates in the future don't appear** until that day arrives.
- **Image names are case-sensitive.** If the file is `photo.jpg`, writing
  `photo.JPG` in the post gives a broken image (it may look fine on your
  laptop but breaks on the live site).
- **Keep the two `---` lines** at the top of the post, around `title` and `image`.
- **Don't paste Facebook's fancy bold text** (𝐥𝐢𝐤𝐞 𝐭𝐡𝐢𝐬). It's made of special
  symbols, not letters. Type normal text and use `**double asterisks**` instead.
- **When copying an old post as a template, update the title.**
- **Achievement showing under Events?** Add `section: achievements` to its top block.
- **Posts go in `news/_posts/` or `blog/_posts/`**, not in `news/` or a
  top-level `_posts/` folder.

## If the site doesn't update

Check the repository's **Actions** tab. A red ✗ means the build failed. Click
it to see which file caused the problem. Usually it's a YAML formatting issue
in a `_data` file or a missing `---` line in a post.

---

Built with [Jekyll](https://jekyllrb.com) on GitHub Pages. Originally based on
the Dopefolio template (GPL-3.0, see `LICENSE`).
