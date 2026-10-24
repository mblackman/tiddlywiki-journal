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

  test("loads plugin manifest with no external plugin dependencies", () => {
    const pluginTiddler = $tw.wiki.getTiddler("$:/plugins/mblackman/journal");
    expect(pluginTiddler).toBeDefined();
    expect(pluginTiddler.fields.name).toBe("Journal");
    expect(pluginTiddler.fields["core-version"]).toBe(">=5.3.2");
    expect(pluginTiddler.fields["plugin-type"]).toBe("plugin");
    expect(pluginTiddler.fields.dependents || []).toEqual([]);
    expect(pluginTiddler.fields.list).toEqual(["readme", "config", "tree"]);
  });

  test("registers all expected shadow tiddlers including bundled Day.js, widgets, templates, and UI controls", () => {
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
    ];

    for (const title of expectedShadows) {
      expect($tw.wiki.isShadowTiddler(title)).toBe(true);
    }
  });

  test("bundles Day.js with isoWeek and advancedFormat inboth <<dayjs>> macro and [dayjs[...]] filter operator", () => {
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

    // 2. Filter operator usage (supports both "iso-week" shorthand and "{...}" bracket escaping)
    expect($tw.wiki.filterTiddlers("[[2026-10-23]dayjs[iso-week]]")).toEqual([
      "2026-W43",
    ]);
    expect(
      $tw.wiki.filterTiddlers("[[2026-10-23]dayjs[GGGG-{W}WW]]")
    ).toEqual(["2026-W43"]);
    expect($tw.wiki.filterTiddlers("[[2024-12-30]dayjs[iso-week]]")).toEqual([
      "2025-W01",
    ]);
    expect(
      $tw.wiki.filterTiddlers("[[now]dayjs[YYYY-MM-DD]]")[0]
    ).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect($tw.wiki.filterTiddlers("[[not-a-valid-date]dayjs[YYYY]]")).toEqual(
      []
    );
  });

  test("renders <$habit-dots /> accurately for number, checkbox, and text habits", () => {
    // 2026-10-21 has habit-exercise=45, habit-reading=25, habit-meditate=yes -> all 3 dots (Ex, Md, Rd)
    const html21 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-21'><$habit-dots /></$tiddler>"
    );
    expect(html21).toContain("habit-dot");
    expect(html21).toContain(">Ex<");
    expect(html21).toContain(">Rd<");
    expect(html21).toContain(">Md<");

    // 2026-10-22 has habit-exercise=30, habit-reading=40, habit-meditate=no -> Ex and Rd only, no Md
    const html22 = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-22'><$habit-dots /></$tiddler>"
    );
    expect(html22).toContain(">Ex<");
    expect(html22).toContain(">Rd<");
    expect(html22).not.toContain(">Md<");
  });

  test("renders <$journal-habits /> input controls for configured habits", () => {
    const html = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-23'><$journal-habits /></$tiddler>"
    );
    expect(html).toContain("Exercise (mins)");
    expect(html).toContain("Reading (pages)");
    expect(html).toContain("Meditate");
    expect(html).toContain("habit-input");
    expect(html).toContain('type="checkbox"');
  });

  test("renders <$habit-summary-table /> in weekly, monthly, and yearly modes (including uncreated months and decimal rounding)", () => {
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
    expect(weeklyHtml).toContain("✅");
    expect(weeklyHtml).toContain("❌");
    expect(weeklyHtml).toContain("TOTALS");
    expect(weeklyHtml).toContain(">135<");
    expect(weeklyHtml).toContain(">95<");
    expect(weeklyHtml).toContain(">2<");

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
    // and use decimal numbers (0.1 + 0.2) to verify both missing-month discovery and float rounding
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
    } finally {
      $tw.wiki.deleteTiddler("2026-03-10");
      $tw.wiki.deleteTiddler("2026-03-11");
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
    // 2026-10-22 has both a Prev (2026-10-21) and Next (2026-10-23) button active
    expect(dailyHtml).toContain("Previous Daily: 2026-10-21");
    expect(dailyHtml).toContain("Next Daily: 2026-10-23");

    // 2026-10-21 is the earliest daily entry -> Prev should be disabled
    const earliestDailyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-21'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(earliestDailyHtml).toContain("journal-btn-disabled");

    // Weekly template includes Daily Highlights, Wins, Gratitude, and Challenges roll-ups
    const weeklyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-W43'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(weeklyHtml).toContain("↑ 2026-10");
    expect(weeklyHtml).toContain("Shipped the new plugin build pipeline");
    expect(weeklyHtml).toContain("Gratitude:");
    expect(weeklyHtml).toContain("Crisp autumn weather");
    expect(weeklyHtml).toContain("Smooth local development workflow");

    // Monthly template includes both day cards grid and monthly habit summary table
    const monthlyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(monthlyHtml).toContain("↑ 2026");
    expect(monthlyHtml).toContain("journal-days-grid");
    expect(monthlyHtml).toContain("journal-summary-table");
    expect(monthlyHtml).toContain("Standardized the Journal plugin");

    // Yearly template renders month cards, yearly habit summary table, and monthly roll-up
    const yearlyHtml = $tw.wiki.renderText(
      "text/html",
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026'>{{||$:/plugins/mblackman/journal/config/view-template}}</$tiddler>"
    );
    expect(yearlyHtml).toContain("journal-months-grid");
    expect(yearlyHtml).toContain("Oct");
    expect(yearlyHtml).toContain("Unified all TiddlyWiki plugins");
  });

  test("renders Dashboard, Sidebar tab, and Page Controls toolbar button cleanly", () => {
    const dashboardHtml = $tw.wiki.renderTiddler(
      "text/html",
      "$:/plugins/mblackman/journal/dashboard"
    );
    expect(dashboardHtml).toContain("journal-dashboard");
    expect(dashboardHtml).toContain("Today");
    expect(dashboardHtml).toContain("Week");
    expect(dashboardHtml).toContain("Month");
    expect(dashboardHtml).toContain("Year");
    expect(dashboardHtml).toContain("Jump to Date");
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
  });

  test("refreshes <$habit-dots />, <$journal-habits />, and <$habit-summary-table /> widgets when tiddlers change", () => {
    const parser = $tw.wiki.parseText(
      "text/vnd.tiddlywiki",
      "<$tiddler tiddler='2026-10-22'><$habit-dots /><$journal-habits /></$tiddler><$let storyTiddler='2026-W43'><$habit-summary-table mode='weekly' /></$let>"
    );
    const widgetNode = $tw.wiki.makeWidget(parser, {
      document: $tw.fakeDocument,
    });
    const container = $tw.fakeDocument.createElement("div");
    widgetNode.render(container, null);

    expect(container.innerHTML).not.toContain(">Md<");
    expect(container.innerHTML).toContain(">135<");

    // Update 2026-10-22: set habit-meditate="yes" and habit-exercise="50" (total becomes 155)
    const existing = $tw.wiki.getTiddler("2026-10-22");
    $tw.wiki.addTiddler(
      new $tw.Tiddler(existing, {
        "habit-meditate": "yes",
        "habit-exercise": "50",
      })
    );

    try {
      widgetNode.refresh({ "2026-10-22": { modified: true } });
      expect(container.innerHTML).toContain(">Md<");
      expect(container.innerHTML).toContain(">155<");
    } finally {
      $tw.wiki.addTiddler(existing);
    }
  });
});
