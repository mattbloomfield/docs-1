const dictionary = require("../../anchor-prefixes");
const placeholders = Object.keys(dictionary);

function replacePrefixes(md) {
  // code adapted from the markdown-it-replace-link plugin
  md.core.ruler.after("inline", "replace-link", function(state) {
    state.tokens.forEach(function(blockToken) {
      if (blockToken.type === "inline" && blockToken.children) {
        blockToken.children.forEach(function(token, tokenIndex) {
          if (token.type === "link_open") {
            token.attrs.forEach(function(attr) {
              if (attr[0] === "href") {
                let replace = replacePrefix(attr[1]);
                if (replace) {
                  attr[1] = replace;
                  let next = blockToken.children[tokenIndex + 1];
                  if (next.type === "text") {
                    next.content = removePrefix(next.content);
                  }
                }
              }
              return false;
            });
          }
        });
      }
    });
    return false;
  });
}

/**
 * Replace any of our special prefixes within links.
 * @param {*} link href value
 */
function replacePrefix(link) {
  link = decodeURIComponent(link);

  // do we have a protocol or prefix?
  const prefix = getPrefix(link);

  if (!prefix) {
    return;
  }

  // is one of our custom filters being used?
  const inUse = placeholders.filter(placeholder => {
    return placeholder === prefix;
  });

  if (prefix === "api" || prefix === "config") {
    console.log('broken legacy `' + prefix + '` link: "' + link + '"');
  }

  if (!inUse || inUse.length === 0) {
    return;
  }

  // get relevant settings from `anchor-prefixes.js`
  const prefixSettings = dictionary[inUse[0]];

  if (prefixSettings.hasOwnProperty("format")) {
    // get class name, subject, whether it’s a method, and hash
    const ref = parseReference(link);

    if (ref && prefixSettings.format === "internal") {
      let url = `${prefixSettings.base}${slugifyClassName(ref.className)}.html`;
      let hash = ref.hash;

      if (ref.subject) {
        hash = "";
        if (ref.isMethod) {
          hash = "method-";
        } else if (!ref.subject.match(/^EVENT_/)) {
          hash = "property-";
        }

        hash += ref.subject.replace(/_/g, "-").toLowerCase();
      }

      return url + (hash ? `#${hash}` : "");
    } else if (ref && prefixSettings.format === "yii") {
      // v1 does not lowercase class name, and it strips `()` from method names
      let isVersion1 = prefixSettings.base.includes("1.1");
      let url = isVersion1
        ? `${prefixSettings.base}${ref.className}`
        : `${prefixSettings.base}${slugifyClassName(ref.className)}`;
      let hash = ref.hash;

      if (ref.subject) {
        let parens = isVersion1 ? '' : '()';
        hash =
          (ref.isMethod ? `${ref.subject}${parens}` : `\$${ref.subject}`) + "-detail";
      }

      return url + (hash ? `#${hash}` : "");
    } else if (prefixSettings.format === "config") {
      m = link.match(/^config[2|3]:(.+)/);
      let setting = m[1].toLowerCase();

      if (m) {
        return `${prefixSettings.base}${setting}`;
      }
    } else if (prefixSettings.format === "generic") {
      return link.replace(`${prefix}:`, prefixSettings.base);
    }
  }
}

/**
 * Grabs characters prior to `:`, returning undefined if there isn’t a colon.
 * @param string link
 */
function getPrefix(link) {
  const linkParts = link.split(":");
  return linkParts.length === 0 ? undefined : linkParts[0];
}

/**
 * Kebab-cases presumed class name for use in a URL.
 * @param string className
 */
function slugifyClassName(className) {
  return className.replace(/\\/g, "-").toLowerCase();
}

/**
 * Returns the given string with any valid prefixes removed (`foo:bar` → `bar`).
 * @param string link
 */
function removePrefix(link) {
  return link.replace(`${getPrefix(link)}:`, "");
}

/**
 * Takes link content without prefix and parses for class + method details.
 * @param string link
 * @returns object or null
 */
function parseReference(link) {
  let m = removePrefix(link).match(
    /^\\?([\w\\]+)(?:::\$?(\w+)(\(\))?)?(?:#([\w\-]+))?$/
  );

  if (!m) {
    return;
  }

  return {
    className: m[1],
    subject: m[2],
    isMethod: typeof m[3] !== "undefined",
    hash: m[4]
  };
}

module.exports = {
  replacePrefixes,
  replacePrefix
};
