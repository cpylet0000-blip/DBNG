/**
 * Bingo Card Generator Utility
 * Generates random 5×5 bingo cards with valid number ranges
 * B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
 */

export const generateBingoCard = (): number[] => {
  const card: number[] = []
  
  // Column ranges for B-I-N-G-O
  const columnRanges = [
    [1, 15],   // B
    [16, 30],  // I
    [31, 45],  // N
    [46, 60],  // G
    [61, 75],  // O
  ]

  // Generate 5 numbers for each column
  for (let col = 0; col < 5; col++) {
    const [min, max] = columnRanges[col]
    const columnNumbers = new Set<number>()
    
    while (columnNumbers.size < 5) {
      const num = Math.floor(Math.random() * (max - min + 1)) + min
      columnNumbers.add(num)
    }
    
    const sortedNumbers = Array.from(columnNumbers).sort((a, b) => a - b)
    
    // Place numbers in card (column by column)
    for (let row = 0; row < 5; row++) {
      card.push(sortedNumbers[row])
    }
  }

  // Rearrange to row-major order (0-4, 5-9, 10-14, 15-19, 20-24)
  const rowMajorCard: number[] = []
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      rowMajorCard.push(card[col * 5 + row])
    }
  }

  return rowMajorCard
}

/**
 * Check if a set of marked cells forms a winning pattern
 */
export const checkWinPattern = (markedCells: number[]): boolean => {
  const marked = new Set(markedCells)
  marked.add(12) // Free space always marked

  // Check rows
  for (let row = 0; row < 5; row++) {
    const rowCells = Array.from({ length: 5 }, (_, i) => row * 5 + i)
    if (rowCells.every((cell) => marked.has(cell))) return true
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    const colCells = Array.from({ length: 5 }, (_, i) => i * 5 + col)
    if (colCells.every((cell) => marked.has(cell))) return true
  }

  // Check diagonals
  const diagonal1 = [0, 6, 12, 18, 24]
  const diagonal2 = [4, 8, 12, 16, 20]
  if (diagonal1.every((cell) => marked.has(cell))) return true
  if (diagonal2.every((cell) => marked.has(cell))) return true

  return false
}
