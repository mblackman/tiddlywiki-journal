/*\
title: $:/plugins/mblackman/journal/macros/dayjs.js
type: application/javascript
module-type: macro

Global <<dayjs>> macro for date formatting and ISO 8601 week support
\*/

(function () {
  "use strict";

  var dayjs = require("$:/plugins/mblackman/journal/lib/dayjs.js");

  function normalizeFormat(rawFormat) {
    if (!rawFormat) return "YYYY-MM-DD";
    if (rawFormat === "iso-week") return "GGGG-[W]WW";
    return rawFormat.replace(/\{([^}]*)\}/g, "[$1]");
  }

  exports.name = "dayjs";

  exports.params = [{ name: "date" }, { name: "format" }];

  exports.run = function (date, format) {
    var trimmed = typeof date === "string" ? date.trim() : "";
    var dateObj =
      !trimmed || trimmed === "now" || trimmed === "today"
        ? dayjs()
        : dayjs(trimmed);
    if (!dateObj.isValid()) {
      return "";
    }
    return dateObj.format(normalizeFormat(format));
  };
})();
