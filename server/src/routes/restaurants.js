const express = require('express');
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const { optionalAuthenticate } = require('../middleware/auth');
const { asyncHandler, escapeRegex, isValidObjectId } = require('../utils/http');

const router = express.Router();

async function ratingStats(restaurantIds) {
  const rows = await Review.aggregate([
    { $match: { restaurant: { $in: restaurantIds } } },
    { $group: { _id: '$restaurant', average: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  return new Map(rows.map((row) => [row._id.toString(), { averageRating: row.average, reviewCount: row.count }]));
}

router.get('/', optionalAuthenticate, asyncHandler(async (req, res) => {
  const filter = {};
  for (const field of ['search', 'location', 'cuisine']) {
    const value = typeof req.query[field] === 'string' ? req.query[field].trim() : '';
    if (!value) continue;
    const key = field === 'search' ? 'name' : field;
    filter[key] = { $regex: escapeRegex(value), $options: 'i' };
  }
  const restaurants = await Restaurant.find(filter).sort({ name: 1 }).limit(100).lean();
  const stats = await ratingStats(restaurants.map((item) => item._id));
  const ownReviews = req.user?.role === 'customer'
    ? await Review.find({ customer: req.user._id, restaurant: { $in: restaurants.map((item) => item._id) } }).select('restaurant rating').lean()
    : [];
  const ownRatings = new Map(ownReviews.map((review) => [review.restaurant.toString(), review.rating]));
  res.json({ restaurants: restaurants.map((item) => ({
    ...item,
    ...(stats.get(item._id.toString()) || { averageRating: null, reviewCount: 0 }),
    customerRating: ownRatings.get(item._id.toString()) ?? null
  })) });
}));

router.get('/:id/distribution', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const restaurantId = new mongoose.Types.ObjectId(req.params.id);
  const restaurant = await Restaurant.exists({ _id: restaurantId });
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
  const rows = await Review.aggregate([
    { $match: { restaurant: restaurantId } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);
  const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
  rows.forEach((row) => { distribution[row._id] = row.count; });
  res.json({ distribution });
}));

router.get('/:id', optionalAuthenticate, asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const restaurant = await Restaurant.findById(req.params.id).lean();
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
  const [stats, reviews, ownReview] = await Promise.all([
    ratingStats([restaurant._id]),
    Review.find({ restaurant: restaurant._id })
      .sort({ createdAt: -1 })
      .populate('customer', 'name')
      .select('customer rating content createdAt updatedAt')
      .lean(),
    req.user?.role === 'customer'
      ? Review.findOne({ restaurant: restaurant._id, customer: req.user._id }).select('_id rating content').lean()
      : null
  ]);
  res.json({
    restaurant: { ...restaurant, ...(stats.get(restaurant._id.toString()) || { averageRating: null, reviewCount: 0 }) },
    reviews,
    customerReview: ownReview || null
  });
}));

module.exports = router;
