const test = require('node:test');
const assert = require('node:assert/strict');
const Review = require('../src/models/Review');
const User = require('../src/models/User');
const { validateReviewInput } = require('../src/routes/reviews');

test('review endpoint accepts only whole numeric ratings from 1 to 5', () => {
  for (const rating of [1, 2, 3, 4, 5]) {
    assert.equal(validateReviewInput(rating, 'A lovely dinner.'), null);
  }
  for (const rating of [0, 6, -1, 3.5, '', '4', 'not a number', null, true]) {
    assert.match(validateReviewInput(rating, 'A lovely dinner.'), /whole number from 1 to 5/);
  }
});

test('review endpoint requires trimmed content of 3 to 2000 characters', () => {
  assert.match(validateReviewInput(4, '  '), /Review content/);
  assert.match(validateReviewInput(4, 'ok'), /Review content/);
  assert.match(validateReviewInput(4, 'x'.repeat(2001)), /Review content/);
  assert.equal(validateReviewInput(4, '  good food  '), null);
});

test('review schema has a unique customer/restaurant pair index', () => {
  assert.ok(Review.schema.indexes().some(([fields, options]) =>
    fields.customer === 1 && fields.restaurant === 1 && options.unique === true
  ));
});

test('review schema rejects fractional and out-of-range ratings', () => {
  const validIds = { customer: new User()._id, restaurant: new Review()._id };
  for (const rating of [0, 6, 3.5]) {
    const review = new Review({ ...validIds, rating, content: 'A thoughtful review.' });
    assert.ok(review.validateSync().errors.rating);
  }
  const valid = new Review({ ...validIds, rating: 5, content: 'A thoughtful review.' });
  assert.equal(valid.validateSync(), undefined);
});

test('user schema enforces the password complexity rule', () => {
  const valid = new User({ name: 'Alex User', email: 'alex@example.com', password: 'StrongPass1!' });
  assert.equal(valid.validateSync(), undefined);
  for (const password of ['short', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoNumber!!', 'MissingSpecial1', 'LongPassword123456!']) {
    const user = new User({ name: 'Alex User', email: 'alex@example.com', password });
    assert.ok(user.validateSync().errors.password, `${password} should be rejected`);
  }
});
