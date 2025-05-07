// Basic Express Server for Heroku
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    node_version: process.version
  });
});

// Root path
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Meta Maximus - Basic Server</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #5c6ac4; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Meta Maximus - Basic Server</h1>
          <p>This is a basic server for troubleshooting Heroku deployment issues.</p>
          <p>App Environment: ${process.env.NODE_ENV || 'development'}</p>
          <p>Node Version: ${process.version}</p>
          <p><a href="/health">Health Check</a></p>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Basic server listening at http://localhost:${port}`);
});