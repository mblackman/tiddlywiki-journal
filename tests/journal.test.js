const path = require("path");
const { TiddlyWiki } = require("tiddlywiki");
const { bundleDayjs } = require("../scripts/build-plugin");

const ROOT_DIR = path.resolve(__dirname, "..");

describe("Journal Plugin ($:/plugins/mblackman/journal)", () => {
  let $tw;

  beforeAll(() => {
    bundleDayjs();
    process.env.TIDDLYWIKI_PLUGIN_PATH = path.join(ROOT_DIR, "plugins");
    $tw = TiddlyWiki();
    $tw.boot.argv = [path.join(ROOT_DIR, "demo")];
    $tw.boot.boot();
    global.$tw = $tw;
    if ($tw.syncer) {
      if ($tw.syncer.pollTimerId) {
        clearInterval($tw.syncer.pollTimerId);
      }
      $tw.syncer.syncadaptor = { isReady: () => false };
    }
  });

  afterAll(() => {
    delete global.$tw;
  });

  test("loads plugin manifest with >=5.4.0 baseline and no external plugin dependencies", () => {
    const pluginTiddler = $tw.wiki.getTiddler("$:/plugins/mblackman/journal");
    expect(pluginTiddler).toBeDefined();
    expect(pluginTiddler.fields.name).toBe("Journal");
    expect(pluginTiddler.fields["core-version"]).toBe(">=5.4.0");
    expect(pluginTiddler.fields.version).toBe("0.3.0");
    expect(pluginTiddler.fields["plugin-type"]).toBe("plugin");
    expect(pluginTiddler.fields.dependents || []).toEqual([]);
    expect(pluginTiddler.fields.list).toEqual(["readme", "config", "tree"]);
  });

  test("registers all expected shadow tiddlers including bundled Day.js, widgets, native CSS stylesheets, templates, and UI controls", () => {
    const expectedShadows = [
      "$:/plugins/mblackman/journal/readme",
      "$:/plugins/mblackman/journal/config",
      "$:/plugins/mblackman/journal/tree",
      "$:/plugins/mblackman/journal/dashboard",
      "$:/plugins/mblackman/journal/config/view-template",
      "$:/plugins/mblackman/journal/macros",
      "$:/plugins/mblackman/journal/images/journal-icon",
      "$:/plugins/mblackman/journal/ui/sidebar-tab",
      "$:/plugins/mblackman/journal/ui/toolbar-button",
      "$:/plugins/mblackman/journal/ui/index",
      "$:/plugins/mblackman/journal/ui/habit",
      "$:/plugins/mblackman/journal/ui/templates/daily-journal",
      "$:/plugins/mblackman/journal/ui/templates/weekly-journal",
      "$:/plugins/mblackman/journal/ui/templates/monthly-journal",
      "$:/plugins/mblackman/journal/ui/templates/yearly-journal",
      "$:/plugins/mblackman/journal/lib/dayjs.js",
      "$:/plugins/mblackman/journal/macros/dayjs.js",
      "$:/plugins/mblackman/journal/filters/dayjs.js",
      "$:/plugins/mblackman/journal/habit-entry.js",
      "$:/plugins/mblackman/journal/widgets/habit-dots.js",
      "$:/plugins/mblackman/journal/widgets/habit-summary-table.js",
      "$:/plugins/mblackman/journal/widgets/journal-grid.js",
    ];

    for (const title of expectedShadows) {
      expect($tw.wiki.isShadowTiddler(title)).toBe(true);
    }

    const indexStylesheet = $tw.wiki.getTiddler(
      "$:/plugins/mblackman/journal/ui/index"
    );
    const habitStylesheet = $tw.wiki.getTiddler(
      "$:/plugins/mblackman/journal/ui/habit"
    );
    expect(indexStylesheet.fields.type).toBe("text/css");
    expect(habitStylesheet.fields.type).toBe("text/css");
    expect(indexStylesheet.fields.text).toContain("var(--tpc-");
    expect(habitStylesheet.fields.text).toContain("var(--tpc-");
    expect(indexStylesheet.fields.text).not.toContain("<<colour");
    expect(habitStylesheet.fields.text).not.toContain("<<colour");
  });

  test("bundles Day.js with isoWeek, advancedFormat, dayjs:shift, and journal-random in macro and filter operators", () => {
    // 1. Macro usage
    const macroOut = $tw.wiki
      .renderText(
        "text/plain",
        "text/vnd.tiddlywiki",
        '<<dayjs "2026-10-23" "GGGG-[W]WW">>'
      )
      .trim();
    expect(macroOut).toBe("2026-W43");

    // ISO week-year boundary check (2024-12-30 is Monday of 2025-W01)
    const boundaryOut = $tw.wiki
      .renderText(
        "text/plain",
        "text/vnd.tiddlywiki",
        '<<dayjs "2024-12-30" "GGGG-[W]WW">>'
      )
      .trim();
    expect(boundaryOut).toBe("2025-W01");

    // Advanced format tokens (Quarter Q, Ordinal Do)
    const advancedOut = $tw.wiki
      .renderText(
        "text/plain",
        "text/vnd.tiddlywiki",
        '<<dayjs "2026-10-23" "[Q]Q Do">>'
      )
      .trim();
    expect(advancedOut).toBe("Q4 23rd");

    // 2. Filter operator usage (supports both "iso-week" shorthand, "{...}" bracket escaping, and ISO week input)
    expect($tw.wiki.filterTiddlers("[[2026-10-23]dayjs[iso-week]]")).toEqual([
      "2026-W43",
    ]);
    expect(
      $tw.wiki.filterTiddlers("[[2026-10-23]dayjs[GGGG-{W}WW]]")
    ).toEqual(["2026-W43"]);
    expect($tw.wiki.filterTiddlers("[[2024-12-30]dayjs[iso-week]]")).toEqual([
      "2025-W01",
    ]);
    expect($tw.wiki.filterTiddlers("[[2026-W43]dayjs[YYYY-MM-DD]]")).toEqual([
      "2026-10-19",
    ]);
    expect(
      $tw.wiki.filterTiddlers("[[2026-10-23]dayjs:shift[-1,week,iso-week]]")
    ).toEqual(["2026-W42"]);
    expect(
      $tw.wiki.filterTiddlers("[[2026-10-23]dayjs:shift[-1,month,YYYY-MM]]")
    ).toEqual(["2026-09"]);
    expect(
      $tw.wiki.filterTiddlers("[[now]dayjs[YYYY-MM-DD]]")[0]
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect($tw.wiki.filterTiddlers("[[not-a-valid-date]dayjs[YYYY]]")).toEqual(
      []
    );

    const randomPick = $tw.wiki.filterTiddlers(
      "[tag[Journal]tag[Daily]journal-random[]]"
    );
    expect(randomPick.length).toBe(1);
    expect(["2026-10-21", "2026-10-22", "2026-10-23"]).toContain(randomPick[0]);
  });

  test("renders two-state <$habit-dots /> accurately for number (met vs partial target), checkbox, and text habits", () => {
    // 2026-10-21 has habit-exercise=45 (>=30 target -> solid), habit-reading=25 (<30 target -> partial), habit-meditate=yes -> all 3 dots
    const html21 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-21'><$habit-dots /></$tiddler>"
    );
    expect(html21).toContain("habit-dot");
    expect(html21).toContain("habit-dot-partial");
    expect(html21).toContain("25 / 30 pages");
    expect(html21).toContain(">Ex<");
    expect(html21).toContain(">Rd<");
    expect(html21).toContain(">Md<");

    // 2026-10-22 has habit-exercise=30 (>=30), habit-reading=40 (>=30), habit-meditate=no -> Ex and Rd solid only, no partial, no Md
    const html22 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-22'><$habit-dots /></$tiddler>"
    );
    expect(html22).toContain(">Ex<");
    expect(html22).toContain(">Rd<");
    expect(html22).not.toContain("habit-dot-partial");
    expect(html22).not.toContain(">Md<");
  });

  test("renders <$journal-habits /> input controls with goals, units, and live streak pills", () => {
    const html = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-23'><$journal-habits /></$tiddler>"
    );
    expect(html).toContain("Exercise (mins)");
    expect(html).toContain("Goal: 30 mins");
    expect(html).toContain("Reading (pages)");
    expect(html).toContain("Goal: 30 pages");
    expect(html).toContain("Meditate");
    expect(html).toContain("habit-streak-pill");
    expect(html).toContain("🔥 3d");
    expect(html).toContain("🔥 2d");
    expect(html).toContain("🔥 1d");
    expect(html).toContain("habit-input");
    expect(html).toContain('type="checkbox"');

    // On 2026-10-21, habit-reading is explicitly logged as 25 (< 30 target), so Reading has no streak pill,
    // while Exercise (45 >= 30) and Meditate (yes) each have 🔥 1d
    const html21 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-21'><$journal-habits /></$tiddler>"
    );
    expect(html21.match(/habit-streak-pill/g).length).toBe(2);

    // On an unlogged future day (2026-10-24), streaks carry over from 2026-10-23 (3d, 2d, 1d)
    const html24 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-24'><$journal-habits /></$tiddler>"
    );
    expect(html24).toContain("🔥 3d");
    expect(html24).toContain("🔥 2d");
    expect(html24).toContain("🔥 1d");
  });

  test("renders <$habit-summary-table /> in weekly, monthly, and yearly modes with interactive checkboxes, streaks, avg roll-up, and 2-row footer", () => {
    // Weekly mode on 2026-W43 (45+30+60 = 135 exercise, 25+40+30 = 95 reading, 2 meditate)
    const weeklyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$let storyTiddler='2026-W43'><$habit-summary-table mode='weekly' /></$let>"
    );
    expect(weeklyHtml).toContain("journal-summary-table");
    expect(weeklyHtml).toContain("Wed");
    expect(weeklyHtml).toContain("Thu");
    expect(weeklyHtml).toContain("Fri");
    expect(weeklyHtml).toContain('type="checkbox"');
    expect(weeklyHtml).toContain("✅");
    expect(weeklyHtml).toContain("❌");
    expect(weeklyHtml).toContain("🔥 3d");
    expect(weeklyHtml).toContain("TOTALS / AVG");
    expect(weeklyHtml).toContain("GOAL / COMPLETION");
    expect(weeklyHtml).toContain(">135<");
    expect(weeklyHtml).toContain(">95<");
    expect(weeklyHtml).toContain(">2<");
    expect(weeklyHtml).toContain("3/3 (100%)");
    expect(weeklyHtml).toContain("2/3 (67%)");

    // Monthly mode on 2026-10 shows "ddd DD" labels and totals
    const monthlyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$let storyTiddler='2026-10'><$habit-summary-table mode='monthly' /></$let>"
    );
    expect(monthlyHtml).toContain("Wed 21");
    expect(monthlyHtml).toContain("Thu 22");
    expect(monthlyHtml).toContain("Fri 23");
    expect(monthlyHtml).toContain(">135<");

    // Yearly mode: add a daily entry in 2026-03 WITHOUT creating the 2026-03 Monthly tiddler
    // and use decimal numbers (0.1 + 0.2) to verify both missing-month discovery and float rounding,
    // plus test habit-agg="avg"
    $tw.wiki.addTiddler({
      title: "2026-03-10",
      tags: "Journal Daily 2026-W11 2026-03 2026",
      year: "2026",
      month: "2026-03",
      week: "2026-W11",
      "habit-exercise": "0.1",
    });
    $tw.wiki.addTiddler({
      title: "2026-03-11",
      tags: "Journal Daily 2026-W11 2026-03 2026",
      year: "2026",
      month: "2026-03",
      week: "2026-W11",
      "habit-exercise": "0.2",
    });
    $tw.wiki.addTiddler({
      title: "$:/config/Journal/Habit/habit-sleep",
      tags: "$:/tags/Journal/Habit",
      caption: "Sleep",
      "habit-shorthand": "Sl",
      "journal-field": "habit-sleep",
      "habit-type": "number",
      "habit-unit": "hrs",
      "habit-target": "8",
      "habit-agg": "avg",
    });
    $tw.wiki.addTiddler({
      title: "2026-03-10",
      tags: "Journal Daily 2026-W11 2026-03 2026",
      year: "2026",
      month: "2026-03",
      week: "2026-W11",
      "habit-exercise": "0.1",
      "habit-sleep": "7",
    });
    $tw.wiki.addTiddler({
      title: "2026-03-11",
      tags: "Journal Daily 2026-W11 2026-03 2026",
      year: "2026",
      month: "2026-03",
      week: "2026-W11",
      "habit-exercise": "0.2",
      "habit-sleep": "9",
    });

    try {
      const yearlyHtml = $tw.wiki.renderText(
        "text/html",
        "text/vnd.tiddlywiki",
        "<$let storyTiddler='2026'><$habit-summary-table mode='yearly' /></$let>"
      );
      expect(yearlyHtml).toContain("Mar");
      expect(yearlyHtml).toContain("Oct");
      expect(yearlyHtml).toContain(">0.3<");
      expect(yearlyHtml).not.toContain("0.30000000000000004");
      expect(yearlyHtml).toContain(">135.3<");
      // Average of 7 and 9 is 8
      expect(yearlyHtml).toContain(">8<");
      expect(yearlyHtml).toContain("(avg)");
    } finally {
      $tw.wiki.deleteTiddler("2026-03-10");
      $tw.wiki.deleteTiddler("2026-03-11");
      $tw.wiki.deleteTiddler("$:/config/Journal/Habit/habit-sleep");
    }
  });

  test("renders complete period grids (<$journal-period-grid />) with Ghost Cards for uncreated slots", () => {
    // 1. Weekly grid on 2026-W43 has 7 slots (Mon 19 .. Sun 25): 3 existing links (21, 22, 23) and 4 ghost buttons (19, 20, 24, 25)
    const weeklyGridHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$journal-period-grid mode='weekly' period='2026-W43' />"
    );
    expect(weeklyGridHtml).toContain("journal-days-grid");
    expect(weeklyGridHtml).toContain("journal-day-card-ghost");
    expect(weeklyGridHtml).toContain("Create and open 2026-10-19");
    expect(weeklyGridHtml).toContain("Create and open 2026-10-20");
    expect(weeklyGridHtml).toContain("Open 2026-10-21");
    expect(weeklyGridHtml).toContain("Open 2026-10-22");
    expect(weeklyGridHtml).toContain("Open 2026-10-23");
    expect(weeklyGridHtml).toContain("Create and open 2026-10-24");
    expect(weeklyGridHtml).toContain("Create and open 2026-10-25");

    // 2. Monthly-weeks grid on 2026-10 includes all overlapping ISO weeks (W40..W44)
    const monthlyWeeksHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$journal-period-grid mode='monthly-weeks' period='2026-10' />"
    );
    expect(monthlyWeeksHtml).toContain("Create and open 2026-W40");
    expect(monthlyWeeksHtml).toContain("Open 2026-W43");
    expect(monthlyWeeksHtml).toContain("Create and open 2026-W44");

    // 3. Monthly-days grid on 2026-10 includes weekday headers (Mon..Sun), leading empty cells, and all 31 days
    const monthlyDaysHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$journal-period-grid mode='monthly-days' period='2026-10' />"
    );
    expect(monthlyDaysHtml).toContain("journal-calendar-weekdays");
    expect(monthlyDaysHtml).toContain("journal-calendar-empty");
    expect(monthlyDaysHtml).toContain("Create and open 2026-10-01");
    expect(monthlyDaysHtml).toContain("Create and open 2026-10-31");

    // 4. Yearly grid on 2026 includes all 12 months (Jan..Dec)
    const yearlyGridHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$journal-period-grid mode='yearly' period='2026' />"
    );
    expect(yearlyGridHtml).toContain("Create and open 2026-01");
    expect(yearlyGridHtml).toContain("Open 2026-10");
    expect(yearlyGridHtml).toContain("Create and open 2026-12");
  });

  test("renders Top-Down Focus Banner, 'On This Day' lookback, and Automatic Wiki Activity on Daily template", () => {
    // Add lookback entries (1 week ago: 2026-10-16, 1 month ago: 2026-09-23, 1 year ago: 2025-10-23)
    // and non-journal wiki notes (one mentioning 2026-10-23, one created on 20261023)
    $tw.wiki.addTiddler({
      title: "2026-10-16",
      tags: "Journal Daily 2026-W42 2026-10 2026",
      highlight: "Finished quarterly planning",
    });
    $tw.wiki.addTiddler({
      title: "2026-09-23",
      tags: "Journal Daily 2026-W39 2026-09 2026",
      highlight: "Autumn equinox hike",
    });
    $tw.wiki.addTiddler({
      title: "2025-10-23",
      tags: "Journal Daily 2025-W43 2025-10 2025",
      highlight: "Started TiddlyWiki plugin architecture notes",
    });
    $tw.wiki.addTiddler({
      title: "Project Architecture Note",
      text: "Discussed during [[2026-10-23]] review.",
      created: "20261023093000000",
      modified: "20261023141500000",
    });

    try {
      const dailyHtml = $tw.wiki.renderText(
        "text/html",
        "text/vnd.tiddlywiki",
        "<$tiddler tiddler='2026-10-23'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
      );

      // 1. Top-Down Focus Banner (from 2026-W43 improvement-highlight and 2026-10 monthly-priorities rendered as block <ul><li>)
      expect(dailyHtml).toContain("journal-focus-banner");
      expect(dailyHtml).toContain(
        "Block out 90 minutes of uninterrupted morning focus daily"
      );
      expect(dailyHtml).toContain("<li>Daily journaling streak</li>");

      // 2. On This Day lookback
      expect(dailyHtml).toContain("On This Day");
      expect(dailyHtml).toContain("1 Week Ago");
      expect(dailyHtml).toContain("Finished quarterly planning");
      expect(dailyHtml).toContain("1 Month Ago");
      expect(dailyHtml).toContain("Autumn equinox hike");
      expect(dailyHtml).toContain("1 Year Ago");
      expect(dailyHtml).toContain(
        "Started TiddlyWiki plugin architecture notes"
      );

      // 3. Wiki Activity & Mentions
      expect(dailyHtml).toContain("Wiki Activity &amp; Mentions");
      expect(dailyHtml).toContain("Project Architecture Note");
      expect(dailyHtml).toContain("Mentioned");
      expect(dailyHtml).toContain("Created");

      // 4. Verify no broken inline <<colour ...>> attributes remain
      expect(dailyHtml).not.toContain("<<colour");
    } finally {
      $tw.wiki.deleteTiddler("2026-10-16");
      $tw.wiki.deleteTiddler("2026-09-23");
      $tw.wiki.deleteTiddler("2025-10-23");
      $tw.wiki.deleteTiddler("Project Architecture Note");
    }
  });

  test("renders Daily, Weekly (with Gratitude roll-up), Monthly, and Yearly templates via ViewTemplate", () => {
    // Daily template
    const dailyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-22'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(dailyHtml).toContain("↑ 2026-W43");
    expect(dailyHtml).toContain("Previous Daily: 2026-10-21");
    expect(dailyHtml).toContain("Next Daily: 2026-10-23");

    // 2026-10-21 is the earliest daily entry -> Prev should be disabled
    const earliestDailyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-21'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(earliestDailyHtml).toContain("journal-btn-disabled");

    // Weekly template includes 7-day period grid, Daily Highlights, Wins, Gratitude, and Challenges roll-ups
    const weeklyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-W43'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(weeklyHtml).toContain("↑ 2026-10");
    expect(weeklyHtml).toContain("Create and open 2026-10-19");
    expect(weeklyHtml).toContain("Shipped the new plugin build pipeline");
    expect(weeklyHtml).toContain("Gratitude:");
    expect(weeklyHtml).toContain("Crisp autumn weather");
    expect(weeklyHtml).toContain("Smooth local development workflow");
    expect(weeklyHtml).not.toContain("<<colour");

    // Monthly template includes both week cards grid, 7-column day cards grid, and monthly habit summary table
    const monthlyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(monthlyHtml).toContain("↑ 2026");
    expect(monthlyHtml).toContain("journal-days-grid");
    expect(monthlyHtml).toContain("journal-summary-table");
    expect(monthlyHtml).toContain("Standardized the Journal plugin");
    expect(monthlyHtml).not.toContain("<<colour");

    // Yearly template renders all 12 month cards, yearly habit summary table, and monthly roll-up
    const yearlyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(yearlyHtml).toContain("journal-months-grid");
    expect(yearlyHtml).toContain("Oct");
    expect(yearlyHtml).toContain("Unified all TiddlyWiki plugins");
    expect(yearlyHtml).not.toContain("<<colour");
  });

  test("renders Dashboard with interactive <$journal-calendar /> and Random Past Entry button", () => {
    $tw.wiki.addTiddler({
      title: "$:/temp/journal/calendar-month",
      text: "2026-10",
    });

    try {
      const dashboardHtml = $tw.wiki.renderTiddler(
        "text/html",
        "$:/plugins/mblackman/journal/dashboard"
      );
      expect(dashboardHtml).toContain("journal-dashboard");
      expect(dashboardHtml).toContain("Today");
      expect(dashboardHtml).toContain("Week");
      expect(dashboardHtml).toContain("Month");
      expect(dashboardHtml).toContain("Year");
      expect(dashboardHtml).toContain("journal-calendar");
      expect(dashboardHtml).toContain("October 2026");
      expect(dashboardHtml).toContain("Random Past Entry");
      expect(dashboardHtml).toContain("Recent Entries");
      expect(dashboardHtml).toContain("2026-10-23");

      const sidebarHtml = $tw.wiki.renderTiddler(
        "text/html",
        "$:/plugins/mblackman/journal/ui/sidebar-tab"
      );
      expect(sidebarHtml).toContain("journal-dashboard");

      const toolbarHtml = $tw.wiki.renderTiddler(
        "text/html",
        "$:/plugins/mblackman/journal/ui/toolbar-button"
      );
      expect(toolbarHtml).toContain("Open the Journal Dashboard");
    } finally {
      $tw.wiki.deleteTiddler("$:/temp/journal/calendar-month");
    }
  });

  test("refreshes <$habit-dots />, <$journal-habits />, <$habit-summary-table />, and <$journal-calendar /> when tiddlers change", () => {
    const parser = $tw.wiki.parseText(
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-22'><$habit-dots /><$journal-habits /></$tiddler><$let storyTiddler='2026-W43'><$habit-summary-table mode='weekly' /></$let><$journal-calendar />"
    );
    const widgetNode = $tw.wiki.makeWidget(parser, {
      document: $tw.fakeDocument,
    });
    const container = $tw.fakeDocument.createElement("div");
    widgetNode.render(container, null);

    expect(container.innerHTML).toContain(">135<");

    // Update 2026-10-22: set habit-meditate="yes" and habit-exercise="50" (total becomes 155)
    const existing = $tw.wiki.getTiddler("2026-10-22");
    $tw.wiki.addTiddler(
      new $tw.Tiddler(existing, {
        "habit-meditate": "yes",
        "habit-exercise": "50",
      })
    );
    $tw.wiki.addTiddler({
      title: "$:/temp/journal/calendar-month",
      text: "2026-09",
    });

    try {
      widgetNode.refresh({
        "2026-10-22": { modified: true },
        "$:/temp/journal/calendar-month": { modified: true },
      });
      expect(container.innerHTML).toContain(">Md<");
      expect(container.innerHTML).toContain(">155<");
      expect(container.innerHTML).toContain("September 2026");
    } finally {
      $tw.wiki.addTiddler(existing);
      $tw.wiki.deleteTiddler("$:/temp/journal/calendar-month");
    }
  });
});
