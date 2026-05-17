import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Allows standard rich-text HTML tags but strips scripts, event handlers, etc.
 */
export const sanitizeHTML = (html: string): string => {
  if (!html) return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "a", "img",
      "table", "thead", "tbody", "tfoot", "tr", "td", "th",
      "blockquote", "pre", "code",
      "div", "span",
      "hr",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title", "class", "style",
      "target", "rel",
      "width", "height",
      "colspan", "rowspan",
    ],
    // Prevent javascript: URIs in href/src
    ALLOW_DATA_ATTR: false,
    FORCE_BODY: false,
  });
};
