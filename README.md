# postshot

A TypeScript CLI that turns social media post URLs into branded image cards.

The current implementation supports Mastodon and includes a Bluesky adapter scaffold for the same rendering pipeline. The architecture is designed so that future adapters can plug into the same normalised post model, theming system, config loader, and metadata pipeline.

## Features

* Takes a Mastodon post URL and fetches the post via the public Mastodon API.
* Uses a reusable adapter abstraction so other networks can be added without changing the renderer.
* Renders output through reusable HTML/CSS themes with Handlebars templates.
* Supports multiple themes under `themes/THEMENAME/`.
* Supports a JSON config file plus CLI flags, with CLI values overriding config values.
* Supports configurable output format: `png`, `jpg`, `webp`.
* Supports configurable dimensions and aspect ratios.
* Supports configurable background styles: solid colour or gradient.
* Generates ALT text from the post content.
* Writes ALT text sidecar output by default.
* Embeds ALT text into PNG files via PNG text chunks.
* Embeds ALT text into JPEG files via XMP APP1 metadata.
* Attempts ALT text embedding for WEBP via an XMP chunk.
* Uses Playwright for deterministic rendering.

## Architecture

The tool is split into clear layers:

* *Adapter layer*: fetches and normalises a post from a network into `SocialPostData`.
* *Theme layer*: provides HTML/CSS templates and theme defaults.
* *Renderer layer*: renders the normalised post object to HTML and then to an image.
* *Metadata layer*: generates ALT text and embeds it where supported.
* *Config layer*: loads defaults from JSON and merges CLI overrides on top.

That means a future `XAdapter`, `ThreadsAdapter`, `LinkedInAdapter`, or `RedditAdapter` only needs to return the same internal data shape. Rendering and metadata can remain unchanged.

## Project structure

```text
postshot/
├── examples/
│   └── postshot.config.json
├── src/
│   ├── adapters/
│   │   ├── bluesky-adapter.ts
│   │   └── mastodon-adapter.ts
│   ├── config/
│   │   └── load-config.ts
│   ├── core/
│   │   ├── adapters.ts
│   │   ├── alt-text.ts
│   │   ├── render.ts
│   │   ├── template-engine.ts
│   │   ├── theme.ts
│   │   └── types.ts
│   └── cli.ts
├── themes/
│   ├── default/
│   │   ├── post.css
│   │   ├── post.hbs
│   │   └── theme.json
│   └── quote/
│       ├── post.css
│       ├── post.hbs
│       └── theme.json
└── README.md
```

## Installation

```bash
npm install
npx playwright install chromium
npm run build
```

## Config file support

The tool looks for a config file in this order:

* explicit `--config <file>`
* `./postshot.config.json`
* `./.postshot.json`
* legacy `./social-post-shot.config.json`
* legacy `./.social-post-shot.json`

CLI options override config values.

Example config:

```json
{
  "defaults": {
    "outputFormat": "png",
    "width": 1600,
    "aspectRatio": "4:5",
    "locale": "en-GB",
    "timezone": "UTC",
    "embedAltText": true,
    "writeAltTextSidecar": true,
    "dryRun": false
  },
  "theme": {
    "name": "default",
    "backgroundType": "gradient",
    "gradientFrom": "#101418",
    "gradientTo": "#1e293b",
    "gradientAngle": 145,
    "cardMaxWidth": 920,
    "padding": 72
  }
}
```

## Usage

### Basic example

```bash
node ./dist/cli.js   --url "https://mas.to/@Daojoan@mastodon.social/116181703584630659"
```

### Use a config file with CLI overrides

```bash
node ./dist/cli.js   --config ./examples/postshot.config.json   --url "https://mas.to/@Daojoan@mastodon.social/116181703584630659"   --theme quote   --format webp   --aspect-ratio 1:1
```

### Explicit output path and solid background

```bash
node ./dist/cli.js   --url "https://mas.to/@Daojoan@mastodon.social/116181703584630659"   --output "./output/mastodon-post.png"   --format png   --width 1600   --background-type solid   --background-color "#111827"
```

### Inspect fetched data without rendering

```bash
node ./dist/cli.js   --url "https://mas.to/@Daojoan@mastodon.social/116181703584630659"   --dry-run
```

## CLI options

