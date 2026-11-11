import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api, queryString } from './api';
import { useAuth } from './auth';

const passwordPattern = '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,16}$';

function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  function logout() {
    signOut();
    navigate('/');
  }
  const dashboardPath = user?.role === 'administrator' ? '/admin' : user?.role === 'owner' ? '/owner' : '/';

  return (
    <header className="topbar">
      <Link to="/" className="brand"><span className="brand-mark">t</span> tabletalk<span className="brand-dot">.</span></Link>
      <nav className="nav-links">
        <Link to="/">Discover</Link>
        {user && user.role !== 'customer' && <Link to={dashboardPath}>Dashboard</Link>}
        {user ? (
          <div className="user-menu"><span className="user-greeting">Hi, {user.name.split(' ')[0]}</span><button className="button button-quiet" onClick={logout}>Sign out</button></div>
        ) : <Link className="button button-dark nav-signin" to="/login">Sign in</Link>}
      </nav>
    </header>
  );
}

function Notice({ message, type = 'error' }) {
  return message ? <div className={`notice ${type}`} role="status">{message}</div> : null;
}

function Rating({ value, count }) {
  if (!count) return <span className="muted">No ratings yet</span>;
  return <span className="rating"><span className="stars">★</span> {Number(value).toFixed(1)} <span className="muted">({count} {count === 1 ? 'review' : 'reviews'})</span></span>;
}

function RestaurantCard({ restaurant }) {
  return (
    <Link to={`/restaurants/${restaurant._id}`} className="restaurant-card">
      <div className="card-art"><span>{restaurant.cuisine?.slice(0, 1).toUpperCase()}</span><small>{restaurant.cuisine}</small></div>
      <div className="card-copy">
        <div className="card-heading"><h3>{restaurant.name}</h3><span className="rating-value">{restaurant.averageRating ? Number(restaurant.averageRating).toFixed(1) : '—'} <span>★</span></span></div>
        <p>{restaurant.location} <span className="bullet">·</span> {restaurant.cuisine}</p>
        <div className="card-footer">{restaurant.reviewCount ? `${restaurant.reviewCount} ${restaurant.reviewCount === 1 ? 'review' : 'reviews'}` : 'Be the first to review'}{restaurant.customerRating && <span className="own-rating">Your rating: {restaurant.customerRating}★</span>}</div>
      </div>
    </Link>
  );
}

