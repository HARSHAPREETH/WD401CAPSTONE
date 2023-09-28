const express = require('express');
const app = express();
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const ejs = require('ejs');
const bp = require('body-parser');
const bcrypt = require('bcrypt');
const https = require('https');

// Replace with your Firebase Admin SDK configuration
const serviceAccount = require('./key.json');

// Initialize Firebase Admin SDK
initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = getFirestore();

app.use(bp.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.set('view engine', 'ejs');

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/home.html');
});

app.get('/signup', (req, res) => {
  res.sendFile(__dirname + '/signup.html');
});

app.get('/hlogin', (req, res) => {
  res.redirect('/login');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.post('/login', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const querySnapshot = await admin.firestore().collection('students')
    .where('name', '==', username)
    .get();

  if (!querySnapshot.empty) {
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const storedHashedPassword = data.password;

      const passwordMatch = bcrypt.compareSync(password, storedHashedPassword);

      if (passwordMatch) {
        // Redirect to the bike info page after successful login
        res.redirect('/bikeinfo');
      } else {
        res.send('Invalid Credentials');
      }
    });
  } else {
    console.log('No documents matching the query');
    res.send('Invalid Credentials');
  }
});

app.get('/hsignup', (req, res) => {
  res.redirect('/signup');
});

app.post('/signupsubmit', async (req, res) => {
  const name = req.body.username;
  const email = req.body.email;
  const password = req.body.password;

  if (!name || !email || !password) {
    res.send('All fields are required for signup.');
    return;
  }

  const saltRounds = 10;

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      res.send('Error while hashing password');
    } else {
      const userData = {
        name,
        email,
        password: hash,
      };

      db.collection('students')
        .add(userData)
        .then(() => {
          res.send('Signup successful!');
        })
        .catch((error) => {
          res.send(`Error while signing up: ${error.message}`);
        });
    }
  });
});

// Bike info route
app.get('/bikeinfo', async (req, res) => {
  res.render('bike', { bikeInfo: null, error: null });
});

app.post('/bikeinfo', async (req, res) => {
  const { bikeName, bikeModel } = req.body;

  if (bikeName && bikeModel) {
    const apiKey = 'PnCHVo7RE+uF+nJVeC+8tw==p8xfg9qdqBil9EC8';
    const url = `https://api.api-ninjas.com/v1/motorcycles?make=${bikeName}&model=${bikeModel}`;

    https.get(url, (response) => {
      let data = '';

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (jsonData.length > 0) {
            const bikeInfo = jsonData[0];
            res.render('bike', { bikeInfo, error: null });
          } else {
            res.render('bike', { bikeInfo: null, error: 'No details available for this bike.' });
          }
        } catch (error) {
          console.error(error);
          res.render('bike', { bikeInfo: null, error: 'An error occurred while parsing data.' });
        }
      });
    }).on('error', (error) => {
      console.error(error);
      res.render('bike', { bikeInfo: null, error: 'An error occurred while fetching data.' });
    });
  } else {
    res.render('bike', { bikeInfo: null, error: 'Please enter both bike name and model.' });
  }
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
