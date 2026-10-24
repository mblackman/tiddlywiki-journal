/*\
title: $:/plugins/mblackman/journal/filters/dayjs.js
type: application/javascript
module-type: filteroperator

Filter operators:
- [dayjs[format]] for formatting dates, ISO weeks ("YYYY-Www"), and months ("YYYY-MM") without <$wikify>.
  Supports "iso-week" shorthand ("GGGG-[W]WW") and "{...}" escaping for literal brackets inside filter operands.
- [dayjs:shift[-1,week]] / [dayjs:shift[-1,month,YYYY-MM]] for calendar and ISO-week date arithmetic.
- [onthisday[]] and [onthisday:label<referenceDate>] for resurfacing past daily entries (1 week ago, 1 month ago, and prior years).
\*/

(function () {
  "use strict";

  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  function normalizeFormat(rawFormat) {
    if (!rawFormat) return "YYYY-MM-DD";
    if (rawFormat === "iso-week") return "GGGG-[W]WW";
    return rawFormat.replace(/\{([^}]*)\}/g, "[$1]");
  }

  function parseJournalDate(raw) {
    if (!raw || raw === "now" || raw === "today") {
      return dayjs();
    }
    var weekMatch = /^(\d{4})-W(\d{2})$/.exec(raw);
    if (weekMatch) {
      var isoYear = parseInt(weekMatch[1], 10);
      var isoWeekNum = parseInt(weekMatch[2], 10);
      return dayjs(isoYear + "-01-04")
        .isoWeek(isoWeekNum)
        .startOf("isoWeek");
    }
    if (/^\d{4}-\d{2}$/.test(raw)) {
      return dayjs(raw + "-01");
    }
    return dayjs(raw);
  }

  exports.dayjs = function (source, operator) {
    var results = [];
    var suffix = operator.suffix || "";
    var operands = operator.operands || [operator.operand];

    if (suffix === "shift") {
      var parts =
        operands.length > 1
          ? operands
          : (operands[0] || "").split(",");
      var amount = parseInt(parts[0], 10) || 0;
      var unit = (parts[1] || "day").trim();
      var shiftFormat = normalizeFormat((parts[2] || "YYYY-MM-DD").trim());

      source(function (tiddler, title) {
        var raw = typeof title === "string" ? title.trim() : "";
        var dateObj = parseJournalDate(raw);
        if (dateObj.isValid()) {
          var normalizedUnit = unit === "iso-week" ? "week" : unit;
          var shifted = dateObj.add(amount, normalizedUnit);
          results.push(shifted.format(shiftFormat));
        }
      });
      return results;
    }

    var formatString = normalizeFormat(operator.operand);

    source(function (tiddler, title) {
      var raw = typeof title === "string" ? title.trim() : "";
      var dateObj = parseJournalDate(raw);
      if (dateObj.isValid()) {
        results.push(dateObj.format(formatString));
      }
    });

    return results;
  };

  exports.onthisday = function (source, operator, options) {
    var results = [];
    var wiki = options && options.wiki;
    var suffix = operator.suffix || "";

    if (suffix === "label") {
      var refRaw = (operator.operand || "").trim();
      var refDate = parseJournalDate(refRaw);
      if (!refDate.isValid()) return results;

      var oneWeekAgo = refDate.subtract(1, "week").format("YYYY-MM-DD");
      var oneMonthAgo = refDate.subtract(1, "month").format("YYYY-MM-DD");
      var refMonthDay = refDate.format("MM-DD");
      var refYear = refDate.year();

      source(function (tiddler, title) {
        var raw = typeof title === "string" ? title.trim() : "";
        if (raw === oneWeekAgo) {
          results.push("1 Week Ago");
        } else if (raw === oneMonthAgo) {
          results.push("1 Month Ago");
        } else if (
          /^\d{4}-\d{2}-\d{2}$/.test(raw) &&
          raw.slice(5) === refMonthDay
        ) {
          var entryYear = parseInt(raw.slice(0, 4), 10);
          var diff = refYear - entryYear;
          if (diff === 1) {
            results.push("1 Year Ago");
          } else if (diff > 1) {
            results.push(diff + " Years Ago");
          }
        }
      });
      return results;
    }

    if (!wiki) return results;

    var allDaily = wiki.filterTiddlers("[tag[Journal]tag[Daily]sort[title]]");
    var dailySet = Object.create(null);
    for (var i = 0; i < allDaily.length; i++) {
      dailySet[allDaily[i]] = true;
    }

    source(function (tiddler, title) {
      var raw = typeof title === "string" ? title.trim() : "";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return;
      var dateObj = dayjs(raw);
      if (!dateObj.isValid()) return;

      var seen = Object.create(null);
      var weekAgoTitle = dateObj.subtract(1, "week").format("YYYY-MM-DD");
      var monthAgoTitle = dateObj.subtract(1, "month").format("YYYY-MM-DD");

      if (dailySet[weekAgoTitle] && !seen[weekAgoTitle]) {
        seen[weekAgoTitle] = true;
        results.push(weekAgoTitle);
      }
      if (dailySet[monthAgoTitle] && !seen[monthAgoTitle]) {
        seen[monthAgoTitle] = true;
        results.push(monthAgoTitle);
      }

      var targetMonthDay = dateObj.format("MM-DD");
      var targetYear = dateObj.year();
      var priorYearMatches = [];
      for (var j = 0; j < allDaily.length; j++) {
        var candidate = allDaily[j];
        if (
          /^\d{4}-\d{2}-\d{2}$/.test(candidate) &&
          candidate.slice(5) === targetMonthDay
        ) {
          var candYear = parseInt(candidate.slice(0, 4), 10);
          if (candYear < targetYear && !seen[candidate]) {
            seen[candidate] = true;
            priorYearMatches.push(candidate);
          }
        }
      }
      priorYearMatches.sort().reverse();
      for (var k = 0; k < priorYearMatches.length; k++) {
        results.push(priorYearMatches[k]);
      }
    });

    return results;
  };

  exports["journal-random"] = function (source) {
    var items = [];
    source(function (tiddler, title) {
      if (title) items.push(title);
    });
    if (items.length === 0) return [];
    var idx = Math.floor(Math.random() * items.length);
    return [items[idx]];
  };
})();
