/*\
title: $:/plugins/mblackman/journal/habit-entry.js
type: application/javascript
module-type: widget

Renders habit input controls on a daily journal tiddler, including unit/target hints
and live `🔥 Xd` current streak badges.
\*/

(function () {
  "use strict";

  var Widget = require("$:/core/modules/widgets/widget.js").widget;
  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  function isHabitMetOnDay(wiki, dateStr, habitTiddler) {
    var dayTiddler = wiki.getTiddler(dateStr);
    if (!dayTiddler || !habitTiddler) return false;
    var field = habitTiddler.fields["journal-field"];
    if (!field) return false;
    var type = habitTiddler.fields["habit-type"] || "number";
    var target = parseFloat(habitTiddler.fields["habit-target"]);
    var val = dayTiddler.fields[field];

    if (type === "checkbox") {
      return val === "yes";
    }
    if (type === "number") {
      var num = parseFloat(val);
      if (isNaN(num) || num <= 0) return false;
      if (!isNaN(target) && target > 0) {
        return num >= target;
      }
      return true;
    }
    return Boolean(val && String(val).trim() !== "");
  }

  function computeHabitStreak(wiki, habitTiddler, refDateStr) {
    var baseStr =
      refDateStr && /^\d{4}-\d{2}-\d{2}$/.test(refDateStr)
        ? refDateStr
        : dayjs().format("YYYY-MM-DD");
    var cursor = dayjs(baseStr);
    if (!cursor.isValid()) return 0;

    var streak = 0;
    if (!isHabitMetOnDay(wiki, baseStr, habitTiddler)) {
      var refTiddler = wiki.getTiddler(baseStr);
      var field = habitTiddler && habitTiddler.fields["journal-field"];
      var rawVal = refTiddler && field ? refTiddler.fields[field] : undefined;
      var hasExplicitValue =
        rawVal !== undefined && String(rawVal).trim() !== "";
      if (hasExplicitValue) {
        return 0;
      }
      cursor = cursor.subtract(1, "day");
    }

    for (var step = 0; step < 3660; step++) {
      var dStr = cursor.format("YYYY-MM-DD");
      if (isHabitMetOnDay(wiki, dStr, habitTiddler)) {
        streak++;
        cursor = cursor.subtract(1, "day");
      } else {
        break;
      }
    }
    return streak;
  }

  function HabitStreakPillWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
  }

  HabitStreakPillWidget.prototype = new Widget();

  HabitStreakPillWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  HabitStreakPillWidget.prototype.execute = function () {
    this.habitTitle = this.getAttribute("habit", "");
    this.dateTitle =
      this.getAttribute("date", "") || this.getVariable("currentTiddler") || "";
    var habitTiddler = this.wiki.getTiddler(this.habitTitle);
    var streak = habitTiddler
      ? computeHabitStreak(this.wiki, habitTiddler, this.dateTitle)
      : 0;

    var nodes = [];
    if (streak >= 1) {
      nodes.push({
        type: "element",
        tag: "span",
        attributes: {
          class: { type: "string", value: "habit-streak-pill" },
          title: { type: "string", value: streak + "-day streak" },
        },
        children: [{ type: "text", text: "🔥 " + streak + "d" }],
      });
    }
    this.makeChildWidgets(nodes);
  };

  HabitStreakPillWidget.prototype.refresh = function (changedTiddlers) {
    var changedAttributes = this.computeAttributes();
    if (changedAttributes.habit || changedAttributes.date) {
      this.refreshSelf();
      return true;
    }
    if (this.habitTitle && changedTiddlers[this.habitTitle]) {
      this.refreshSelf();
      return true;
    }
    var changedKeys = Object.keys(changedTiddlers);
    for (var i = 0; i < changedKeys.length; i++) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(changedKeys[i])) {
        this.refreshSelf();
        return true;
      }
    }
    return this.refreshChildren(changedTiddlers);
  };

  function JournalHabitsWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.habitTitles = [];
    this.currentDateTitle = "";
  }

  JournalHabitsWidget.prototype = new Widget();

  JournalHabitsWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  JournalHabitsWidget.prototype.execute = function () {
    this.habitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );
    this.currentDateTitle = this.getVariable("currentTiddler") || "";

    var nodes = [];

    for (var i = 0; i < this.habitTitles.length; i++) {
      var title = this.habitTitles[i];
      var tiddler = this.wiki.getTiddler(title);
      if (!tiddler) continue;

      var caption = tiddler.fields.caption || title;
      var field = tiddler.fields["journal-field"];
      var type = tiddler.fields["habit-type"] || "number";
      var unit = (tiddler.fields["habit-unit"] || "").trim();
      var targetRaw = (tiddler.fields["habit-target"] || "").trim();
      var targetNum = parseFloat(targetRaw);

      if (!field) continue;

      var labelChildren = [{ type: "text", text: caption }];
      var metaParts = [];
      if (
        unit &&
        caption.toLowerCase().indexOf("(" + unit.toLowerCase()) === -1
      ) {
        metaParts.push(unit);
      }
      if (type === "number" && !isNaN(targetNum) && targetNum > 0) {
        metaParts.push("Goal: " + targetNum + (unit ? " " + unit : ""));
      }
      if (metaParts.length > 0) {
        labelChildren.push({
          type: "element",
          tag: "span",
          attributes: {
            class: { type: "string", value: "habit-meta-hint" },
          },
          children: [{ type: "text", text: "(" + metaParts.join(" · ") + ")" }],
        });
      }

      var headerRowChildren = [
        {
          type: "element",
          tag: "span",
          attributes: {
            class: { type: "string", value: "habit-label" },
          },
          children: labelChildren,
        },
        {
          type: "habit-streak-pill",
          attributes: {
            habit: { type: "string", value: title },
            date: { type: "string", value: this.currentDateTitle },
          },
        },
      ];

      var labelRowNode = {
        type: "element",
        tag: "div",
        attributes: {
          class: { type: "string", value: "habit-label-row" },
        },
        children: headerRowChildren,
      };

      var inputWidgetNode;

      if (type === "checkbox") {
        inputWidgetNode = {
          type: "checkbox",
          attributes: {
            field: { type: "string", value: field },
            checked: { type: "string", value: "yes" },
            unchecked: { type: "string", value: "no" },
            default: { type: "string", value: "no" },
          },
        };
      } else {
        var placeholderVal = "";
        if (type === "number") {
          placeholderVal =
            !isNaN(targetNum) && targetNum > 0 ? String(targetNum) : "0";
        }
        var attributes = {
          field: { type: "string", value: field },
          class: { type: "string", value: "tc-edit-texteditor habit-input" },
          placeholder: {
            type: "string",
            value: placeholderVal,
          },
        };

        if (type === "number") {
          attributes.type = { type: "string", value: "number" };
          attributes.size = { type: "string", value: "5" };
        }

        inputWidgetNode = {
          type: "edit-text",
          attributes: attributes,
        };
      }

      nodes.push({
        type: "element",
        tag: "div",
        children: [labelRowNode, inputWidgetNode],
      });
    }

    this.makeChildWidgets(nodes);
  };

  JournalHabitsWidget.prototype.refresh = function (changedTiddlers) {
    var dirty = false;

    for (var i = 0; i < this.habitTitles.length; i++) {
      if (changedTiddlers[this.habitTitles[i]]) {
        dirty = true;
        break;
      }
    }

    if (!dirty) {
      var newHabits = this.wiki.filterTiddlers(
        "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
      );
      if (newHabits.length !== this.habitTitles.length) {
        dirty = true;
      } else {
        for (var j = 0; j < newHabits.length; j++) {
          if (newHabits[j] !== this.habitTitles[j]) {
            dirty = true;
            break;
          }
        }
      }
    }

    if (dirty) {
      this.refreshSelf();
      return true;
    }

    return this.refreshChildren(changedTiddlers);
  };

  exports["journal-habits"] = JournalHabitsWidget;
  exports["habit-streak-pill"] = HabitStreakPillWidget;
})();
