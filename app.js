import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import BraveAPI from './dist/BraveAPI/index.js';

const app = express();
const port = process.env.PORT || 8080;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Middleware
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, 'dist/public')));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'));
});

// Search endpoint
app.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    // Check if API key is available
    if (!process.env.BRAVE_API_KEY) {
      return res.status(500).json({ error: 'Brave API key not configured' });
    }

    const searchResults = await BraveAPI.issueRequest('web', {
      query: query,
      count: 10
    });

    res.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP endpoint (for backward compatibility)
app.all('/mcp', (req, res) => {
  res.status(200).json({ message: 'MCP endpoint - use /search for web interface' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Brave Search App running at http://localhost:${port}`);
  console.log(`📊 Web interface available at http://localhost:${port}/`);
  console.log(`🔍 Search API available at http://localhost:${port}/search`);
});
