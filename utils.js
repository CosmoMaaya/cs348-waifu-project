module.exports = {
    format_query: function(baseStr, replacements) {
        for (let field in replacements) {
            if (Object.prototype.hasOwnProperty.call(replacements, field)) {
                baseStr = baseStr.replace("{" + field + "}", replacements[field]);
            }
        }
        baseStr = baseStr.replace(/\s+/g, ' '); // Shorten query
        return baseStr;
    },
  };