const express = require('express');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const { authenticate, allowRoles } = require('../middleware/auth');
const { asyncHandler, escapeRegex, isValidObjectId } = require('../utils/http');

const router = express.Router();
router.use(authenticate, allowRoles('administrator'));

router.get('/dashboard', asyncHandler(async (req, res) => {
  const [totalUsers, totalRestaurants, reviewStats] = await Promise.all([
    User.countDocuments(),
    Restaurant.countDocuments(),
    Review.aggregate([
      { $group: { _id: null, totalReviews: { $sum: 1 }, averageRating: { $avg: '$rating' } } }
    ])
  ]);
  res.json({
    totalUsers,
    totalRestaurants,
    totalReviews: reviewStats[0]?.totalReviews ?? 0,
    averageRating: reviewStats[0]?.averageRating ?? null
  });
}));

router.get('/users', asyncHandler(async (req, res) => {
  const filter = {};
  if (['administrator', 'customer', 'owner'].includes(req.query.role)) filter.role = req.query.role;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const search = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: search }, { email: search }];
  }
  const users = await User.find(filter).select('name email role createdAt').sort({ createdAt: -1 }).limit(200);
  res.json({ users });
}));

router.post('/owners', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email, and password are required.' });
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (await User.exists({ email: normalizedEmail })) return res.status(409).json({ message: 'An account with this email already exists.' });
  const owner = await User.create({ name, email: normalizedEmail, password, role: 'owner' });
  res.status(201).json({ user: { id: owner.id, name: owner.name, email: owner.email, role: owner.role } });
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user ID.' });
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot modify your own administrator account.' });
  const updates = {};
  if (typeof req.body.name === 'string') updates.name = req.body.name;
  if (['administrator', 'customer', 'owner'].includes(req.body.role)) updates.role = req.body.role;
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'Provide a valid name or role.' });
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('name email role');
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ user });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid user ID.' });
  if (req.params.id === req.user.id) return res.status(400).json({ message: 'You cannot delete your own administrator account.' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  await Promise.all([
    Restaurant.updateMany({ owner: user._id }, { $set: { owner: null } }),
    Review.deleteMany({ customer: user._id }),
    user.deleteOne()
  ]);
  res.json({ message: 'User and their reviews were deleted. Assigned restaurants are now unassigned.' });
}));

router.get('/restaurants', asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    const search = new RegExp(escapeRegex(req.query.search.trim()), 'i');
    filter.$or = [{ name: search }, { location: search }, { cuisine: search }];
  }
  const restaurants = await Restaurant.find(filter).populate('owner', 'name email').sort({ name: 1 }).limit(200);
  res.json({ restaurants });
}));

router.post('/restaurants', asyncHandler(async (req, res) => {
  const { name, location, address, cuisine, description, phone, owner } = req.body;
  if (!name || !location || !address || !cuisine) {
    return res.status(400).json({ message: 'Name, location, address, and cuisine are required.' });
  }
  if (owner && !isValidObjectId(owner)) return res.status(400).json({ message: 'Invalid owner ID.' });
  if (owner && !(await User.exists({ _id: owner, role: 'owner' }))) {
    return res.status(400).json({ message: 'The assigned account must be a restaurant owner.' });
  }
  const restaurant = await Restaurant.create({ name, location, address, cuisine, description, phone, owner: owner || null });
  res.status(201).json({ restaurant });
}));

router.patch('/restaurants/:id', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const permitted = ['name', 'location', 'address', 'cuisine', 'description', 'phone'];
  const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => permitted.includes(key)));
  if (Object.prototype.hasOwnProperty.call(req.body, 'owner')) {
    if (req.body.owner && !isValidObjectId(req.body.owner)) return res.status(400).json({ message: 'Invalid owner ID.' });
    if (req.body.owner && !(await User.exists({ _id: req.body.owner, role: 'owner' }))) {
      return res.status(400).json({ message: 'The assigned account must be a restaurant owner.' });
    }
    updates.owner = req.body.owner || null;
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: 'Provide restaurant fields to update.' });
  const restaurant = await Restaurant.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).populate('owner', 'name email');
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
  res.json({ restaurant });
}));

router.delete('/restaurants/:id', asyncHandler(async (req, res) => {
  if (!isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid restaurant ID.' });
  const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
  if (!restaurant) return res.status(404).json({ message: 'Restaurant not found.' });
  await Review.deleteMany({ restaurant: restaurant._id });
  res.json({ message: 'Restaurant and its reviews were deleted.' });
}));

router.get('/reviews', asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.restaurant && isValidObjectId(req.query.restaurant)) filter.restaurant = req.query.restaurant;
  const reviews = await Review.find(filter)
    .populate('customer', 'name email')
    .populate('restaurant', 'name location')
    .sort({ createdAt: -1 })
    .limit(300);
  res.json({ reviews });
}));

module.exports = router;
