/**
 * Selection and cursor utilities for contenteditable elements.
 * Handles cursor position preservation across DOM re-renders.
 */

/**
 * Get the cursor position as a text offset from the start of the element.
 * This works by creating a range from the start of the element to the cursor
 * and measuring its text length.
 */
export function getCursorOffset(element: HTMLElement): number {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return 0

  const range = selection.getRangeAt(0)

  // Check if selection is within our element
  if (!element.contains(range.startContainer)) {
    return 0
  }

  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(element)
  preCaretRange.setEnd(range.startContainer, range.startOffset)

  return preCaretRange.toString().length
}

/**
 * Set the cursor position from a text offset.
 * Uses a TreeWalker to find the correct text node and offset.
 */
export function setCursorOffset(element: HTMLElement, offset: number): void {
  const selection = window.getSelection()
  if (!selection) return

  // Handle empty element
  if (!element.firstChild) {
    const range = document.createRange()
    range.setStart(element, 0)
    range.collapse(true)
    selection.removeAllRanges()
    selection.addRange(range)
    return
  }

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentOffset = 0
  let node: Node | null = walker.nextNode()

  while (node) {
    const nodeLength = node.textContent?.length || 0

    if (currentOffset + nodeLength >= offset) {
      const range = document.createRange()
      range.setStart(node, offset - currentOffset)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }

    currentOffset += nodeLength
    node = walker.nextNode()
  }

  // If we didn't find the position, put cursor at the end
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Get the current selection range if it's within the element.
 */
export function getSelectionRange(element: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return null

  const range = selection.getRangeAt(0)

  if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) {
    return null
  }

  const startRange = range.cloneRange()
  startRange.selectNodeContents(element)
  startRange.setEnd(range.startContainer, range.startOffset)
  const start = startRange.toString().length

  const endRange = range.cloneRange()
  endRange.selectNodeContents(element)
  endRange.setEnd(range.endContainer, range.endOffset)
  const end = endRange.toString().length

  return { start, end }
}

/**
 * Set a selection range from text offsets.
 */
export function setSelectionRange(element: HTMLElement, start: number, end: number): void {
  const selection = window.getSelection()
  if (!selection) return

  if (start === end) {
    setCursorOffset(element, start)
    return
  }

  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null
  )

  let currentOffset = 0
  let startNode: Node | null = null
  let startNodeOffset = 0
  let endNode: Node | null = null
  let endNodeOffset = 0
  let node: Node | null = walker.nextNode()

  while (node) {
    const nodeLength = node.textContent?.length || 0

    if (!startNode && currentOffset + nodeLength >= start) {
      startNode = node
      startNodeOffset = start - currentOffset
    }

    if (currentOffset + nodeLength >= end) {
      endNode = node
      endNodeOffset = end - currentOffset
      break
    }

    currentOffset += nodeLength
    node = walker.nextNode()
  }

  if (startNode && endNode) {
    const range = document.createRange()
    range.setStart(startNode, startNodeOffset)
    range.setEnd(endNode, endNodeOffset)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}
