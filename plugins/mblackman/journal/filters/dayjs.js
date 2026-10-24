/*\
title: $:/plugins/mblackman/journal/filters/dayjs.js
type: application/javascript
module-type: filteroperator

Filter operator [dayjs[format]] for formatting dates and ISO weeks without <$wikify>.
Supports "iso-week" shorthand ("GGGG-[W]WW") and "{...}" escaping for literal brackets inside filter operands.
\*/

(function () {
  "use strict";

  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  function normalizeFormat(rawFormat) {
    if (!rawFormat) return "YYYY-MM-DD";
    if (rawFormat === "iso-week") return "GGGG-[W]WW";
    return rawFormat.replace(/\{([^}]*)\}/g, "[$1]");
  }

  exports.dayjs = function (source, operator) {
    var results = [];
    var formatString = normalizeFormat(operator.operand);

    source(function (tiddler, title) {
      var raw = typeof title === "string" ? title.trim() : "";
      var dateObj =
        !raw || raw === "now" || raw === "today" ? dayjs() : dayjs(raw);
      if (dateObj.isValid()) {
        results.push(dateObj.format(formatString));
      }
    });

    return results;
  };
})();
