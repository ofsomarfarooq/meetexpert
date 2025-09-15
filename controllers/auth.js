const mysql = require('mysql');
const bcrypt = require('bcrypt');
const path = require('path');

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE
});

// REGISTER
exports.register = async (req, res) => {
  const { first_name, last_name, email, password_hash, password_hash2, company, role } = req.body;
  const file = req.file;

  if (!email || !password_hash || !password_hash2) {
    return res.status(400).render('register', { message: 'Please fill required fields' });
  }

  db.query('SELECT email FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).render('register', { message: 'Server error' });
    }

    if (results.length > 0) {
      return res.render('register', { message: 'Email already registered' });
    }
    if (password_hash !== password_hash2) {
      return res.render('register', { message: 'Passwords do not match' });
    }

    try {
      const hashed = await bcrypt.hash(password_hash, 10);
      const record = {
        first_name: first_name || null,
        last_name: last_name || null,
        email,
        password_hash: hashed,
        company: company || null,
        role: role || null,
        profile_picture: file ? ('/uploads/' + path.basename(file.path)) : null
      };

      db.query('INSERT INTO users SET ?', record, (err2, result) => {
        if (err2) {
          console.error(err2);
          return res.status(500).render('register', { message: 'Could not register user' });
        }
        return res.render('login', { message: 'Registration successful. Please log in.' });
      });
    } catch (e) {
      console.error(e);
      return res.status(500).render('register', { message: 'Password hashing failed' });
    }
  });
};

// LOGIN
exports.login = (req, res) => {
  const { email, password } = req.body;
  if(!email || !password){
    return res.status(400).render('login', { message: 'Enter email and password' });
  }

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).render('login', { message: 'Server error' });
    }
    if (results.length === 0) {
      return res.status(401).render('login', { message: 'Invalid email or password' });
    }

    const user = results[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if(!ok){
      return res.status(401).render('login', { message: 'Invalid email or password' });
    }

    // Save to session
    req.session.user = {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      profile_picture: user.profile_picture
    };

    return res.redirect('/');
  });
};

// LOGOUT
exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
};
