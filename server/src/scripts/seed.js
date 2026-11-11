require('dotenv').config();
const connectDatabase = require('../config/db');
const mongoose = require('mongoose');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');

async function ensureUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ email: normalizedEmail });
  if (!user) user = await User.create({ name, email: normalizedEmail, password, role });
  return user;
}

async function seed() {
  if (process.env.NODE_ENV === 'production' &&
      (!process.env.SEED_ADMIN_PASSWORD || !process.env.SEED_OWNER_PASSWORD || !process.env.SEED_CUSTOMER_PASSWORD)) {
    throw new Error('Production seeding requires explicit SEED_*_PASSWORD values.');
  }
  await connectDatabase();
  try {
    const admin = await ensureUser({
      name: 'Platform Admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
      role: 'administrator'
    });
    const owner = await ensureUser({
      name: 'Restaurant Owner',
      email: process.env.SEED_OWNER_EMAIL || 'owner@example.com',
      password: process.env.SEED_OWNER_PASSWORD || 'Owner123!',
      role: 'owner'
    });
    await ensureUser({
      name: 'Sample Customer',
      email: process.env.SEED_CUSTOMER_EMAIL || 'customer@example.com',
      password: process.env.SEED_CUSTOMER_PASSWORD || 'Customer123!',
      role: 'customer'
    });
    if (!(await Restaurant.exists({ owner: owner._id }))) {
      await Restaurant.create({
        name: 'The Garden Table',
        location: 'Central District',
        address: '12 Market Street',
        cuisine: 'Modern European',
        description: 'Seasonal dishes made with locally sourced ingredients.',
        phone: '+1 555 0100',
        owner: owner._id
      });
    }
    console.log(`Seed complete. Admin account: ${admin.email}`);
    console.log('Development credentials are documented in README.md; change them before deployment.');
  } finally {
    await mongoose.disconnect();
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
});
