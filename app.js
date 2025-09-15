const express = require('express');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');

dotenv.config({path: './.env'});

const app = express();

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: "",
  database: process.env.DATABASE
});

const publicDirectory = path.join(__dirname,'./public');

app.use(express.static(publicDirectory));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());


app.set('view engine', 'hbs');

db.connect((error)=>{
    if(error){
        console.log("Database connection failed: ", error);
    }
    else{
        console.log("Database connected successfully.");
    }
});

// //define routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));





// app.get('/', (req, res) => {
//     res.render("index");
// });

// app.get('/register', (req, res) => {
//     res.render("register");
// });

// app.get('/login', (req, res) => {
//     res.render("login");
// });


app.listen(5000, () => {
  console.log("Server is running on Port 5000");
});

