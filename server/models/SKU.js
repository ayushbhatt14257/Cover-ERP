const mongoose = require('mongoose');

const skuSchema = new mongoose.Schema({
  // Display name e.g. "Sam A55"
  name: { type: String, required: true, trim: true },
  // Normalised token for fast search e.g. "sama55"
  searchToken: { type: String, required: true, lowercase: true },
  brand: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Compound index for fast prefix search
skuSchema.index({ searchToken: 1 });
skuSchema.index({ name: 'text' });
skuSchema.index({ isActive: 1, name: 1 });

// Auto-generate search token before save
skuSchema.pre('save', function (next) {
  this.searchToken = this.name.toLowerCase().replace(/\s+/g, '');
  next();
});

module.exports = mongoose.model('SKU', skuSchema);
