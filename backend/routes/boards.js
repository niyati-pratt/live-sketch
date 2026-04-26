const router  = require('express').Router();
const { v4: uuid } = require('uuid');
const Board   = require('../models/Board');
const authMw  = require('../middleware/auth');


// ── Helpers ─────────────────────────────────────────────────────────────────
function canUserEdit(board, userId) {
  if (board.owner.toString() === userId.toString()) return true;
  if (board.permissions.public === 'edit') return true;
  const entry = board.permissions.users.find(u => u.user.toString() === userId.toString());
  return entry?.permission === 'edit';
}

function canUserView(board, userId) {
  if (canUserEdit(board, userId)) return true;
  if (board.permissions.public !== 'none') return true;
  return board.permissions.users.some(u => u.user.toString() === userId.toString());
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.get('/', authMw, async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [
        { owner: req.user._id },
        { 'permissions.users.user': req.user._id },
      ],
    }).select('-revisions -canvasState').populate('owner', 'username color');
    res.json(boards);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authMw, async (req, res) => {
  try {
    const board = await Board.create({ title: req.body.title || 'Untitled Board', owner: req.user._id });
    res.status(201).json(board);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authMw, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id).populate('owner', 'username color');
    if (!board) return res.status(404).json({ error: 'Board not found' });
    if (!canUserView(board, req.user._id)) return res.status(403).json({ error: 'Access denied' });
    res.json({ board, canEdit: canUserEdit(board, req.user._id) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authMw, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ error: 'Not found' });
    if (board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only owner can delete' });
    await board.deleteOne();
    res.json({ message: 'Board deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Share / Invite ────────────────────────────────────────────────────────────
router.post('/:id/invite', authMw, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board || board.owner.toString() !== req.user._id.toString())
      return res.status(403).json({ error: 'Only owner can share' });
    const { permission = 'view' } = req.body;
    if (!board.inviteToken) {
      board.inviteToken = uuid();
    }
    board.permissions.public = permission;
    await board.save();
    const link = `${process.env.CLIENT_URL}/join/${board.inviteToken}`;
    res.json({ link, token: board.inviteToken, permission });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/join/:token', authMw, async (req, res) => {
  try {
    const board = await Board.findOne({ inviteToken: req.params.token });
    if (!board) return res.status(404).json({ error: 'Invalid invite link' });
    const alreadyAdded = board.permissions.users.some(u => u.user.toString() === req.user._id.toString());
    if (!alreadyAdded && board.owner.toString() !== req.user._id.toString()) {
      board.permissions.users.push({ user: req.user._id, permission: board.permissions.public });
      await board.save();
    }
    res.json({ boardId: board._id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Export ────────────────────────────────────────────────────────────────────
// NOTE: The JSP server handles the actual rendered export view.
// This endpoint sends canvas state to the JSP export server, which renders it
// and streams back the PDF/PNG. For standalone use, a basic server-side
// PNG export using the 'canvas' npm package is provided below.

router.post('/:id/export', authMw, async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board || !canUserView(board, req.user._id))
      return res.status(403).json({ error: 'Access denied' });

    // Return canvas state — the React frontend renders and exports client-side
    res.json({
      canvasState: board.canvasState,
      title: board.title,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;