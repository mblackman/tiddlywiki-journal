# tiddlywiki-journal

Structured daily, weekly, monthly, and yearly journaling and habit tracking for TiddlyWiki (`$:/plugins/mblackman/journal`). Log daily activities, habits, wins, challenges, and gratitude in a structured format that automatically rolls up into weekly, monthly, and annual review views.

Preview the plugin: **[Journal Demo](https://mblackman.github.io/tiddlywiki-journal/)**

## Features

* **Structured Entries**: Templates for Daily (`YYYY-MM-DD`), Weekly (`GGGG-[W]WW`), Monthly (`YYYY-MM`), and Yearly (`YYYY`) journal entries.
* **Configurable Habit Tracking**: Track numeric, checkbox, and text habits per day with visual habit indicator dots on calendar cards and automatic summary tables across weeks, months, and years.
* **Hierarchical Roll-Ups**: Daily highlights, wins, gratitude lists, and challenges automatically roll up into Weekly, Monthly, and Yearly reviews.
* **1-Click Access**: Includes a **Journal** sidebar tab, a page controls toolbar button, and a **Journal Dashboard** (`$:/plugins/mblackman/journal/dashboard`) with tiles for Today, Week, Month, Year, date jumping, and recent entries.
* **Built-In Day.js Engine**: Bundles Day.js (with `isoWeek` and `advancedFormat`) directly inside the plugin and exposes both the `[dayjs[...]]` filter operator and `<<dayjs>>` macro — no separate date plugin required.
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
