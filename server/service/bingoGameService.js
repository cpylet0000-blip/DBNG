/**
 * Bingo Game Service - COLUMN-MAJOR FORMAT
 * Logic for 75-ball board, win patterns, auto-marking
 * NOTE: Cards are stored in COLUMN-MAJOR format (B, I, N, G, O columns)
 * Indices 0-4: B column, 5-9: I column, 10-14: N column, 15-19: G column, 20-24: O column
 */

/**
 * Convert column-major index to row-major (for display)
 * Column-major: 0-4 = B col, 5-9 = I col, etc.
 * Row-major: 0-4 = row 1, 5-9 = row 2, etc.
 */
function colMajorToRowMajor(colIdx) {
  const col = Math.floor(colIdx / 5)
  const row = colIdx % 5
  return row * 5 + col
}

/**
 * Convert row-major index to column-major
 */
function rowMajorToColMajor(rowIdx) {
  const row = Math.floor(rowIdx / 5)
  const col = rowIdx % 5
  return col * 5 + row
}

/**
 * Draw a random ball that hasn't been drawn yet
 * @param {number[]} calledNumbers - Already called numbers
 * @returns {number|null} Next ball (1-75) or null if all drawn
 */
export function drawNextBall(calledNumbers) {
  const allBalls = Array.from({ length: 75 }, (_, i) => i + 1)
  const remaining = allBalls.filter((ball) => !calledNumbers.includes(ball))

  if (remaining.length === 0) return null

  const idx = Math.floor(Math.random() * remaining.length)
  return remaining[idx]
}

/**
 * Check if marked cells form a winning pattern (COLUMN-MAJOR)
 * @param {number[]} markedCells - Cell indices (0-24) in COLUMN-MAJOR format
 * @returns {{ hasWin: boolean, pattern: string|null, cells: number[]|null }}
 */
export function checkWinPattern(markedCells) {
  const marked = new Set(markedCells)

  // Check rows (convert to row-major for easier checking)
  for (let row = 0; row < 5; row++) {
    const rowCells = []
    let complete = true
    for (let col = 0; col < 5; col++) {
      const colMajorIdx = col * 5 + row  // Column-major index
      rowCells.push(colMajorIdx)
      // Cell at col=2, row=2 (index 12 in col-major) is the free space
      if (colMajorIdx !== 12 && !marked.has(colMajorIdx)) {
        complete = false
        break
      }
    }
    if (complete) {
      return { hasWin: true, pattern: `row-${row}`, cells: rowCells }
    }
  }

  // Check columns (easier in column-major)
  for (let col = 0; col < 5; col++) {
    const colCells = []
    let complete = true
    for (let row = 0; row < 5; row++) {
      const colMajorIdx = col * 5 + row
      colCells.push(colMajorIdx)
      // Cell 12 is the free space
      if (colMajorIdx !== 12 && !marked.has(colMajorIdx)) {
        complete = false
        break
      }
    }
    if (complete) {
      return { hasWin: true, pattern: `col-${col}`, cells: colCells }
    }
  }

  // Check diagonal (top-left to bottom-right) in column-major
  // Row 0,Col 0 = 0, Row 1,Col 1 = 6, Row 2,Col 2 = 12, Row 3,Col 3 = 18, Row 4,Col 4 = 24
  const diag1Cells = [0, 6, 12, 18, 24]
  let diag1 = true
  for (const idx of diag1Cells) {
    if (idx !== 12 && !marked.has(idx)) {
      diag1 = false
      break
    }
  }
  if (diag1) {
    return { hasWin: true, pattern: 'diagonal-1', cells: diag1Cells }
  }

  // Check diagonal (top-right to bottom-left) in column-major
  // Row 0,Col 4 = 20, Row 1,Col 3 = 16, Row 2,Col 2 = 12, Row 3,Col 1 = 8, Row 4,Col 0 = 4
  const diag2Cells = [20, 16, 12, 8, 4]
  let diag2 = true
  for (const idx of diag2Cells) {
    if (idx !== 12 && !marked.has(idx)) {
      diag2 = false
      break
    }
  }
  if (diag2) {
    return { hasWin: true, pattern: 'diagonal-2', cells: diag2Cells }
  }

  // Check four corners in column-major
  // Top-left (0,0)=0, Top-right (0,4)=20, Bottom-left (4,0)=4, Bottom-right (4,4)=24
  const cornerIndices = [0, 20, 4, 24]
  const cornersMarked = cornerIndices.every(idx => marked.has(idx))
  if (cornersMarked) {
    return { hasWin: true, pattern: 'four-corners', cells: cornerIndices }
  }

  return { hasWin: false, pattern: null, cells: null }
}

/**
 * Auto-mark cells based on called numbers (COLUMN-MAJOR)
 * @param {number[]} cardNumbers - Player's 25 numbers in COLUMN-MAJOR format
 * @param {number[]} calledNumbers - Numbers called so far
 * @returns {number[]} Indices of cells that should be marked (COLUMN-MAJOR)
 */
export function autoMarkCells(cardNumbers, calledNumbers) {
  const markedCells = []
  const calledSet = new Set(calledNumbers)

  for (let i = 0; i < cardNumbers.length; i++) {
    if (calledSet.has(cardNumbers[i])) {
      markedCells.push(i)
    }
  }

  return markedCells
}

/**
 * Calculate prize (90% of pot, house keeps 10%)
 * @param {number} stake - Stake amount
 * @param {number} playerCount - Number of players
 * @returns {number} Prize for winner
 */
export function calculatePrize(stake, playerCount) {
  const totalPot = stake * playerCount;
  if(playerCount<3){
    return Math.floor(totalPot * 1)
  }
  else if(playerCount<5){
    return Math.floor(totalPot * 0.9)
  }else{
    return Math.floor(totalPot * 0.8)
  }
}
