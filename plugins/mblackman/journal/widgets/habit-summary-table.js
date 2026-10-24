/*\
title: $:/plugins/mblackman/journal/widgets/habit-summary-table.js
type: application/javascript
module-type: widget

Renders a summary table of habits across weekly, monthly, or yearly journal periods
\*/

(function () {
  "use strict";

  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  function formatNumericTotal(sum) {
    return Number(sum.toFixed(2)).toString();
  }

  function HabitSummaryTableWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.habitTitles = [];
    this.rowTitles = [];
  }

  HabitSummaryTableWidget.prototype = new Widget();

  HabitSummaryTableWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  HabitSummaryTableWidget.prototype.collectYearlyMonths = function (matchTitle) {
    if (!matchTitle) return [];
    var escaped = matchTitle.replace(/[\[\]]/g, "");
    var monthSet = Object.create(null);

    var explicitMonths = this.wiki.filterTiddlers(
      "[tag[Monthly]tag[Journal]tag[" +
        escaped +
        "]] [tag[Monthly]tag[Journal]year[" +
        escaped +
        "]] +[unique[]]",
      this
    );
    for (var i = 0; i < explicitMonths.length; i++) {
      monthSet[explicitMonths[i]] = true;
    }

    var daysInYear = this.wiki.filterTiddlers(
      "[tag[Daily]tag[Journal]tag[" +
        escaped +
        "]] [tag[Daily]tag[Journal]year[" +
        escaped +
        "]] +[unique[]]",
      this
    );
    for (var j = 0; j < daysInYear.length; j++) {
      var dayTiddler = this.wiki.getTiddler(daysInYear[j]);
      if (!dayTiddler) continue;
      var m = dayTiddler.fields.month;
      if (!m && /^\d{4}-\d{2}-\d{2}$/.test(daysInYear[j])) {
        m = daysInYear[j].slice(0, 7);
      }
      if (m) {
        monthSet[m] = true;
      }
    }

    return Object.keys(monthSet).sort();
  };

  HabitSummaryTableWidget.prototype.getDaysForMonth = function (monthTitle) {
    var escaped = monthTitle.replace(/[\[\]]/g, "");
    return this.wiki.filterTiddlers(
      "[tag[Daily]tag[Journal]tag[" +
        escaped +
        "]] [tag[Daily]tag[Journal]month[" +
        escaped +
        "]] +[unique[]sort[title]]",
      this
    );
  };

  HabitSummaryTableWidget.prototype.execute = function () {
    var mode = this.getAttribute("mode", "weekly");
    var storyTiddler = this.getVariable("storyTiddler");
    var currentTiddler = this.getVariable("currentTiddler");
    var matchTitle =
      storyTiddler && storyTiddler !== "" ? storyTiddler : currentTiddler;
    this.matchTitle = matchTitle || "";
    var escapedMatch = this.matchTitle.replace(/[\[\]]/g, "");

    this.habitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );

    if (mode === "yearly") {
      this.rowTitles = this.collectYearlyMonths(this.matchTitle);
    } else {
      this.rowTitles = this.matchTitle
        ? this.wiki.filterTiddlers(
            "[tag[Daily]tag[Journal]tag[" + escapedMatch + "]sort[title]]",
            this
          )
        : [];
    }

    var firstColText = mode === "yearly" ? "Month" : "Day";
    var headerCells = [
      {
        type: "element",
        tag: "th",
        attributes: {
          class: { type: "string", value: "journal-summary-th-left" },
        },
        children: [{ type: "text", text: firstColText }],
      },
    ];

    for (var hIdx = 0; hIdx < this.habitTitles.length; hIdx++) {
      var habitTitle = this.habitTitles[hIdx];
      var habitTiddler = this.wiki.getTiddler(habitTitle);
      var caption = (habitTiddler && habitTiddler.fields.caption) || habitTitle;
      headerCells.push({
        type: "element",
        tag: "th",
        attributes: {
          class: { type: "string", value: "journal-summary-th-center" },
        },
        children: [{ type: "text", text: caption }],
      });
    }

    var rows = [];

    for (var rIdx = 0; rIdx < this.rowTitles.length; rIdx++) {
      var rowTitle = this.rowTitles[rIdx];
      var rowTiddler = this.wiki.getTiddler(rowTitle);
      if (mode !== "yearly" && !rowTiddler) continue;

      var rowCells = [];
      var labelText = "";

      if (mode === "yearly") {
        var parsedMonth = dayjs(rowTitle + "-01");
        labelText = parsedMonth.isValid()
          ? parsedMonth.format("MMM")
          : rowTitle.split("-").pop() || rowTitle;
      } else {
        var parsedDay = dayjs(rowTitle);
        if (parsedDay.isValid()) {
          labelText =
            mode === "monthly"
              ? parsedDay.format("ddd DD")
              : parsedDay.format("ddd");
        } else {
          labelText = rowTitle;
        }
      }

      rowCells.push({
        type: "element",
        tag: "td",
        attributes: {
          class: { type: "string", value: "journal-summary-td-label" },
        },
        children: [
          {
            type: "link",
            attributes: { to: { type: "string", value: rowTitle } },
            children: [{ type: "text", text: labelText }],
          },
        ],
      });

      for (var cIdx = 0; cIdx < this.habitTitles.length; cIdx++) {
        var hTitle = this.habitTitles[cIdx];
        var hTiddler = this.wiki.getTiddler(hTitle);
        var field = hTiddler && hTiddler.fields["journal-field"];
        var type = (hTiddler && hTiddler.fields["habit-type"]) || "number";
        var content = [];

        if (mode === "yearly") {
          var daysInMonth = this.getDaysForMonth(rowTitle);
          var sum = 0;
          var count = 0;

          for (var dIdx = 0; dIdx < daysInMonth.length; dIdx++) {
            var dTiddler = this.wiki.getTiddler(daysInMonth[dIdx]);
            var val = dTiddler && field ? dTiddler.fields[field] : undefined;
            if (type === "number") {
              var n = parseFloat(val);
              if (!isNaN(n)) sum += n;
            } else if (type === "checkbox") {
              if (val === "yes") count++;
            }
          }

          var cellText = "";
          if (type === "number") cellText = formatNumericTotal(sum);
          if (type === "checkbox") cellText = count.toString();
          content.push({ type: "text", text: cellText });
        } else {
          var value =
            rowTiddler && field ? rowTiddler.fields[field] : undefined;
          if (type === "checkbox") {
            if (value === "yes") content.push({ type: "text", text: "✅" });
            else if (value === "no") content.push({ type: "text", text: "❌" });
          } else {
            content.push({
              type: "text",
              text: value !== undefined && value !== null ? String(value) : "",
            });
          }
        }

        rowCells.push({
          type: "element",
          tag: "td",
          attributes: {
            class: { type: "string", value: "journal-summary-td-value" },
          },
          children: content,
        });
      }

      rows.push({
        type: "element",
        tag: "tr",
        attributes: {
          class: { type: "string", value: "journal-summary-tr" },
        },
        children: rowCells,
      });
    }

    var totalCells = [
      {
        type: "element",
        tag: "td",
        attributes: {
          class: { type: "string", value: "journal-summary-totals-td-label" },
        },
        children: [{ type: "text", text: "TOTALS" }],
      },
    ];

    var allDaysInPeriod =
      mode === "yearly"
        ? this.matchTitle
          ? this.wiki.filterTiddlers(
              "[tag[Daily]tag[Journal]tag[" +
                escapedMatch +
                "]] [tag[Daily]tag[Journal]year[" +
                escapedMatch +
                "]] +[unique[]]",
              this
            )
          : []
        : this.rowTitles;

    for (var tIdx = 0; tIdx < this.habitTitles.length; tIdx++) {
      var totalHabitTiddler = this.wiki.getTiddler(this.habitTitles[tIdx]);
      var totalField =
        totalHabitTiddler && totalHabitTiddler.fields["journal-field"];
      var totalType =
        (totalHabitTiddler && totalHabitTiddler.fields["habit-type"]) ||
        "number";

      var totalSum = 0;
      var totalCount = 0;

      for (var pIdx = 0; pIdx < allDaysInPeriod.length; pIdx++) {
        var dayTiddler = this.wiki.getTiddler(allDaysInPeriod[pIdx]);
        var dayVal =
          dayTiddler && totalField ? dayTiddler.fields[totalField] : undefined;
        if (totalType === "number") {
          var parsedNum = parseFloat(dayVal);
          if (!isNaN(parsedNum)) totalSum += parsedNum;
        } else if (totalType === "checkbox") {
          if (dayVal === "yes") totalCount++;
        }
      }

      var totalText = "";
      if (totalType === "number") totalText = formatNumericTotal(totalSum);
      if (totalType === "checkbox") totalText = totalCount.toString();

      totalCells.push({
        type: "element",
        tag: "td",
        attributes: {
          class: { type: "string", value: "journal-summary-totals-td-value" },
        },
        children: [{ type: "text", text: totalText }],
      });
    }

    rows.push({
      type: "element",
      tag: "tr",
      attributes: {
        class: { type: "string", value: "journal-summary-totals-tr" },
      },
      children: totalCells,
    });

    var tableNode = {
      type: "element",
      tag: "table",
      attributes: {
        class: { type: "string", value: "journal-summary-table" },
      },
      children: [
        {
          type: "element",
          tag: "thead",
          children: [
            {
              type: "element",
              tag: "tr",
              attributes: {
                class: { type: "string", value: "journal-summary-thead-tr" },
              },
              children: headerCells,
            },
          ],
        },
        {
          type: "element",
          tag: "tbody",
          children: rows,
        },
      ],
    };

    this.makeChildWidgets([tableNode]);
  };

  HabitSummaryTableWidget.prototype.refresh = function (changedTiddlers) {
    for (var i = 0; i < this.habitTitles.length; i++) {
      if (changedTiddlers[this.habitTitles[i]]) {
        this.refreshSelf();
        return true;
      }
    }

    for (var j = 0; j < this.rowTitles.length; j++) {
      if (changedTiddlers[this.rowTitles[j]]) {
        this.refreshSelf();
        return true;
      }
    }

    var matchTitle = this.matchTitle;
    if (matchTitle) {
      if (changedTiddlers[matchTitle]) {
        this.refreshSelf();
        return true;
      }
      var escapedMatch = matchTitle.replace(/[\[\]]/g, "");
      var allDaysInPeriod = this.wiki.filterTiddlers(
        "[tag[Daily]tag[Journal]tag[" +
          escapedMatch +
          "]] [tag[Daily]tag[Journal]year[" +
          escapedMatch +
          "]] +[unique[]]",
        this
      );
      for (var k = 0; k < allDaysInPeriod.length; k++) {
        if (changedTiddlers[allDaysInPeriod[k]]) {
          this.refreshSelf();
          return true;
        }
      }
    }

    var mode = this.getAttribute("mode", "weekly");
    var newHabits = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );
    var newRows =
      mode === "yearly"
        ? this.collectYearlyMonths(matchTitle)
        : matchTitle
          ? this.wiki.filterTiddlers(
              "[tag[Daily]tag[Journal]tag[" +
                matchTitle.replace(/[\[\]]/g, "") +
                "]sort[title]]",
              this
            )
          : [];

    if (
      newHabits.length !== this.habitTitles.length ||
      newRows.length !== this.rowTitles.length
    ) {
      this.refreshSelf();
      return true;
    }

    return this.refreshChildren(changedTiddlers);
  };

  exports["habit-summary-table"] = HabitSummaryTableWidget;
})();