| Option | Purpose | Default source |
| --- | --- | --- |
| `--url <url>` | Post URL to render | required |
| `--config <file>` | Path to a JSON config file | auto-detect |
| `--output <file>` | Output image path | derived from URL |
| `--format <png|jpg|webp>` | Image format | config or `png` |
| `--width <pixels>` | Output width | config or `1600` |
| `--height <pixels>` | Output height | config or `0` |
| `--aspect-ratio <preset>` | Ratio preset: `1:1`, `4:5`, `16:9`, `9:16`, `3:2`, `2:3` | config or unset |
| `--theme <name>` | Theme identifier | config or `default` |
| `--background-type <solid|gradient>` | Background strategy | config or theme |
| `--background-color <color>` | Solid colour fallback | config or theme |
| `--gradient-from <color>` | Gradient start | config or theme |
| `--gradient-to <color>` | Gradient end | config or theme |
| `--gradient-angle <degrees>` | Gradient angle | config or theme |
| `--card-max-width <pixels>` | Maximum card width | config or theme |
| `--padding <pixels>` | Outer canvas padding | config or theme |
| `--locale <locale>` | Date formatting locale | config or `en-GB` |
| `--timezone <timezone>` | Date formatting timezone | config or `UTC` |
| `--embed-alt-text` / `--no-embed-alt-text` | Enable or disable metadata embedding | config or enabled |
| `--write-alt-text-sidecar` / `--no-write-alt-text-sidecar` | Enable or disable `file.alt.txt` output | config or enabled |
| `--dry-run` | Fetch and print normalised data only | config or disabled |

## Theme system

Themes live side by side under `themes/THEMENAME/`.

Each theme contains its own HTML, CSS, and defaults. That means a theme can change layout, spacing, card shape, fonts, colours, background treatment, and reusable CSS variables without touching core renderer code.

Minimal recommended structure:

```text
themes/
  my-theme/
    theme.json
    post.hbs
    post.css
```

Optional structure with assets:

```text
themes/
  my-theme/
    theme.json
    post.hbs
    post.css
    assets/
      my-font.woff2
      texture.png
```

### `theme.json`

A theme can define:

* `templateFile`
* `stylesheetFile`
* `assetsDirectory`
* `postClassName`
* `bodyClassName`
* `background`
* `cardMaxWidth`
* `padding`
* `shadow`
* `borderRadius`
* `fontFamily`
* `fonts`
* `variables`

Example:

```json
{
  "templateFile": "post.hbs",
  "stylesheetFile": "post.css",
  "assetsDirectory": "assets",
  "background": {
    "type": "gradient",
    "gradientFrom": "#101418",
    "gradientTo": "#1e293b",
    "gradientAngle": 145
  },
  "cardMaxWidth": 920,
  "padding": 72,
  "fontFamily": "Inter, system-ui, sans-serif",
  "fonts": [
    {
      "family": "Inter",
      "importUrl": "https://rsms.me/inter/inter.css"
    }
  ],
  "variables": {
    "postshot-accent": "#8b5cf6",
    "postshot-muted": "#94a3b8"
  }
}
```

### Template capabilities

The Handlebars template receives:

* `post`
* `config`
* `backgroundCss`
* `inlineCss`
* `themeFontCss`
* `themeVariableCss`

That allows a theme to:

* define its own HTML structure
* define its own CSS layout rules
* load theme-specific fonts
* inject reusable CSS custom properties
* control the visual look without modifying the adapter or renderer

### Current themes

* `default`: full post card with metrics, media, and link cards
* `quote`: simplified quote-style card for embedding into articles or site designs

## Current Mastodon behaviour

The Mastodon adapter currently uses the instance's public API endpoint:

* `https://INSTANCE/api/v1/statuses/STATUS_ID`

It maps the following into the internal post model:

* author information
* HTML post body
* plain text post body
* content warning / spoiler text
* media attachments
* preview card
* reply / boost / favourite / bookmark counts
* reblogged status when present

This is the most robust approach for Mastodon because it avoids brittle DOM scraping for the primary content model.

## Bluesky scaffold

A Bluesky adapter scaffold is included so the same render pipeline can later support AT Protocol sources. It currently recognises Bluesky URLs and returns a clear not-yet-implemented error.

## ALT text and metadata

`postshot` generates ALT text from the normalised post data.

Current behaviour:

* PNG: embeds a `Description` text chunk
* JPEG: embeds XMP metadata in an APP1 segment
* WEBP: appends an XMP chunk where feasible
* all formats: can write a `file.alt.txt` sidecar

Metadata support differs by viewer and platform, so the sidecar file remains useful even when an application ignores embedded metadata.

## ToDo

* Add authenticated/private post retrieval support where platform APIs and user tokens allow it.
* Implement a real Bluesky fetcher via AT Protocol APIs.
* Add theme listing and preview subcommands.
* Add optional config initialisation command.
* Improve metadata verification across image viewers and publishing pipelines.
