"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { HelpCircle, Trophy, RotateCcw } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import confetti from "canvas-confetti"

/**
 * Define emoji categories for players to choose from
 * Each category contains a set of emojis that will be randomly assigned during gameplay
 */
const emojiCategories = {
  animals: ["🐶", "🐱", "🐵", "🐰", "🦊", "🐻", "🐼", "🐨", "🦁", "🐯"],
  food: ["🍕", "🍔", "🍟", "🍩", "🍦", "🍭", "🍫", "🍿", "🥐", "🍪"],
  sports: ["⚽", "🏀", "🏈", "🎾", "🏐", "🏉", "🎱", "🏓", "⚾", "🥎"],
  tech: ["💻", "📱", "🖥️", "⌨️", "🖱️", "🎮", "🎧", "📷", "🕹️", "🔋"],
  space: ["🚀", "🛸", "🌌", "🌠", "🪐", "👾", "👽", "🌑", "🌕", "☄️"],
}

/**
 * Player type definition
 * @property id - Player identifier (1 or 2)
 * @property category - Selected emoji category
 * @property emojis - Array of emojis from the selected category
 * @property placedEmojis - Array of emojis placed on the board with their positions
 */
type Player = {
  id: number
  category: string
  emojis: string[]
  placedEmojis: { position: number; emoji: string }[]
}

/**
 * Game state type definition
 * @property board - Current state of the game board (9 cells)
 * @property currentPlayer - ID of the player whose turn it is
 * @property winner - ID of the winning player (null if no winner yet)
 * @property winningLine - Array of winning cell indices (null if no winner yet)
 * @property gameStarted - Whether the game has started
 * @property player1Category - Selected emoji category for Player 1
 * @property player2Category - Selected emoji category for Player 2
 */
type GameState = {
  board: (string | null)[]
  currentPlayer: number
  winner: number | null
  winningLine: number[] | null
  gameStarted: boolean
  player1Category: string
  player2Category: string
}

/**
 * Initial game state
 * The board starts empty, Player 1 goes first, and default categories are set
 */
const initialGameState: GameState = {
  board: Array(9).fill(null),
  currentPlayer: 1,
  winner: null,
  winningLine: null,
  gameStarted: false,
  player1Category: "tech",
  player2Category: "space",
}

/**
 * All possible winning combinations on the 3x3 grid
 * Each array represents the indices of cells that form a winning line
 */
const winningCombinations = [
  [0, 1, 2], // top row
  [3, 4, 5], // middle row
  [6, 7, 8], // bottom row
  [0, 3, 6], // left column
  [1, 4, 7], // middle column
  [2, 5, 8], // right column
  [0, 4, 8], // diagonal top-left to bottom-right
  [2, 4, 6], // diagonal top-right to bottom-left
]

/**
 * Main BlinkTacToe component
 * Implements the game logic and UI for the Blink Tac Toe game
 */
