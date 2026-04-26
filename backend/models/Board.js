const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema({
  timestamp:   { type: Date, default: Date.now },
  savedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  canvasState: { type: String }, // JSON string of Fabric.js canvas
});

const boardSchema = new mongoose.Schema({
  title:     { type: String, required: true, default: 'Untitled Board' },
  owner:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  canvasState: { type: String, default: '{}' },  // live Fabric.js JSON
  revisions:   { type: [revisionSchema], default: [] },
  inviteToken: { type: String, unique: true, sparse: true },
  permissions: {
    public:    { type: String, enum: ['none', 'view', 'edit'], default: 'none' },
    users: [{
      user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      permission: { type: String, enum: ['view', 'edit'], default: 'view' },
    }],
  },
  lastSaved: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Board', boardSchema);