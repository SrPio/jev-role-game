/** True when a key event comes from a form field, so game shortcuts should ignore it. */
export function isTypingTarget(e: KeyboardEvent): boolean {
  const t = e.target;
  return t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
}
