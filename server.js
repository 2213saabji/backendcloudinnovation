const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.REACT_APP_JSON_SERVER_PORT || 8080;
const dataFilePath = path.join(__dirname, 'data', 'db.json');

app.use(cors());
app.use(express.json());

// Helper function to read data
const readData = () => {
  const data = fs.readFileSync(dataFilePath);
  return JSON.parse(data);
};

// Custom route for filtering and sorting
app.get('/movies', (req, res) => {
  const { rating, order } = req.query;
  let movies = readData().movies;

  if (rating) {
    const ratings = Array.isArray(rating) ? rating : [rating];
    movies = movies.filter(movie => ratings.includes(movie.rating.toString()));
  }

  if (order) {
    movies = movies.sort((a, b) => {
      if (order === 'asc') return a.Year - b.Year;
      if (order === 'desc') return b.Year - a.Year;
      return 0;
    });
  }

  res.json(movies);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
