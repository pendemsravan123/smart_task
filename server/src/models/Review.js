const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be between 1 and 5.'],
      max: [5, 'Rating must be between 1 and 5.'],
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number from 1 to 5.' }
    },
    content: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 }
  },
  { timestamps: true }
);

reviewSchema.index({ customer: 1, restaurant: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
