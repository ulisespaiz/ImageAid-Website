# ImageAiD website (redesign concept)

Mobile-first static site: plain HTML, CSS, and a bit of vanilla JS. No build step, no framework, no third-party requests. Deploys to Cloudflare Pages as is.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Home: hero, key facts, problem, waveform approach, how it works, audiences, team teaser, contact |
| `team.html` | Leadership and advisors |
| `thanks.html` | Post-submit page for the no-JS form path |
| `functions/api/contact.js` | Cloudflare Pages Function that handles the contact form |
| `_headers` | Security headers (CSP, HSTS, etc.) and cache rules |

Header and footer markup is repeated in all three HTML files. When you change a nav link, change it in every file.

## Run locally

```sh
python3 -m http.server 8080
# open http://localhost:8080
```

The form endpoint only exists on Cloudflare. Locally, a submit shows the error state with the email fallback. To test the function too, run `npx wrangler pages dev .`.

## Deploy (Cloudflare Pages)

1. Pages → Create → Connect to Git → pick this repo. Framework preset: **None**. Build command: *(empty)*. Output directory: `/`.
2. Add the custom domain under Pages → Custom domains (the domain is already on Cloudflare DNS).
3. Set the contact-form variables (Settings → Variables and Secrets):

| Variable | Required | Notes |
|---|---|---|
| `RESEND_API_KEY` | for email delivery | Without it, submissions are only written to the Pages function logs |
| `CONTACT_TO` | with Resend | Inbox that receives submissions |
| `CONTACT_FROM` | with Resend | Sender on a domain verified in Resend, e.g. `Website <web@newdomain.com>` |
| `TURNSTILE_SECRET` | recommended | Turns on Cloudflare Turnstile verification |

To turn on Turnstile, also uncomment the `cf-turnstile` div in `index.html`, put in the site key, and add `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` before `</body>`. The CSP already allows that host.

If you change the inline `<script>` in a page `<head>`, regenerate its hash in `_headers`:
```sh
printf "%s" "document.documentElement.classList.replace('no-js', 'js');" | openssl dgst -sha256 -binary | base64
```

## Rebrand checklist (once the new name and logo arrive)

- [ ] Find/replace `ImageAiD` in `*.html`, `functions/`, and this README
- [ ] Swap the inline SVG mark (`.brand-mark`) in each page header/footer, and replace `assets/img/favicon.svg`
- [ ] Update the brand colors in `:root` of `assets/css/styles.css` (`--brand`, `--signal`, `--ink`)
- [ ] Replace `hello@imageaid.us` (index, footer, main.js error message)
- [ ] Add `<link rel="canonical">` and `og:url` for the new domain; regenerate `assets/img/og.png`
- [ ] 301-redirect the old domain to the new one (Cloudflare Bulk Redirects or a Pages `_redirects` rule on the old zone)

## Content still needed from the client

- [ ] Team: names, titles, 2-line bios, headshots (square, at least 400px), LinkedIn URLs, and whether to show advisors
- [ ] Final logo files (SVG preferred) and brand colors
- [ ] Public contact address
- [ ] Regulatory review of all claims and of the footer disclaimer
- [ ] Confirm or source each stat; currently CDC (PAD prevalence) and the ABI > 1.40 threshold
- [ ] Any clinical study, grant, award, or partner logos they're allowed to show
