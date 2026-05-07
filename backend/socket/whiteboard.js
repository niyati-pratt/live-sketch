const Board = require('../models/Board');
const jwt   = require('jsonwebtoken');

const rooms      = new Map();
const stateCache = new Map();
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
          $slice: -50,
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
  for (const boardId of stateCache.keys()) saveBoard(boardId);
}, AUTO_SAVE_INTERVAL);

module.exports = (io) => {
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

    socket.on('join-board', async ({ boardId }) => {
      try {
        const board = await Board.findById(boardId).populate('owner', 'username color');
        if (!board) return socket.emit('error', { message: 'Board not found' });

        socket.join(boardId);
        socket.boardId = boardId;

        if (!rooms.has(boardId)) rooms.set(boardId, new Set());
        rooms.get(boardId).add(socket.id);

        if (!stateCache.has(boardId)) {
          stateCache.set(boardId, {
            canvasState: board.canvasState || '{}',
            dirty: false,
            lastEditorId: null,
          });
        }

        socket.emit('board-state', {
          canvasState: stateCache.get(boardId).canvasState,
          boardTitle: board.title,
        });

        socket.to(boardId).emit('user-joined', {
          userId: socket.userId, username: socket.username, socketId: socket.id,
        });

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

    socket.on('canvas-delta', ({ boardId, delta, fullState }) => {
      // KEY FIX: include fullState INSIDE the delta object when broadcasting
      // so the receiving client can do a full canvas reload
      const deltaWithState = {
        ...delta,
        fullState: fullState ? JSON.parse(fullState) : null,
      };

      socket.to(boardId).emit('canvas-delta', {
        delta: deltaWithState,
        from: socket.id,
      });

      // Update cache for auto-save
      if (fullState && stateCache.has(boardId)) {
        const cached = stateCache.get(boardId);
        cached.canvasState  = fullState;
        cached.dirty        = true;
        cached.lastEditorId = socket.userId;
      }
    });

    socket.on('cursor-move', ({ boardId, x, y }) => {
      socket.to(boardId).emit('cursor-move', {
        socketId: socket.id, userId: socket.userId,
        username: socket.username, color: socket.color || '#3b82f6',
        x, y,
      });
    });

    socket.on('save-board', async ({ boardId }) => {
      await saveBoard(boardId);
      socket.emit('board-saved', { timestamp: new Date() });
    });

    socket.on('disconnect', () => {
      const boardId = socket.boardId;
      if (boardId && rooms.has(boardId)) {
        rooms.get(boardId).delete(socket.id);
        socket.to(boardId).emit('user-left', { socketId: socket.id, userId: socket.userId });
        if (rooms.get(boardId).size === 0) {
          saveBoard(boardId);
          rooms.delete(boardId);
        }
      }
      console.log(`[socket] Disconnected: ${socket.id}`);
    });
  });
};