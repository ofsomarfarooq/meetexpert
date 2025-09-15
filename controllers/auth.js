const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: "",
  database: process.env.DATABASE
});

exports.register = (req, res) => {
    console.log("Register route reached");

    const { first_name, last_name, email, password_hash, password_hash2, company, role } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (err, results) => {
        if(err){
            console.log("Database query error: ", err);
            return res.status(500).send('Server error');
        }

        if(results.length > 0){
            return res.render('register', {
                message: 'Email already registered'
            });
        }
        else if(password_hash !== password_hash2){
            return res.render('register', {
                message: 'Passwords do not match'
            });
         }

         let hashedPassword = await bcrypt.hash(password_hash, 8);
         console.log(hashedPassword);





        });

        res.send('Form submitted successfully');

}

