// Format only the view. Preserve JSON lexemes (large integers, duplicate keys,
// number exponents and escapes) rather than reserializing parsed JS values.
const MAX_FORMAT_LENGTH = 2 * 1024 * 1024;
const formatJSONForDisplay = text => {
  const fallback = reason => ({ available: false, text, reason });
  if (!text) return fallback('空内容');
  if (text.length > MAX_FORMAT_LENGTH) return fallback('内容较大，显示原文');
  try { JSON.parse(text); } catch (e) { return fallback('非 JSON 或 JSON 格式无效，显示原文'); }
  let output = '', depth = 0, quoted = false, escaped = false, previous = '';
  const newline = () => '\n' + '  '.repeat(depth);
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      output += char;
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (/\s/.test(char)) {
      continue;
    } else if (char === '"') {
      quoted = true; output += char;
    } else if (char === '{' || char === '[') {
      output += char; depth++;
      if (depth > 100) return fallback('嵌套较深，显示原文');
      let next = i + 1;
      while (/\s/.test(text[next] || '') && next < text.length) next++;
      if (text[next] !== (char === '{' ? '}' : ']')) output += newline();
    } else if (char === '}' || char === ']') {
      depth--;
      if (previous !== (char === '}' ? '{' : '[')) output += newline();
      output += char;
    } else if (char === ',') output += ',' + newline();
    else if (char === ':') output += ': ';
    else output += char;
    previous = char;
    if (output.length > MAX_FORMAT_LENGTH) return fallback('格式化后内容较大，显示原文');
  }
  return { available: true, text: output, reason: '' };
};
module.exports = { formatJSONForDisplay };
