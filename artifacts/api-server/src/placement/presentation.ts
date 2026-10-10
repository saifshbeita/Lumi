/** Count prose sentences, not list numbers, decimal points or trailing emoji.
 * This is validation only: never remove or truncate the learner's explanation.
 */
export function sentenceCount(text:string):number {
 const normalized=text.replace(/(\d)\.(?=\d)/g,"$1\uFF0E").replace(/\b(?:e\.g\.|i\.e\.|Mr\.|Mrs\.|Ms\.|Dr\.)/g,s=>s.replaceAll(".","\uFF0E"));
 return (normalized.match(/[^.!؟?\n]+[.!؟?]?/g)??[]).filter(segment=>/\p{L}/u.test(segment)).length;
}
