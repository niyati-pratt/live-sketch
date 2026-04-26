const Board = require('../models/Board');
const jwt   = require('jsonwebtoken');

// boardId → Set of socket ids present
const rooms = new Map();
// boardId → { canvasState, dirty }
const stateCache = new Map();

// Auto-save every 30 seconds
const AUTO_SAVE_INTERVAL = 30_000;

async function saveBoard(boardId) {
  const cached = stateCache.get(boardId);
  if (!cached || !cached.dirty) return;
  try {
    await Board.findByIdAndUpdate(boardId, {
      canvasState: cached.canvasState,
      lastSaved: new Date(),
      $push: {
        revisions: {
          $each: [{ canvasState: cached.canvasState, savedBy: cached.lastEditorId }],
          $slice: -50,  // keep latest 50 revisions
        },
      },
    });
    cached.dirty = false;
    console.log(`[autosave] Board ${boardId} saved`);
  } catch (err) {
    console.error(`[autosave] Failed to save board ${boardId}:`, err.message);
  }
}

setInterval(() => {
  for (const boardId of stateCache.keys()) {
    saveBoard(boardId);
  }
}, AUTO_SAVE_INTERVAL);

module.exports = (io) => {
  // Auth middleware for Socket.io
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.id;
      socket.username = decoded.username || 'Anonymous';
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[socket] Connected: ${socket.id}`);

    // ── Join board room ───────────────────────────────────────────────────────
    socket.on('join-board', async ({ boardId, token }) => {
      try {
        const board = await Board.findById(boardId).populate('owner', 'username color');
        if (!board) return socket.emit('error', { message: 'Board not found' });

        socket.join(boardId);
        socket.boardId = boardId;

        if (!rooms.has(boardId)) rooms.set(boardId, new Set());
        rooms.get(boardId).add(socket.id);

        // Load state from cache or DB
        if (!stateCache.has(boardId)) {
          stateCache.set(boardId, {
            canvasState: board.canvasState || '{}',
            dirty: false,
            lastEditorId: null,
          });
        }

        // Send current canvas state to the joining user
        socket.emit('board-state', {
          canvasState: stateCache.get(boardId).canvasState,
          boardTitle: board.title,
        });

        // Notify others of new presence
        socket.to(boardId).emit('user-joined', {
          userId:   socket.userId,
          username: socket.username,
          socketId: socket.id,
        });

        // Broadcast updated presence list
        io.to(boardId).emit('presence-update', {
          users: [...(rooms.get(boardId) || [])].map(sid => {
            const s = io.sockets.sockets.get(sid);
            return s ? { socketId: sid, userId: s.userId, username: s.username, color: s.color } : null;
          }).filter(Boolean),
        });
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    // ── Canvas delta broadcast ────────────────────────────────────────────────
    // Delta: minimal change event (add/modify/remove object, or full state)
    socket.on('canvas-delta', ({ boardId, delta, fullState }) => {
      // Broadcast delta to all OTHER users in the room
      socket.to(boardId).emit('canvas-delta', { delta, from: socket.id });

      // Update cache
      if (fullState && stateCache.has(boardId)) {
        const cached = stateCache.get(boardId);
        cached.canvasState  = fullState;
        cached.dirty        = true;
        cached.lastEditorId = socket.userId;
      }
    });

    // ── Cursor position ──────────────────────────────────────────────────────
    socket.on('cursor-move', ({ boardId, x, y }) => {
      socket.to(boardId).emit('cursor-move', {
        socketId: socket.id,
        userId:   socket.userId,
        username: socket.username,
        color:    socket.color || '#3b82f6',
        x, y,
      });
    });

    // ── Manual save trigger ──────────────────────────────────────────────────
    socket.on('save-board', async ({ boardId }) => {
      await saveBoard(boardId);
      socket.emit('board-saved', { timestamp: new Date() });
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const boardId = socket.boardId;
      if (boardId && rooms.has(boardId)) {
        rooms.get(boardId).delete(socket.id);
        socket.to(boardId).emit('user-left', { socketId: socket.id, userId: socket.userId });
        if (rooms.get(boardId).size === 0) {
          saveBoard(boardId); // final save when room empties
          rooms.delete(boardId);
        }
      }
      console.log(`[socket] Disconnected: ${socket.id}`);
    });
  });
};