/*\
title: $:/plugins/mblackman/journal/widgets/journal-grid.js
type: application/javascript
module-type: widget

Provides:
- <$journal-period-grid mode="weekly|monthly-weeks|monthly-days|yearly" />
  Renders complete period grids with solid cards for existing entries, dashed "Ghost Cards" (click-to-create)
  for missing entries, dimmed future slots, and today highlighting.
- <$journal-calendar state="$:/temp/journal/calendar-month" />
  Renders an interactive monthly calendar navigator with Prev/Today/Next controls and habit dots.
\*/

(function () {
  "use strict";

  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  var WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  function buildDailyCardNode(wiki, dayObj, todayStr, compact, activeDateStr) {
    var dateStr = dayObj.format("YYYY-MM-DD");
    var dayName = dayObj.format("ddd");
    var dayNum = dayObj.format("DD");
    var exists = wiki.tiddlerExists(dateStr);
    var isToday = dateStr === todayStr;
    var isFuture = dateStr > todayStr;
    var isActive = Boolean(activeDateStr && dateStr === activeDateStr);

    var classes = ["journal-day-card"];
    if (!exists) classes.push("journal-day-card-ghost");
    if (isFuture) classes.push("journal-day-card-future");
    if (isToday) classes.push("journal-day-card-today");
    if (isActive) classes.push("journal-day-card-active");
    var classStr = classes.join(" ");

    var cardInner = [];
    if (!compact) {
      cardInner.push({
        type: "element",
        tag: "span",
        attributes: {
          class: { type: "string", value: "journal-day-card-name" },
        },
        children: [{ type: "text", text: dayName }],
      });
    }
    cardInner.push({
      type: "element",
      tag: "span",
      attributes: {
        class: { type: "string", value: "journal-day-card-date" },
      },
      children: [{ type: "text", text: dayNum }],
    });

    if (exists) {
      cardInner.push({
        type: "element",
        tag: "div",
        attributes: {
          class: { type: "string", value: "journal-day-card-habits" },
        },
        children: [
          {
            type: "tiddler",
            attributes: {
              tiddler: { type: "string", value: dateStr },
            },
            children: [{ type: "habit-dots", attributes: {} }],
          },
        ],
      });

      return {
        type: "link",
        attributes: {
          to: { type: "string", value: dateStr },
          class: { type: "string", value: classStr },
          tooltip: { type: "string", value: "Open " + dateStr },
        },
        children: cardInner,
      };
    }

    var weekTag = dayObj.format("GGGG-[W]WW");
    var monthTag = dayObj.format("YYYY-MM");
    var yearTag = dayObj.format("YYYY");
    var journalDate = dayObj.format("YYYYMMDD120000000");
    var dailyTags =
      "Journal Daily " + weekTag + " " + monthTag + " " + yearTag;

    var actionNodes = [
      {
        type: "action-setfield",
        attributes: {
          $tiddler: { type: "string", value: dateStr },
          tags: { type: "string", value: dailyTags },
          "journal-date": { type: "string", value: journalDate },
          year: { type: "string", value: yearTag },
          month: { type: "string", value: monthTag },
          week: { type: "string", value: weekTag },
        },
      },
      {
        type: "action-navigate",
        attributes: {
          $to: { type: "string", value: dateStr },
        },
      },
    ];

    return {
      type: "button",
      attributes: {
        class: {
          type: "string",
          value: "tc-btn-invisible " + classStr,
        },
        tooltip: {
          type: "string",
          value: "Create and open " + dateStr,
        },
      },
      children: actionNodes.concat(cardInner),
    };
  }

  function buildMonthDaysGridNodes(wiki, monthStr, todayStr, compact) {
    var startOfMonth = dayjs(monthStr + "-01");
    if (!startOfMonth.isValid()) return [];

    var weekdayHeaderCells = [];
    for (var w = 0; w < WEEKDAY_LABELS.length; w++) {
      weekdayHeaderCells.push({
        type: "element",
        tag: "span",
        attributes: {
          class: { type: "string", value: "journal-calendar-weekday" },
        },
        children: [{ type: "text", text: WEEKDAY_LABELS[w] }],
      });
    }

    var gridCells = [];
    var leadingEmpty = startOfMonth.isoWeekday() - 1;
    for (var e = 0; e < leadingEmpty; e++) {
      gridCells.push({
        type: "element",
        tag: "div",
        attributes: {
          class: { type: "string", value: "journal-calendar-empty" },
        },
        children: [],
      });
    }

    var daysInMonth = startOfMonth.daysInMonth();
    for (var d = 0; d < daysInMonth; d++) {
      var dayObj = startOfMonth.add(d, "day");
      gridCells.push(buildDailyCardNode(wiki, dayObj, todayStr, compact));
    }

    return [
      {
        type: "element",
        tag: "div",
        attributes: {
          class: { type: "string", value: "journal-calendar-weekdays" },
        },
        children: weekdayHeaderCells,
      },
      {
        type: "element",
        tag: "div",
        attributes: {
          class: { type: "string", value: "journal-days-grid" },
        },
        children: gridCells,
      },
    ];
  }

  function JournalPeriodGridWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.watchedTitles = [];
    this.habitTitles = [];
  }

  JournalPeriodGridWidget.prototype = new Widget();

  JournalPeriodGridWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  JournalPeriodGridWidget.prototype.execute = function () {
    var mode = this.getAttribute("mode", "weekly");
    var periodAttr = this.getAttribute("period", "");
    var storyTiddler = this.getVariable("storyTiddler");
    var currentTiddler = this.getVariable("currentTiddler");
    var period =
      periodAttr ||
      (storyTiddler && storyTiddler !== "" ? storyTiddler : currentTiddler) ||
      "";
    this.period = period.trim();
    this.mode = mode;
    this.watchedTitles = [];
    this.habitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );

    var now = dayjs();
    var todayStr = now.format("YYYY-MM-DD");
    var thisWeekStr = now.format("GGGG-[W]WW");
    var thisMonthStr = now.format("YYYY-MM");
    var nodes = [];

    if (mode === "weekly") {
      var activeDateAttr = this.getAttribute("active", "").trim();
      var weekMatch = /^(\d{4})-W(\d{2})$/.exec(this.period);
      if (weekMatch) {
        var isoYear = parseInt(weekMatch[1], 10);
        var isoWeekNum = parseInt(weekMatch[2], 10);
        var monday = dayjs(isoYear + "-01-04")
          .isoWeek(isoWeekNum)
          .startOf("isoWeek");
        var dayCards = [];
        for (var i = 0; i < 7; i++) {
          var dayObj = monday.add(i, "day");
          var dateStr = dayObj.format("YYYY-MM-DD");
          this.watchedTitles.push(dateStr);
          dayCards.push(
            buildDailyCardNode(
              this.wiki,
              dayObj,
              todayStr,
              false,
              activeDateAttr
            )
          );
        }
        nodes.push({
          type: "element",
          tag: "div",
          attributes: {
            class: { type: "string", value: "journal-days-grid" },
          },
          children: dayCards,
        });
      }
    } else if (mode === "monthly-days") {
      if (/^\d{4}-\d{2}$/.test(this.period)) {
        var mStart = dayjs(this.period + "-01");
        if (mStart.isValid()) {
          var totalDays = mStart.daysInMonth();
          for (var md = 0; md < totalDays; md++) {
            this.watchedTitles.push(mStart.add(md, "day").format("YYYY-MM-DD"));
          }
          nodes = buildMonthDaysGridNodes(
            this.wiki,
            this.period,
            todayStr,
            false
          );
        }
      }
    } else if (mode === "monthly-weeks") {
      if (/^\d{4}-\d{2}$/.test(this.period)) {
        var monthStart = dayjs(this.period + "-01");
        if (monthStart.isValid()) {
          var monthEnd = monthStart.endOf("month");
          var weekSet = Object.create(null);
          var weeksList = [];
          var cursor = monthStart.startOf("isoWeek");
          while (
            cursor.isBefore(monthEnd) ||
            cursor.isSame(monthEnd, "day")
          ) {
            var wTitle = cursor.format("GGGG-[W]WW");
            if (!weekSet[wTitle]) {
              weekSet[wTitle] = cursor.isBefore(monthStart)
                ? monthStart
                : cursor;
              weeksList.push(wTitle);
            }
            cursor = cursor.add(1, "week");
          }

          var weekCards = [];
          var yearStr = this.period.slice(0, 4);

          for (var wIdx = 0; wIdx < weeksList.length; wIdx++) {
            var weekTitle = weeksList[wIdx];
            this.watchedTitles.push(weekTitle);
            var weekExists = this.wiki.tiddlerExists(weekTitle);
            var isCurrentWeek = weekTitle === thisWeekStr;
            var isFutureWeek = weekTitle > thisWeekStr;
            var weekNumStr = weekTitle.split("W").pop();

            var wClasses = ["journal-day-card"];
            if (!weekExists) wClasses.push("journal-day-card-ghost");
            if (isFutureWeek) wClasses.push("journal-day-card-future");
            if (isCurrentWeek) wClasses.push("journal-day-card-today");
            var wClassStr = wClasses.join(" ");

            var wInner = [
              {
                type: "element",
                tag: "span",
                attributes: {
                  class: { type: "string", value: "journal-day-card-name" },
                },
                children: [{ type: "text", text: "Week" }],
              },
              {
                type: "element",
                tag: "span",
                attributes: {
                  class: { type: "string", value: "journal-day-card-date" },
                },
                children: [{ type: "text", text: weekNumStr }],
              },
            ];

            if (weekExists) {
              weekCards.push({
                type: "link",
                attributes: {
                  to: { type: "string", value: weekTitle },
                  class: { type: "string", value: wClassStr },
                  tooltip: { type: "string", value: "Open " + weekTitle },
                },
                children: wInner,
              });
            } else {
              var wDateRef = weekSet[weekTitle] || monthStart;
              var wJournalDate = wDateRef.format("YYYYMMDD120000000");
              var wTags =
                "Journal Weekly " + this.period + " " + yearStr;

              weekCards.push({
                type: "button",
                attributes: {
                  class: {
                    type: "string",
                    value: "tc-btn-invisible " + wClassStr,
                  },
                  tooltip: {
                    type: "string",
                    value: "Create and open " + weekTitle,
                  },
                },
                children: [
                  {
                    type: "action-setfield",
                    attributes: {
                      $tiddler: { type: "string", value: weekTitle },
                      tags: { type: "string", value: wTags },
                      "journal-date": { type: "string", value: wJournalDate },
                      year: { type: "string", value: yearStr },
                      month: { type: "string", value: this.period },
                    },
                  },
                  {
                    type: "action-navigate",
                    attributes: {
                      $to: { type: "string", value: weekTitle },
                    },
                  },
                ].concat(wInner),
              });
            }
          }

          nodes.push({
            type: "element",
            tag: "div",
            attributes: {
              class: { type: "string", value: "journal-weeks-grid" },
            },
            children: weekCards,
          });
        }
      }
    } else if (mode === "yearly") {
      if (/^\d{4}$/.test(this.period)) {
        var monthCards = [];
        for (var m = 1; m <= 12; m++) {
          var mm = m < 10 ? "0" + m : String(m);
          var monthTitle = this.period + "-" + mm;
          this.watchedTitles.push(monthTitle);
          var mObj = dayjs(monthTitle + "-01");
          var mName = mObj.format("MMM");
          var mExists = this.wiki.tiddlerExists(monthTitle);
          var isCurrentMonth = monthTitle === thisMonthStr;
          var isFutureMonth = monthTitle > thisMonthStr;

          var mClasses = ["journal-day-card"];
          if (!mExists) mClasses.push("journal-day-card-ghost");
          if (isFutureMonth) mClasses.push("journal-day-card-future");
          if (isCurrentMonth) mClasses.push("journal-day-card-today");
          var mClassStr = mClasses.join(" ");

          var mInner = [
            {
              type: "element",
              tag: "span",
              attributes: {
                class: { type: "string", value: "journal-day-card-name" },
              },
              children: [{ type: "text", text: mm }],
            },
            {
              type: "element",
              tag: "span",
              attributes: {
                class: { type: "string", value: "journal-day-card-date" },
              },
              children: [{ type: "text", text: mName }],
            },
          ];

          if (mExists) {
            monthCards.push({
              type: "link",
              attributes: {
                to: { type: "string", value: monthTitle },
                class: { type: "string", value: mClassStr },
                tooltip: { type: "string", value: "Open " + monthTitle },
              },
              children: mInner,
            });
          } else {
            var mJournalDate = this.period + mm + "01120000000";
            var mTags = "Journal Monthly " + this.period;
            monthCards.push({
              type: "button",
              attributes: {
                class: {
                  type: "string",
                  value: "tc-btn-invisible " + mClassStr,
                },
                tooltip: {
                  type: "string",
                  value: "Create and open " + monthTitle,
                },
              },
              children: [
                {
                  type: "action-setfield",
                  attributes: {
                    $tiddler: { type: "string", value: monthTitle },
                    tags: { type: "string", value: mTags },
                    "journal-date": { type: "string", value: mJournalDate },
                    year: { type: "string", value: this.period },
                  },
                },
                {
                  type: "action-navigate",
                  attributes: {
                    $to: { type: "string", value: monthTitle },
                  },
                },
              ].concat(mInner),
            });
          }
        }

        nodes.push({
          type: "element",
          tag: "div",
          attributes: {
            class: { type: "string", value: "journal-months-grid" },
          },
          children: monthCards,
        });
      }
    }

    this.makeChildWidgets(nodes);
  };

  JournalPeriodGridWidget.prototype.refresh = function (changedTiddlers) {
    var changedAttributes = this.computeAttributes();
    if (
      changedAttributes.mode ||
      changedAttributes.period ||
      changedAttributes.active
    ) {
      this.refreshSelf();
      return true;
    }

    for (var i = 0; i < this.watchedTitles.length; i++) {
      if (changedTiddlers[this.watchedTitles[i]]) {
        this.refreshSelf();
        return true;
      }
    }

    for (var j = 0; j < this.habitTitles.length; j++) {
      if (changedTiddlers[this.habitTitles[j]]) {
        this.refreshSelf();
        return true;
      }
    }

    return this.refreshChildren(changedTiddlers);
  };

  function JournalCalendarWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.watchedTitles = [];
    this.habitTitles = [];
    this.stateTiddler = "$:/temp/journal/calendar-month";
  }

  JournalCalendarWidget.prototype = new Widget();

  JournalCalendarWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  JournalCalendarWidget.prototype.execute = function () {
    this.stateTiddler = this.getAttribute(
      "state",
      "$:/temp/journal/calendar-month"
    );
    var now = dayjs();
    var todayStr = now.format("YYYY-MM-DD");
    var currentMonth = now.format("YYYY-MM");

    var rawState = this.wiki.getTiddlerText(this.stateTiddler, "").trim();
    var selectedMonth = /^\d{4}-\d{2}$/.test(rawState)
      ? rawState
      : currentMonth;
    var monthStart = dayjs(selectedMonth + "-01");
    if (!monthStart.isValid()) {
      selectedMonth = currentMonth;
      monthStart = dayjs(selectedMonth + "-01");
    }

    this.selectedMonth = selectedMonth;
    this.watchedTitles = [this.stateTiddler, selectedMonth];
    this.habitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );

    var daysInMonth = monthStart.daysInMonth();
    for (var d = 0; d < daysInMonth; d++) {
      this.watchedTitles.push(monthStart.add(d, "day").format("YYYY-MM-DD"));
    }

    var prevMonth = monthStart.subtract(1, "month").format("YYYY-MM");
    var nextMonth = monthStart.add(1, "month").format("YYYY-MM");
    var monthLabel = monthStart.format("MMMM YYYY");
    var yearStr = monthStart.format("YYYY");
    var monthJournalDate = monthStart.format("YYYYMM01120000000");
    var monthExists = this.wiki.tiddlerExists(selectedMonth);

    var monthTitleActions = [];
    if (!monthExists) {
      monthTitleActions.push({
        type: "action-setfield",
        attributes: {
          $tiddler: { type: "string", value: selectedMonth },
          tags: { type: "string", value: "Journal Monthly " + yearStr },
          "journal-date": { type: "string", value: monthJournalDate },
          year: { type: "string", value: yearStr },
        },
      });
    }
    monthTitleActions.push({
      type: "action-navigate",
      attributes: {
        $to: { type: "string", value: selectedMonth },
      },
    });

    var rightNavChildren = [];
    if (selectedMonth !== currentMonth) {
      rightNavChildren.push({
        type: "button",
        attributes: {
          class: {
            type: "string",
            value: "tc-btn-invisible journal-btn journal-btn-sm",
          },
          tooltip: {
            type: "string",
            value: "Return to current month (" + currentMonth + ")",
          },
        },
        children: [
          {
            type: "action-setfield",
            attributes: {
              $tiddler: { type: "string", value: this.stateTiddler },
              text: { type: "string", value: currentMonth },
            },
          },
          { type: "text", text: "Today" },
        ],
      });
    }

    rightNavChildren.push({
      type: "button",
      attributes: {
        class: {
          type: "string",
          value: "tc-btn-invisible journal-btn journal-btn-sm",
        },
        tooltip: {
          type: "string",
          value: "Next month (" + nextMonth + ")",
        },
      },
      children: [
        {
          type: "action-setfield",
          attributes: {
            $tiddler: { type: "string", value: this.stateTiddler },
            text: { type: "string", value: nextMonth },
          },
        },
        { type: "text", text: "›" },
      ],
    });

    var headerNode = {
      type: "element",
      tag: "div",
      attributes: {
        class: { type: "string", value: "journal-calendar-header" },
      },
      children: [
        {
          type: "button",
          attributes: {
            class: {
              type: "string",
              value: "tc-btn-invisible journal-btn journal-btn-sm",
            },
            tooltip: {
              type: "string",
              value: "Previous month (" + prevMonth + ")",
            },
          },
          children: [
            {
              type: "action-setfield",
              attributes: {
                $tiddler: { type: "string", value: this.stateTiddler },
                text: { type: "string", value: prevMonth },
              },
            },
            { type: "text", text: "‹" },
          ],
        },
        {
          type: "button",
          attributes: {
            class: {
              type: "string",
              value: "tc-btn-invisible journal-calendar-title-btn",
            },
            tooltip: {
              type: "string",
              value: "Open Monthly Review (" + selectedMonth + ")",
            },
          },
          children: monthTitleActions.concat([
            { type: "text", text: monthLabel },
          ]),
        },
        {
          type: "element",
          tag: "div",
          attributes: {
            class: { type: "string", value: "journal-calendar-nav-group" },
          },
          children: rightNavChildren,
        },
      ],
    };

    var gridNodes = buildMonthDaysGridNodes(
      this.wiki,
      selectedMonth,
      todayStr,
      true
    );

    var containerNode = {
      type: "element",
      tag: "div",
      attributes: {
        class: { type: "string", value: "journal-calendar" },
      },
      children: [headerNode].concat(gridNodes),
    };

    this.makeChildWidgets([containerNode]);
  };

  JournalCalendarWidget.prototype.refresh = function (changedTiddlers) {
    var changedAttributes = this.computeAttributes();
    if (changedAttributes.state) {
      this.refreshSelf();
      return true;
    }

    for (var i = 0; i < this.watchedTitles.length; i++) {
      if (changedTiddlers[this.watchedTitles[i]]) {
        this.refreshSelf();
        return true;
      }
    }

    for (var j = 0; j < this.habitTitles.length; j++) {
      if (changedTiddlers[this.habitTitles[j]]) {
        this.refreshSelf();
        return true;
      }
    }

    return this.refreshChildren(changedTiddlers);
  };

  exports["journal-period-grid"] = JournalPeriodGridWidget;
  exports["journal-calendar"] = JournalCalendarWidget;
})();
