const express = require('express');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const { authenticate, allowRoles } = require('../middleware/auth');
const { asyncHandler } = require('../utils/http');

const router = express.Router();
router.use(authenticate, allowRoles('owner'));

router.get('/restaurant', asyncHandler(async (req, res) => {
  const restaurant = await Restaurant.findOne({ owner: req.user._id }).lean();
  if (!restaurant) return res.status(404).json({ message: 'No restaurant is assigned to your account.' });
  const [stats, reviews] = await Promise.all([
    Review.aggregate([
      { $match: { restaurant: restaurant._id } },
      { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]),
    Review.find({ restaurant: restaurant._id }).populate('customer', 'name email').sort({ createdAt: -1 })
  ]);
  res.json({
    restaurant: { ...restaurant, averageRating: stats[0]?.averageRating ?? null, reviewCount: stats[0]?.reviewCount ?? 0 },
    reviews
  });
}));

router.patch('/restaurant', asyncHandler(async (req, res) => {
  const permitted = ['name', 'location', 'address', 'cuisine', 'description', 'phone'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => permitted.includes(key)));
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'Provide at least one permitted restaurant field to update.' });
  const restaurant = await Restaurant.findOneAndUpdate({ owner: req.user._id }, updates, {
    new: true,
    runValidators: true
  });
  if (!restaurant) return res.status(404).json({ message: 'No restaurant is assigned to your account.' });
  res.json({ restaurant });
}));

module.exports = router;
