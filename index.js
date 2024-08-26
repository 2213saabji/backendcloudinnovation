// const express = require('express');
// const cors = require('cors');
// const fs = require('fs');
// const path = require('path');
// require('dotenv').config();

// const app = express();
// const PORT = process.env.REACT_APP_JSON_SERVER_PORT || 8080;
// const dataFilePath = path.join(__dirname, 'data', 'db.json');

// app.use(cors());
// app.use(express.json());

// // Helper function to read data
// const readData = () => {
//   const data = fs.readFileSync(dataFilePath);
//   return JSON.parse(data);
// };

// // Custom route for filtering and sorting
// app.get('/movies', (req, res) => {
//   const { rating, order } = req.query;
//   let movies = readData().movies;

//   if (rating) {
//     const ratings = Array.isArray(rating) ? rating : [rating];
//     movies = movies.filter(movie => ratings.includes(movie.rating.toString()));
//   }

//   if (order) {
//     movies = movies.sort((a, b) => {
//       if (order === 'asc') return a.Year - b.Year;
//       if (order === 'desc') return b.Year - a.Year;
//       return 0;
//     });
//   }

//   res.json(movies);
// });

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });



require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-adminsdk.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://your-project-id.firebaseio.com",
});

const server = http.createServer();

// Set up CORS middleware with dynamic origin
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? process.env.PROD_ORIGIN
    : process.env.LOCAL_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true,
};


const io = new Server(server, {
  path: '/socket.io/',
});

let drawingData = [];
let undoStack = [];
let redoStack = [];

io.use(async (socket, next) => {
  const token = socket.handshake.query.token;
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.uid}`);

  // Send the current drawing data to the newly connected client
  socket.emit('init-drawing-data', drawingData);

  socket.on('drawing-data', (data) => {
    drawingData.push(data);
    undoStack.push({ action: 'draw', data });
    redoStack = []; // Clear redo stack on new drawing
    socket.broadcast.emit('drawing-data', data);
  });

  socket.on('undo', () => {
    if (undoStack.length > 0) {
      const lastAction = undoStack.pop();
      if (lastAction.action === 'draw') {
        redoStack.push(lastAction);
        drawingData = drawingData.slice(0, -1); // Remove the last drawing action
        io.emit('clear-canvas');
        drawingData.forEach(action => io.emit('drawing-data', action)); // Redraw the remaining data
      }
    }
  });

  socket.on('redo', () => {
    if (redoStack.length > 0) {
      const lastAction = redoStack.pop();
      if (lastAction.action === 'draw') {
        drawingData.push(lastAction.data);
        undoStack.push(lastAction);
        io.emit('drawing-data', lastAction.data);
      }
    }
  });

  socket.on('clear-canvas', () => {
    drawingData = [];
    undoStack = [];
    redoStack = [];
    io.emit('clear-canvas');
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.uid}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