export default function BlinkTacToe() {
  // State for game board, current player, winner, etc.
  const [gameState, setGameState] = useState<GameState>({ ...initialGameState })

  // State for player information including their emoji categories and placed emojis
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, category: "tech", emojis: [], placedEmojis: [] },
    { id: 2, category: "space", emojis: [], placedEmojis: [] },
  ])

  // State for tracking scores across multiple games
  const [scores, setScores] = useState({ player1: 0, player2: 0 })

  // State for controlling the rules dialog visibility
  const [showRules, setShowRules] = useState(false)

  /**
   * Effect to initialize player emojis when category changes or game starts
   * Shuffles the emojis from the selected category for each player
   */
  useEffect(() => {
    if (gameState.gameStarted) {
      const updatedPlayers = players.map((player) => {
        const category = player.id === 1 ? gameState.player1Category : gameState.player2Category
        const categoryEmojis = [...emojiCategories[category as keyof typeof emojiCategories]]

        // Shuffle the emojis for randomness
        for (let i = categoryEmojis.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[categoryEmojis[i], categoryEmojis[j]] = [categoryEmojis[j], categoryEmojis[i]]
        }

        return {
          ...player,
          category,
          emojis: categoryEmojis,
          placedEmojis: [],
        }
      })

      setPlayers(updatedPlayers)
    }
  }, [gameState.gameStarted, gameState.player1Category, gameState.player2Category])

  /**
   * Get a random emoji for the current player from their category
   * @param playerId - ID of the player (1 or 2)
   * @returns A random emoji from the player's category
   */
  const getRandomEmoji = (playerId: number) => {
    const player = players.find((p) => p.id === playerId)
    if (!player || player.emojis.length === 0) return "❓"

    // Get a random emoji from the player's category
    const randomIndex = Math.floor(Math.random() * player.emojis.length)
    return player.emojis[randomIndex]
  }

  /**
   * Handle cell click event
   * Implements the core game logic including:
   * - Placing emojis on the board
   * - Implementing the vanishing rule (FIFO)
   * - Checking for a winner
   * - Updating the game state
   *
   * @param index - Index of the clicked cell (0-8)
   */
  const handleCellClick = (index: number) => {
    // Don't allow clicks if game is not started, cell is occupied, or game is over
    if (!gameState.gameStarted || gameState.board[index] !== null || gameState.winner !== null) {
      return
    }

    const currentPlayerId = gameState.currentPlayer
    const currentPlayer = players.find((p) => p.id === currentPlayerId)!
    const emoji = getRandomEmoji(currentPlayerId)

    // Create a new board with the placed emoji
    const newBoard = [...gameState.board]
    newBoard[index] = emoji

    // Update player's placed emojis
    const updatedPlayers = players.map((player) => {
      if (player.id === currentPlayerId) {
        const newPlacedEmojis = [...player.placedEmojis, { position: index, emoji }]

        // VANISHING RULE: If player has more than 3 emojis, remove the oldest one (FIFO)
        if (newPlacedEmojis.length > 3) {
          const oldestPosition = newPlacedEmojis[0].position
          newBoard[oldestPosition] = null // Remove the oldest emoji from the board
          return {
            ...player,
            placedEmojis: newPlacedEmojis.slice(1), // Remove the oldest emoji from tracking
          }
        }

        return {
          ...player,
          placedEmojis: newPlacedEmojis,
        }
      }
      return player
    })

    setPlayers(updatedPlayers)

    // Check for winner
    const winResult = checkWinner(newBoard)

    // Update game state
    setGameState({
      ...gameState,
      board: newBoard,
      currentPlayer: currentPlayerId === 1 ? 2 : 1, // Switch to the other player
      winner: winResult.winner,
      winningLine: winResult.winningLine,
    })

    // Trigger confetti if there's a winner
    if (winResult.winner) {
      triggerConfetti()
      // Update scores
      setScores({
        ...scores,
        player1: winResult.winner === 1 ? scores.player1 + 1 : scores.player1,
        player2: winResult.winner === 2 ? scores.player2 + 1 : scores.player2,
      })
    }
  }

  /**
   * Check if there's a winner on the current board
   * @param board - Current state of the game board
   * @returns Object containing winner ID and winning line indices (if any)
   */
  const checkWinner = (board: (string | null)[]) => {
    for (const combo of winningCombinations) {
      const [a, b, c] = combo
      if (board[a] && board[b] && board[c]) {
        // Check if all three positions have emojis from the same player's category
        const isPlayer1Win =
          emojiCategories[gameState.player1Category as keyof typeof emojiCategories].includes(board[a]!) &&
          emojiCategories[gameState.player1Category as keyof typeof emojiCategories].includes(board[b]!) &&
          emojiCategories[gameState.player1Category as keyof typeof emojiCategories].includes(board[c]!)

        const isPlayer2Win =
          emojiCategories[gameState.player2Category as keyof typeof emojiCategories].includes(board[a]!) &&
          emojiCategories[gameState.player2Category as keyof typeof emojiCategories].includes(board[b]!) &&
          emojiCategories[gameState.player2Category as keyof typeof emojiCategories].includes(board[c]!)

        if (isPlayer1Win) {
          return { winner: 1, winningLine: combo }
        } else if (isPlayer2Win) {
          return { winner: 2, winningLine: combo }
        }
      }
    }

    return { winner: null, winningLine: null }
  }

  /**
   * Start a new game with the current category selections
   * Resets the board but keeps the scores and categories
   */
  const startGame = () => {
    setGameState({
      ...gameState,
      board: Array(9).fill(null),
      currentPlayer: 1,
      winner: null,
      winningLine: null,
      gameStarted: true,
    })
  }

  /**
   * Reset the game completely
   * Keeps the category selections but resets the board and game state
   */
  const resetGame = () => {
    setGameState({
      ...initialGameState,
      player1Category: gameState.player1Category,
      player2Category: gameState.player2Category,
    })
    setPlayers([
      { id: 1, category: gameState.player1Category, emojis: [], placedEmojis: [] },
      { id: 2, category: gameState.player2Category, emojis: [], placedEmojis: [] },
    ])
  }

  /**
   * Trigger confetti animation when a player wins
   * Creates a celebratory visual effect
   */
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#00FFFF", "#0070F3", "#00DFD8", "#7928CA", "#50E3C2"],
    })
  }

  /**
   * Handle category change for a player
   * @param playerId - ID of the player (1 or 2)
   * @param category - New category to set for the player
   */
  const handleCategoryChange = (playerId: number, category: string) => {
    if (playerId === 1) {
      setGameState({ ...gameState, player1Category: category })
    } else {
      setGameState({ ...gameState, player2Category: category })
    }
  }

  /**
   * Render a single cell on the game board
   * Includes animations for placing and removing emojis
   * @param index - Index of the cell (0-8)
   */
  const renderCell = (index: number) => {
    const isWinningCell = gameState.winningLine?.includes(index)

    return (
      <motion.div
        key={`cell-${index}`}
        className={`flex items-center justify-center w-24 h-24 rounded-lg text-4xl cursor-pointer transition-all duration-300 ${
          isWinningCell
            ? "bg-gradient-to-br from-green-500 to-emerald-700 border border-green-400 shadow-[0_0_15px_rgba(0,255,0,0.5)]"
            : "bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 hover:border-cyan-500 hover:shadow-[0_0_10px_rgba(0,200,255,0.3)]"
        }`}
        onClick={() => handleCellClick(index)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <AnimatePresence mode="wait">
          {gameState.board[index] && (
            <motion.div
              key={`emoji-${index}-${gameState.board[index]}`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              {gameState.board[index]}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl gap-6">
      {/* Game Title and Description */}
      <div className="flex flex-col items-center justify-center w-full">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 mb-2">
          Blink Tac Toe
        </h1>
        <p className="text-slate-400 text-center mb-4">A twist on the classic game with vanishing emojis!</p>

        {/* Game Rules Button */}
        <div className="flex items-center gap-2 mb-6">
          <Dialog open={showRules} onOpenChange={setShowRules}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-slate-700 bg-slate-800 hover:bg-slate-700">
                <HelpCircle size={16} />
                Game Rules
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-slate-900 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">How to Play Blink Tac Toe</DialogTitle>
                <DialogDescription className="text-slate-400">
                  A twist on the classic Tic Tac Toe game with emojis and a vanishing rule.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <h3 className="font-semibold text-white">Game Setup</h3>
                  <p className="text-sm text-slate-400">
                    Each player selects an emoji category. On their turn, they'll get a random emoji from their
                    category.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Vanishing Rule</h3>
                  <p className="text-sm text-slate-400">
                    Each player can have only 3 emojis on the board at any time. When you place a 4th emoji, your oldest
                    emoji vanishes!
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">Winning</h3>
                  <p className="text-sm text-slate-400">
                    Win by forming a line of 3 of your emojis horizontally, vertically, or diagonally.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-white">No Draws</h3>
                  <p className="text-sm text-slate-400">
                    Because of the vanishing rule, the board will never be completely filled, so the game continues
                    until someone wins.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Game Setup Screen */}
      {!gameState.gameStarted ? (
        <Card className="w-full max-w-md bg-slate-900 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Game Setup</CardTitle>
            <CardDescription className="text-slate-400">Choose emoji categories for each player</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Player 1 Category Selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">Player 1</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(emojiCategories).map((category) => (
                    <Button
                      key={`p1-${category}`}
                      variant={gameState.player1Category === category ? "default" : "outline"}
                      className={`justify-start gap-2 ${
                        gameState.player1Category === category
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                          : "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                      }`}
                      onClick={() => handleCategoryChange(1, category)}
                    >
                      <span className="text-lg">{emojiCategories[category as keyof typeof emojiCategories][0]}</span>
                      <span className="capitalize">{category}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Player 2 Category Selection */}
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-white">Player 2</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(emojiCategories).map((category) => (
                    <Button
                      key={`p2-${category}`}
                      variant={gameState.player2Category === category ? "default" : "outline"}
                      className={`justify-start gap-2 ${
                        gameState.player2Category === category
                          ? "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
                          : "bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                      }`}
                      onClick={() => handleCategoryChange(2, category)}
                      disabled={gameState.player1Category === category}
                    >
                      <span className="text-lg">{emojiCategories[category as keyof typeof emojiCategories][0]}</span>
                      <span className="capitalize">{category}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-lg shadow-blue-900/30"
              onClick={startGame}
            >
              Start Game
            </Button>
          </CardFooter>
        </Card>
      ) : (
        // Game Board Screen
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center">
            {/* Player Information and Turn Indicator */}
            <div className="flex flex-col items-center mb-4">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`px-4 py-2 rounded-full ${
                    gameState.currentPlayer === 1
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold shadow-lg shadow-blue-900/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  Player 1: {emojiCategories[gameState.player1Category as keyof typeof emojiCategories][0]}
                  <span className="ml-2 text-sm">{scores.player1}</span>
                </div>
                <div
                  className={`px-4 py-2 rounded-full ${
                    gameState.currentPlayer === 2
                      ? "bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold shadow-lg shadow-red-900/30"
                      : "bg-slate-800 text-slate-300 border border-slate-700"
                  }`}
                >
                  Player 2: {emojiCategories[gameState.player2Category as keyof typeof emojiCategories][0]}
                  <span className="ml-2 text-sm">{scores.player2}</span>
                </div>
              </div>

              {/* Winner Announcement or Current Turn Indicator */}
              {gameState.winner ? (
                <div className="bg-gradient-to-r from-amber-500 to-yellow-600 p-3 rounded-lg text-white text-center mb-4 shadow-lg shadow-amber-900/30">
                  <div className="flex items-center justify-center gap-2">
                    <Trophy className="text-yellow-100" />
                    <span className="text-xl font-bold">Player {gameState.winner} Wins!</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 border border-slate-700 p-3 rounded-lg text-white text-center mb-4">
                  <span className="text-lg">Player {gameState.currentPlayer}'s Turn</span>
                </div>
              )}
            </div>

            {/* Game Board Grid */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              {Array(9)
                .fill(null)
                .map((_, index) => renderCell(index))}
            </div>

            {/* Game Control Buttons */}
            <div className="mt-6 flex gap-4">
              {gameState.winner && (
                <Button
                  onClick={startGame}
                  className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-lg shadow-green-900/30"
                >
                  Play Again
                </Button>
              )}
              <Button
                variant="outline"
                onClick={resetGame}
                className="gap-2 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
              >
                <RotateCcw size={16} />
                Reset Game
              </Button>
            </div>
          </div>

          {/* Game Info Panel */}
          <div className="bg-slate-800 p-4 rounded-lg max-w-xs border border-slate-700 shadow-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Game Info</h3>
            <div className="space-y-3 text-slate-300 text-sm">
              {/* Player 1 Info */}
              <div>
                <strong>Player 1:</strong> {gameState.player1Category} emojis
                <div className="flex flex-wrap gap-1 mt-1">
                  {emojiCategories[gameState.player1Category as keyof typeof emojiCategories]
                    .slice(0, 5)
                    .map((emoji, i) => (
                      <span key={`p1-emoji-${i}`} className="text-lg">
                        {emoji}
                      </span>
                    ))}
                </div>
              </div>

              {/* Player 2 Info */}
              <div>
                <strong>Player 2:</strong> {gameState.player2Category} emojis
                <div className="flex flex-wrap gap-1 mt-1">
                  {emojiCategories[gameState.player2Category as keyof typeof emojiCategories]
                    .slice(0, 5)
                    .map((emoji, i) => (
                      <span key={`p2-emoji-${i}`} className="text-lg">
                        {emoji}
                      </span>
                    ))}
                </div>
              </div>

              {/* Game Rules Summary */}
              <div>
                <strong>Vanishing Rule:</strong> When you place your 4th emoji, your oldest emoji disappears!
              </div>
              <div>
                <strong>Win:</strong> Form a line of 3 of your emojis (horizontally, vertically, or diagonally).
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
