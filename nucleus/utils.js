export function replaceChildren(parent, children) {
  const [first, ...rest] = children
  let prev = first

  if (first && (first.parentNode !== parent || first.previousSibling)) {
    parent.insertBefore(first, parent.firstChild)
  }

  for (const el of rest) {
    if (el.previousSibling !== prev) {
      prev.after(el)
    }
    prev = el
  }

  while (prev?.nextSibling) {
    prev.nextSibling.remove()
  }
}

export function getRandomId() {
  return Math.random().toString(32).substr(2)
}
