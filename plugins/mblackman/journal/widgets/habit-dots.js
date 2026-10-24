/*\
title: $:/plugins/mblackman/journal/widgets/habit-dots.js
type: application/javascript
module-type: widget

Renders shorthand habit indicator badges for a daily journal tiddler
\*/

(function () {
  "use strict";

  var Widget = require("$:/core/modules/widgets/widget.js").widget;

  function HabitDotsWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.habitTitles = [];
  }

  HabitDotsWidget.prototype = new Widget();

  HabitDotsWidget.prototype.render = function (parent, nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();
    this.renderChildren(parent, nextSibling);
    this.children.forEach(function (child) {
      self.domNodes.push.apply(self.domNodes, child.domNodes);
    });
  };

  HabitDotsWidget.prototype.execute = function () {
    this.habitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );
    var currentTiddlerTitle = this.getVariable("currentTiddler");
    var currentTiddler = this.wiki.getTiddler(currentTiddlerTitle);

    var nodes = [];

    for (var i = 0; i < this.habitTitles.length; i++) {
      var habitTitle = this.habitTitles[i];
      var habitTiddler = this.wiki.getTiddler(habitTitle);
      if (!habitTiddler) continue;

      var field = habitTiddler.fields["journal-field"];
      var shorthand = (habitTiddler.fields["habit-shorthand"] || "").trim();
      var type = habitTiddler.fields["habit-type"] || "number";
      var caption = habitTiddler.fields.caption || habitTitle;

      if (!field || !shorthand) continue;

      var value = currentTiddler ? currentTiddler.fields[field] : undefined;
      var showDot = false;

      if (type === "checkbox") {
        if (value === "yes") showDot = true;
      } else if (type === "number") {
        if (value && value !== "0") showDot = true;
      } else {
        if (value) showDot = true;
      }

      if (showDot) {
        nodes.push({
          type: "element",
          tag: "span",
          attributes: {
            class: { type: "string", value: "habit-dot" },
            title: { type: "string", value: caption },
          },
          children: [{ type: "text", text: shorthand }],
        });
      }
    }

    this.makeChildWidgets(nodes);
  };

  HabitDotsWidget.prototype.refresh = function (changedTiddlers) {
    var currentTiddler = this.getVariable("currentTiddler");
    if (currentTiddler && changedTiddlers[currentTiddler]) {
      this.refreshSelf();
      return true;
    }

    for (var i = 0; i < this.habitTitles.length; i++) {
      if (changedTiddlers[this.habitTitles[i]]) {
        this.refreshSelf();
        return true;
      }
    }

    var newHabitTitles = this.wiki.filterTiddlers(
      "[tag[$:/tags/Journal/Habit]!has[draft.of]sort[caption]]"
    );
    if (newHabitTitles.length !== this.habitTitles.length) {
      this.refreshSelf();
      return true;
    }
    for (var j = 0; j < newHabitTitles.length; j++) {
      if (newHabitTitles[j] !== this.habitTitles[j]) {
        this.refreshSelf();
        return true;
      }
    }

    return this.refreshChildren(changedTiddlers);
  };

  exports["habit-dots"] = HabitDotsWidget;
})();
