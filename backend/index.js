const express = require('express');
const cors = require('cors'); // Import cors
const authRouter = require('./routes/Auth'); // Import auth routes
require('dotenv').config();
const documentRouter = require('./routes/Document');
const chatRouter = require('./routes/Chat');
// Import database connection
const connectDB = require('./config/database');

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// CORS middleware — restricted to the configured frontend origin(s) rather
// than reflecting any origin, since this API carries auth tokens and user data.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
}));

app.use(express.json());

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/document', documentRouter); 
app.use('/api/v1/chat', chatRouter);





// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});