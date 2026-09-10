function unigramize(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  return text.replace(/[\u4e00-\u9fff]/g, (c) => ` ${c} `).replace(/\s+/g, " ").trim();
}
function containsCjk(text) {
  return typeof text === "string" && /[\u4e00-\u9fff]/.test(text);
}
export {
  containsCjk,
  unigramize
};
//# sourceMappingURL=cjk.js.map
