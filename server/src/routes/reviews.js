const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const { authenticate, allowRoles } = require('../middleware/auth');
const { asyncHandler, isValidObjectId } = require('../utils/http');

const router = express.Router();
router.use(authenticate);

function validateReviewInput(rating, content) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'Rating must be a whole number from 1 to 5.';
  }
  if (typeof content !== 'string' || content.trim().length < 3 || content.trim().length > 2000) {
    return 'Review content must be between 3 and 2000 characters.';
  }
  return null;
}

router.post('/restaurants/:restaurantId/reviews', allowRoles('customer'), asyncHandler(async (req, res) => {
  const { restaurantId } = req.params;
  if (!isValidObjectId(restaurantId)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const validationError = validateReviewInput(req.body.rating, req.body.content);
  if (validationError) return res.status(400).json({ message: validationError });
  if (!(await Restaurant.exists({ _id: restaurantId }))) return res.status(404).json({ message: 'Restaurant not found.' });
  const existing = await Review.exists({ customer: req.user._id, restaurant: restaurantId });
  if (existing) return res.status(409).json({ message: 'You have already reviewed this restaurant. Update your existing review instead.' });
  const review = await Review.create({
    customer: req.user._id,
    restaurant: restaurantId,
    rating: Number(req.body.rating),
    content: req.body.content.trim()
  });
  res.status(201).json({ review });
}));

module.exports = router;
module.exports.validateReviewInput = validateReviewInput;

router.patch('/:id', allowRoles('customer'), asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid review ID.' });
  const validationError = validateReviewInput(req.body.rating, req.body.content);
  if (validationError) return res.status(400).json({ message: validationError });
  const review = await Review.findOneAndUpdate(
    { _id: req.params.id, customer: req.user._id },
    { rating: Number(req.body.rating), content: req.body.content.trim() },
    { new: true, runValidators: true }
  );
  if (!review) return res.status(404).json({ message: 'Review not found or you do not own this review.' });
  res.json({ review });
}));

router.delete('/:id', allowRoles('customer', 'administrator'), asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid review ID.' });
  const filter = { _id: req.params.id };
  if (req.user.role === 'customer') filter.customer = req.user._id;
  const review = await Review.findOneAndDelete(filter);
  if (!review) return res.status(404).json({ message: 'Review not found or you do not own this review.' });
  res.json({ message: 'Review deleted.' });
}));

router.get('/restaurants/:restaurantId', allowRoles('administrator'), asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.restaurantId)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const reviews = await Review.find({ restaurant: new mongoose.Types.ObjectId(req.params.restaurantId) })
    .populate('customer', 'name email')
    .populate('restaurant', 'name')
    .sort({ createdAt: -1 });
  res.json({ reviews });
}));
