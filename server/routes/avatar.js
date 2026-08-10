import express from 'express'
import avatarService from '../service/avatarService.js'

const router = express.Router()

// Create or prepare a run
router.post('/run/:runId/create', async (req, res) => {
  try {
    const run = await avatarService.createRun(req.params.runId)
    res.json({ ok: true, run })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Start run (server authority)
router.post('/run/:runId/start', async (req, res) => {
  try {
    const run = await avatarService.startRun(req.params.runId)
    res.json({ ok: true, run })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Place bet
router.post('/run/:runId/bet', async (req, res) => {
  try {
    const { userId, stake } = req.body
    if (!userId || !stake) return res.status(400).json({ ok: false, error: 'userId and stake required' })
    const bet = await avatarService.placeBet(req.params.runId, userId, stake)
    res.json({ ok: true, bet })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

// Cash out
router.post('/run/:runId/cashout', async (req, res) => {
  try {
    const { betId } = req.body
    if (!betId) return res.status(400).json({ ok: false, error: 'betId required' })
    const result = await avatarService.cashOut(req.params.runId, betId)
    res.json({ ok: true, result })
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message })
  }
})

export default router