function DiscoverPage() {
  const [filters, setFilters] = useState({ search: '', location: '', cuisine: '' });
  const [applied, setApplied] = useState({});
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const { token } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/restaurants${queryString(applied) ? `?${queryString(applied)}` : ''}`, { token })
      .then((data) => { if (active) { setRestaurants(data.restaurants); setError(''); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, retry, token]);

  function submit(event) {
    event.preventDefault();
    setApplied({ ...filters });
  }

  return (
    <>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow"><span className="eyebrow-line" /> A GOOD MEAL STARTS HERE</span>
          <h1>Find a table<br /><em>worth talking about.</em></h1>
          <p>Honest reviews from people who love good food. Discover your next neighborhood favorite.</p>
          <a className="button button-lime" href="#restaurants">Explore restaurants <span>↘</span></a>
        </div>
        <div className="hero-side"><span className="hero-number">01</span><span className="hero-vertical">LOCAL SPOTS. REAL PEOPLE. GREAT FOOD.</span><span className="hero-star">✳</span></div>
      </section>

      <main className="main-content" id="restaurants">
        <div className="section-heading">
          <div><span className="eyebrow eyebrow-dark">THE NEIGHBORHOOD GUIDE</span><h2>Places to <em>love.</em></h2></div>
          <span className="results-note">{restaurants.length} spots to explore</span>
        </div>
        <form className="filter-bar" onSubmit={submit}>
          <label className="search-field"><span>⌕</span><input aria-label="Restaurant name" placeholder="Restaurant name" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
          <label><span className="filter-label">LOCATION</span><input aria-label="Location" placeholder="Any neighborhood" value={filters.location} onChange={(event) => setFilters({ ...filters, location: event.target.value })} /></label>
          <label><span className="filter-label">CUISINE</span><input aria-label="Cuisine" placeholder="Any cuisine" value={filters.cuisine} onChange={(event) => setFilters({ ...filters, cuisine: event.target.value })} /></label>
          <button className="button button-dark" type="submit">Find a spot <span>↗</span></button>
        </form>
        <Notice message={error} />
        {loading ? <p className="empty-state">Finding the good stuff…</p> : error ? (
          <div className="empty-state"><h3>Restaurants are taking a moment.</h3><p>Check the API connection, then try again.</p><button className="button button-dark retry-button" onClick={() => setRetry((value) => value + 1)}>Try again <span>↻</span></button></div>
        ) : restaurants.length ? (
          <div className="restaurant-grid">{restaurants.map((restaurant) => <RestaurantCard key={restaurant._id} restaurant={restaurant} />)}</div>
        ) : <div className="empty-state"><span className="empty-icon">⌕</span><h3>No spots found just yet.</h3><p>Try a different name, neighborhood, or cuisine.</p></div>}
      </main>
      <footer className="footer"><Link to="/" className="brand">tabletalk<span className="brand-dot">.</span></Link><span>Made for people who love a good meal.</span><span>© {new Date().getFullYear()} TableTalk</span></footer>
    </>
  );
}

function AuthPage({ mode }) {
  const { signIn, register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'register') await register(form);
      else await signIn({ email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-aside"><span className="eyebrow"><span className="eyebrow-line" /> GOOD TASTE, SHARED</span><h1>Your next<br />great meal<br /><em>starts here.</em></h1><p>Find the places locals love and share the ones you do, too.</p></div>
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow eyebrow-dark">{mode === 'register' ? 'JOIN THE TABLE' : 'WELCOME BACK'}</span>
        <h2>{mode === 'register' ? 'Create your account' : 'Sign in to TableTalk'}</h2>
        <p className="form-subtitle">{mode === 'register' ? 'Keep track of your favorite spots and reviews.' : 'Your favorite neighborhood spots are waiting.'}</p>
        <Notice message={error} />
        {mode === 'register' && <label>Your name<input required minLength="2" maxLength="80" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>}
        <label>Email address<input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
        <label>Password<input required type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 8 : undefined} maxLength={mode === 'register' ? 16 : undefined} pattern={mode === 'register' ? passwordPattern : undefined} title={mode === 'register' ? '8–16 characters, with uppercase, lowercase, a number, and a special character.' : undefined} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />{mode === 'register' && <small className="field-hint">8–16 characters, including upper/lowercase, a number, and a symbol.</small>}</label>
        <button className="button button-dark button-wide" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : 'Sign in'} <span>↗</span></button>
        <p className="switch-auth">{mode === 'register' ? 'Already a member?' : 'New to TableTalk?'} <Link to={mode === 'register' ? '/login' : '/register'}>{mode === 'register' ? 'Sign in' : 'Create an account'}</Link></p>
      </form>
    </main>
  );
}

function ReviewForm({ initial, onSave, onCancel }) {
  const [rating, setRating] = useState(initial?.rating || 5);
  const [content, setContent] = useState(initial?.content || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSave({ rating, content });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="review-form" onSubmit={submit}>
      <Notice message={error} />
      <label>Your rating <span className="muted">— choose 1 to 5 stars</span>
        <select value={rating} onChange={(event) => setRating(Number(event.target.value))}>{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}</select>
      </label>
      <label>Your review<textarea required minLength="3" maxLength="2000" rows="4" placeholder="What did you love? What should people know?" value={content} onChange={(event) => setContent(event.target.value)} /></label>
      <div className="form-actions"><button className="button button-dark" disabled={busy}>{busy ? 'Saving…' : initial ? 'Update review' : 'Post review'} <span>↗</span></button>{onCancel && <button className="button button-quiet" type="button" onClick={onCancel}>Cancel</button>}</div>
    </form>
  );
}

function RestaurantPage() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    try {
      const [restaurantData, distributionData] = await Promise.all([
        api(`/restaurants/${id}`, { token }),
        api(`/restaurants/${id}/distribution`)
      ]);
      setData(restaurantData);
      setDistribution(distributionData.distribution);
      setError('');
    } catch (err) { setError(err.message); }
  }, [id, token]);
  useEffect(() => { load(); }, [load, refresh]);

  async function saveReview(payload) {
    const path = data.customerReview ? `/reviews/${data.customerReview._id}` : `/reviews/restaurants/${id}/reviews`;
    await api(path, { token, method: data.customerReview ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
    setEditing(false);
    setRefresh((value) => value + 1);
  }
  async function deleteReview() {
    if (!window.confirm('Delete your review? This cannot be undone.')) return;
    try {
      await api(`/reviews/${data.customerReview._id}`, { token, method: 'DELETE' });
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
  }

  return (
    <main className="detail-page">
      <Link to="/" className="back-link">← Back to restaurants</Link>
      <Notice message={error} />
      {!data ? <p className="empty-state">Loading restaurant…</p> : (
        <>
          <section className="detail-hero">
            <div className="detail-art"><span>{data.restaurant.cuisine?.slice(0, 1).toUpperCase()}</span><small>GOOD FOOD, GOOD COMPANY</small></div>
            <div className="detail-copy">
              <span className="eyebrow eyebrow-dark">{data.restaurant.cuisine}</span>
              <h1>{data.restaurant.name}</h1>
              <p>{data.restaurant.location} <span className="bullet">·</span> {data.restaurant.address}</p>
              {data.restaurant.description && <p className="detail-description">{data.restaurant.description}</p>}
              <div className="detail-stats"><strong>{data.restaurant.averageRating ? Number(data.restaurant.averageRating).toFixed(1) : '—'} <span>★</span></strong><span>{data.restaurant.reviewCount ? `${data.restaurant.reviewCount} reviews` : 'No ratings yet'}</span></div>
            </div>
          </section>
          <section className="detail-columns">
            <div>
              <div className="section-heading compact"><div><span className="eyebrow eyebrow-dark">FROM THE NEIGHBORHOOD</span><h2>What people <em>say.</em></h2></div></div>
              {!data.reviews.length ? <div className="empty-state compact-empty"><h3>It’s a clean slate.</h3><p>Be the first to share your experience.</p></div> : <div className="review-list">{data.reviews.map((review) => <article className="review-card" key={review._id}><div className="review-meta"><strong>{review.customer?.name || 'Customer'}</strong><span>{new Date(review.createdAt).toLocaleDateString()}</span></div><div className="review-stars">{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div><p>{review.content}</p></article>)}</div>}
            </div>
            <aside className="detail-aside">
              <div className="distribution-card"><span className="eyebrow eyebrow-dark">RATING BREAKDOWN</span><h3>At a glance.</h3>{distribution && [5, 4, 3, 2, 1].map((star) => { const total = Object.values(distribution).reduce((sum, count) => sum + count, 0); return <div className="distribution-row" key={star}><span>{star} <b>★</b></span><div className="distribution-track"><i style={{ width: `${total ? distribution[star] / total * 100 : 0}%` }} /></div><span>{distribution[star]}</span></div>; })}</div>
              {user?.role === 'customer' ? <div className="review-editor"><span className="eyebrow eyebrow-dark">YOUR EXPERIENCE</span><h3>{data.customerReview ? (editing ? 'Update your review.' : 'You’ve been here.') : 'Been here before?'}</h3>{data.customerReview && !editing ? <><div className="own-review-score">{'★'.repeat(data.customerReview.rating)}<span>{'★'.repeat(5 - data.customerReview.rating)}</span></div><p>{data.customerReview.content}</p><div className="form-actions"><button className="button button-dark" onClick={() => setEditing(true)}>Edit review</button><button className="button button-quiet danger-text" onClick={deleteReview}>Delete</button></div></> : <ReviewForm initial={editing ? data.customerReview : null} onCancel={editing ? () => setEditing(false) : undefined} onSave={saveReview} />}</div> : !user ? <div className="review-editor"><span className="eyebrow eyebrow-dark">YOUR EXPERIENCE</span><h3>Been here before?</h3><p>Sign in as a customer to share your rating and review.</p><Link className="button button-dark" to="/login">Sign in to review <span>↗</span></Link></div> : null}
            </aside>
          </section>
        </>
      )}
    </main>
  );
}

function OwnerPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    api('/owner/restaurant', { token }).then((result) => {
      setData(result);
      setForm(Object.fromEntries(['name', 'location', 'address', 'cuisine', 'phone', 'description'].map((key) => [key, result.restaurant[key] || ''])));
    }).catch((err) => setError(err.message));
  }, [token, refresh]);

  async function submit(event) {
    event.preventDefault();
    setNotice('');
    setError('');
    try {
      await api('/owner/restaurant', { token, method: 'PATCH', body: JSON.stringify(form) });
      setNotice('Restaurant details saved.');
      setRefresh((value) => value + 1);
    } catch (err) { setError(err.message); }
  }
  return <main className="dashboard-page"><div className="dashboard-title"><span className="eyebrow eyebrow-dark">OWNER STUDIO</span><h1>Your restaurant, <em>your story.</em></h1><p>Manage your listing and hear directly from your guests.</p></div><Notice message={error} /><Notice message={notice} type="success" />
    {data && <><div className="stats-row"><div className="stat-card"><span>AVERAGE RATING</span><strong>{data.restaurant.averageRating ? Number(data.restaurant.averageRating).toFixed(1) : '—'} <i>★</i></strong><small>{data.restaurant.reviewCount ? `${data.restaurant.reviewCount} guest reviews` : 'No reviews yet'}</small></div><div className="stat-card"><span>YOUR LOCATION</span><strong className="stat-location">{data.restaurant.location}</strong><small>{data.restaurant.name}</small></div></div>
      <div className="dashboard-columns"><form className="panel" onSubmit={submit}><span className="eyebrow eyebrow-dark">YOUR LISTING</span><h2>Restaurant details</h2>{['name', 'location', 'address', 'cuisine', 'phone', 'description'].map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)}{key === 'description' ? <textarea maxLength="2000" rows="3" value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} /> : <input required={['name', 'location', 'address', 'cuisine'].includes(key)} value={form[key] || ''} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}</label>)}<button className="button button-dark">Save changes <span>↗</span></button></form>
        <section className="panel"><span className="eyebrow eyebrow-dark">GUESTBOOK</span><h2>Recent reviews <span className="count-pill">{data.reviews.length}</span></h2>{!data.reviews.length ? <p className="muted">Your guests’ reviews will appear here.</p> : <div className="review-list owner-review-list">{data.reviews.map((review) => <article className="review-card" key={review._id}><div className="review-meta"><strong>{review.customer?.name}</strong><span>{new Date(review.createdAt).toLocaleDateString()}</span></div><div className="review-stars">{'★'.repeat(review.rating)}<span>{'★'.repeat(5 - review.rating)}</span></div><p>{review.content}</p><small className="customer-contact">{review.customer?.email}</small></article>)}</div>}</section>
      </div></>}
  </main>;
}

function AdminPage() {
  const { token } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [owners, setOwners] = useState([]);
  const [filters, setFilters] = useState({ users: '', restaurants: '' });
  const [forms, setForms] = useState({
    owner: { name: '', email: '', password: '' },
    restaurant: { name: '', location: '', address: '', cuisine: '', owner: '' }
  });
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    try {
      const userQuery = queryString({ search: filters.users });
      const restaurantQuery = queryString({ search: filters.restaurants });
      const [stats, userData, ownerData, restaurantData, reviewData] = await Promise.all([
        api('/admin/dashboard', { token }),
        api(`/admin/users${userQuery ? `?${userQuery}` : ''}`, { token }),
        api('/admin/users?role=owner', { token }),
        api(`/admin/restaurants${restaurantQuery ? `?${restaurantQuery}` : ''}`, { token }),
        api('/admin/reviews', { token })
      ]);
      setDashboard(stats);
      setUsers(userData.users);
      setRestaurants(restaurantData.restaurants);
      setReviews(reviewData.reviews);
      setOwners(ownerData.users);
      setError('');
    } catch (err) { setError(err.message); }
  }, [filters, token]);
  useEffect(() => { load(); }, [load, refresh]);

  async function mutate(path, method, body, success) {
    setError('');
    setNotice('');
    try {
      await api(path, { token, method, ...(body ? { body: JSON.stringify(body) } : {}) });
      setNotice(success);
      setRefresh((value) => value + 1);
      return true;
    } catch (err) { setError(err.message); }
    return false;
  }
  async function submitOwner(event) {
    event.preventDefault();
    if (await mutate('/admin/owners', 'POST', forms.owner, 'Owner account created.')) {
      setForms((value) => ({ ...value, owner: { name: '', email: '', password: '' } }));
    }
  }
  async function submitRestaurant(event) {
    event.preventDefault();
    const payload = { ...forms.restaurant, owner: forms.restaurant.owner || null };
    if (await mutate('/admin/restaurants', 'POST', payload, 'Restaurant created.')) {
      setForms((value) => ({ ...value, restaurant: { name: '', location: '', address: '', cuisine: '', owner: '' } }));
    }
  }

  return <main className="dashboard-page admin-page"><div className="dashboard-title"><span className="eyebrow eyebrow-dark">PLATFORM OVERVIEW</span><h1>Good morning, <em>admin.</em></h1><p>Here’s what’s happening around the table.</p></div><Notice message={error} /><Notice message={notice} type="success" />
    {dashboard && <div className="stats-row admin-stats"><div className="stat-card"><span>TOTAL USERS</span><strong>{dashboard.totalUsers}</strong><small>Across every role</small></div><div className="stat-card"><span>RESTAURANTS</span><strong>{dashboard.totalRestaurants}</strong><small>Local spots listed</small></div><div className="stat-card"><span>REVIEWS</span><strong>{dashboard.totalReviews}</strong><small>Community stories</small></div><div className="stat-card"><span>PLATFORM RATING</span><strong>{dashboard.averageRating ? Number(dashboard.averageRating).toFixed(1) : '—'} <i>★</i></strong><small>Out of 5 stars</small></div></div>}
    <div className="admin-forms"><form className="panel compact-panel" onSubmit={submitOwner}><span className="eyebrow eyebrow-dark">NEW ACCOUNT</span><h2>Create a restaurant owner</h2><label>Full name<input required minLength="2" maxLength="80" value={forms.owner.name} onChange={(event) => setForms({ ...forms, owner: { ...forms.owner, name: event.target.value } })} /></label><label>Email<input required type="email" value={forms.owner.email} onChange={(event) => setForms({ ...forms, owner: { ...forms.owner, email: event.target.value } })} /></label><label>Temporary password<input required type="password" minLength="8" maxLength="16" pattern={passwordPattern} title="8–16 characters, with uppercase, lowercase, a number, and a special character." value={forms.owner.password} onChange={(event) => setForms({ ...forms, owner: { ...forms.owner, password: event.target.value } })} /></label><button className="button button-dark">Create owner <span>↗</span></button></form>
      <form className="panel compact-panel" onSubmit={submitRestaurant}><span className="eyebrow eyebrow-dark">NEW LISTING</span><h2>Add a restaurant</h2><div className="two-fields">{['name', 'cuisine', 'location', 'address'].map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)}<input required value={forms.restaurant[key]} onChange={(event) => setForms({ ...forms, restaurant: { ...forms.restaurant, [key]: event.target.value } })} /></label>)}</div><label>Assign owner<select value={forms.restaurant.owner} onChange={(event) => setForms({ ...forms, restaurant: { ...forms.restaurant, owner: event.target.value } })}><option value="">Unassigned</option>{owners.map((owner) => <option key={owner._id} value={owner._id}>{owner.name} · {owner.email}</option>)}</select></label><button className="button button-dark">Add restaurant <span>↗</span></button></form></div>
    <section className="panel table-panel"><div className="table-heading"><div><span className="eyebrow eyebrow-dark">PEOPLE AT THE TABLE</span><h2>Users <span className="count-pill">{users.length}</span></h2></div><input className="table-search" placeholder="Search name or email" value={filters.users} onChange={(event) => setFilters({ ...filters, users: event.target.value })} /></div><div className="table-wrap"><table><thead><tr><th>NAME</th><th>EMAIL</th><th>ROLE</th><th>JOINED</th><th></th></tr></thead><tbody>{users.map((person) => <tr key={person._id}><td className="table-name">{person.name}</td><td>{person.email}</td><td><select className="role-select" value={person.role} onChange={(event) => mutate(`/admin/users/${person._id}`, 'PATCH', { role: event.target.value }, 'User role updated.')}><option value="administrator">Admin</option><option value="customer">Customer</option><option value="owner">Owner</option></select></td><td>{new Date(person.createdAt).toLocaleDateString()}</td><td><button className="text-button danger-text" onClick={() => window.confirm(`Delete ${person.name} and their reviews?`) && mutate(`/admin/users/${person._id}`, 'DELETE', null, 'User deleted.')}>Delete</button></td></tr>)}</tbody></table></div></section>
    <section className="panel table-panel"><div className="table-heading"><div><span className="eyebrow eyebrow-dark">THE LOCAL GUIDE</span><h2>Restaurants <span className="count-pill">{restaurants.length}</span></h2></div><input className="table-search" placeholder="Search name, location, cuisine" value={filters.restaurants} onChange={(event) => setFilters({ ...filters, restaurants: event.target.value })} /></div><div className="table-wrap"><table><thead><tr><th>RESTAURANT</th><th>LOCATION</th><th>CUISINE</th><th>OWNER</th><th></th></tr></thead><tbody>{restaurants.map((restaurant) => <tr key={restaurant._id}><td className="table-name">{restaurant.name}</td><td>{restaurant.location}</td><td>{restaurant.cuisine}</td><td><select className="role-select owner-select" value={restaurant.owner?._id || ''} onChange={(event) => mutate(`/admin/restaurants/${restaurant._id}`, 'PATCH', { owner: event.target.value || null }, 'Restaurant assignment updated.')}><option value="">Unassigned</option>{owners.map((owner) => <option key={owner._id} value={owner._id}>{owner.name}</option>)}</select></td><td><button className="text-button danger-text" onClick={() => window.confirm(`Delete ${restaurant.name} and all its reviews?`) && mutate(`/admin/restaurants/${restaurant._id}`, 'DELETE', null, 'Restaurant deleted.')}>Delete</button></td></tr>)}</tbody></table></div></section>
    <section className="panel table-panel"><div className="table-heading"><div><span className="eyebrow eyebrow-dark">COMMUNITY VOICES</span><h2>Reviews <span className="count-pill">{reviews.length}</span></h2></div></div><div className="table-wrap"><table><thead><tr><th>RESTAURANT</th><th>CUSTOMER</th><th>RATING</th><th>REVIEW</th><th>POSTED</th><th></th></tr></thead><tbody>{reviews.map((review) => <tr key={review._id}><td className="table-name">{review.restaurant?.name || 'Restaurant removed'}</td><td>{review.customer?.name || 'Account removed'}<small className="table-sub">{review.customer?.email}</small></td><td className="review-stars">{'★'.repeat(review.rating)}</td><td className="review-snippet">{review.content}</td><td>{new Date(review.createdAt).toLocaleDateString()}</td><td><button className="text-button danger-text" onClick={() => window.confirm('Remove this review?') && mutate(`/reviews/${review._id}`, 'DELETE', null, 'Review removed.')}>Remove</button></td></tr>)}</tbody></table>{!reviews.length && <p className="table-empty">No reviews yet.</p>}</div></section>
  </main>;
}

function AccountRouter() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'owner') return <OwnerPage />;
  if (user.role === 'administrator') return <AdminPage />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return <><Header /><Routes><Route path="/" element={<DiscoverPage />} /><Route path="/login" element={<AuthPage mode="login" />} /><Route path="/register" element={<AuthPage mode="register" />} /><Route path="/restaurants/:id" element={<RestaurantPage />} /><Route path="/owner" element={<AccountRouter />} /><Route path="/admin" element={<AccountRouter />} /><Route path="*" element={<main className="empty-state"><h2>That page isn’t on the menu.</h2><Link to="/" className="button button-dark">Back to discover</Link></main>} /></Routes></>;
}
