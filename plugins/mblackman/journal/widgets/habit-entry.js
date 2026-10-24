/*\
title: $:/plugins/mblackman/journal/habit-entry.js
type: application/javascript
module-type: widget

Renders habit input controls on a daily journal tiddler
\*/

(function () {
  "use strict";

  var Widget = require("$:/core/modules/widgets/widget.js").widget;

  function JournalHabitsWidget(parseTreeNode, options) {
    this.initialise(parseTreeNode, options);
    this.habitTitles = [];
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

    var nodes = [];

    for (var i = 0; i < this.habitTitles.length; i++) {
      var title = this.habitTitles[i];
      var tiddler = this.wiki.getTiddler(title);
      if (!tiddler) continue;

      var caption = tiddler.fields.caption || title;
      var field = tiddler.fields["journal-field"];
      var type = tiddler.fields["habit-type"] || "number";

      if (!field) continue;

      var labelNode = {
        type: "element",
        tag: "span",
        attributes: {
          class: { type: "string", value: "habit-label" },
        },
        children: [{ type: "text", text: caption }],
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
        var attributes = {
          field: { type: "string", value: field },
          class: { type: "string", value: "tc-edit-texteditor habit-input" },
          placeholder: {
            type: "string",
            value: type === "number" ? "0" : "",
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
        children: [labelNode, inputWidgetNode],
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
})();
