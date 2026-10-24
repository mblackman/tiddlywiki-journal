# tiddlywiki-journal

Structured daily, weekly, monthly, and yearly journaling and habit tracking for TiddlyWiki `>=5.4.0` (`$:/plugins/mblackman/journal`). Log daily activities, habits, wins, challenges, and gratitude in a structured format that automatically rolls up into weekly, monthly, and annual review views.

Preview the plugin: **[Journal Demo](https://mblackman.github.io/tiddlywiki-journal/)**

## Features

* **Structured Entries & Complete Period Grids**: Templates for Daily (`YYYY-MM-DD`), Weekly (`GGGG-[W]WW`), Monthly (`YYYY-MM`), and Yearly (`YYYY`) journal entries with full `Mon–Sun` and `Jan–Dec` period grids and clickable "Ghost Cards" for uncreated dates.
* **Next-Gen Habit Engine**: Track numeric, checkbox, and text habits per day with configurable units (`habit-unit`), daily targets (`habit-target`), `sum` vs `avg` roll-ups (`habit-agg`), two-state progress dots (`.habit-dot` vs `.habit-dot-partial`), live `🔥 Xd` streak pills, interactive review checkboxes, and a 2-row `TOTALS / AVG` + `GOAL / COMPLETION` summary footer.
* **Top-Down Focus Banner**: Daily entries automatically surface your active Weekly Focus (`improvement-highlight`) and Monthly Priorities (`monthly-priorities`).
* **"On This Day" Memory Resurfacing**: Automatically resurfaces past entries from 1 Week Ago, 1 Month Ago, and prior years on the same date (`[onthisday[]]`).
* **Automatic Daily Wiki Activity & Mentions**: Daily entries list non-journal notes created, modified, tagged, or mentioning that date.
* **Interactive Dashboard Calendar & Serendipity**: Includes a **Journal** sidebar tab, a page controls toolbar button, and a **Journal Dashboard** (`$:/plugins/mblackman/journal/dashboard`) with tiles for Today, Week, Month, Year, an interactive monthly calendar (`<$journal-calendar />`), and a **🎲 Random Past Entry** button.
* **Built-In Day.js Engine**: Bundles Day.js (with `isoWeek` and `advancedFormat`) directly inside the plugin and exposes `[dayjs[...]]`, `[dayjs:shift[...]]`, and `<<dayjs>>` — no separate date plugin required.
* **Media Integration (Optional)**: Integrates with [Media Importer (`$:/plugins/mblackman/media-importer`)](https://github.com/mblackman/tiddlywiki-media-importer) for logging daily media consumption.

## Development & Build Commands

```bash
# Start live-reload development server on http://127.0.0.1:8080
npm run dev

# Run Jest test suite
npm test

# Build plugin artifacts (build/journal.tid, build/journal-plugin.json, dist/journal-plugin.json), demo wiki, and plugin library
npm run build-all
```
