const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    location: { type: String, required: true, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 240 },
    cuisine: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    phone: { type: String, trim: true, maxlength: 30, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  },
  { timestamps: true }
);

restaurantSchema.index({ name: 'text', location: 'text', cuisine: 'text' });

module.exports = mongoose.model('Restaurant', restaurantSchema);
