import { randomUUID } from 'node:crypto';
import express, { type Request, type Response, type RequestHandler } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
import { mcpServer } from '../server.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import BraveAPI from '../BraveAPI/index.js';

const yieldGenericServerError = (res: Response) => {
  res.status(500).json({
    id: null,
    jsonrpc: '2.0',
    error: { code: -32603, message: 'Internal server error' },
  });
};

const transports = new Map<string, StreamableHTTPServerTransport>();

export const getTransport = async (request: Request): Promise<StreamableHTTPServerTransport> => {
  // Check for an existing session
  const sessionId = request.headers['mcp-session-id'] as string;

  if (sessionId && transports.has(sessionId)) {
    return transports.get(sessionId)!;
  }

  // Is the client attempting to initialize a new session?
  if (isInitializeRequest(request.body)) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, transport);
      },
    });

    await mcpServer.connect(transport);
    return transport;
  }

  // We have a special case where we'll permit ListToolsRequest w/o a session ID
  if (request.body.method === ListToolsRequestSchema.shape.method.value) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await mcpServer.connect(transport);
    return transport;
  }

  throw new Error(
    'Invalid request: must be an initialization request, include a valid session ID, or be a ListTools method request'
  );
};

export const createApp = () => {
  const app = express();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  // Serve the main page
  app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Search endpoint
  const searchHandler: RequestHandler = async (req, res) => {
    try {
      const { query } = req.body;

      if (!query || typeof query !== 'string') {
        res.status(400).json({ error: 'Query is required and must be a string' });
        return;
      }

      const searchResults = await BraveAPI.issueRequest('web', {
        query: query,
        count: 10,
      });

      res.json(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed. Please try again.' });
    }
  };

  app.post('/search', searchHandler);

  app.all('/mcp', async (req: Request, res: Response) => {
    try {
      const transport = await getTransport(req);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error);
      if (!res.headersSent) {
        yieldGenericServerError(res);
      }
    }
  });

  app.all('/ping', (req: Request, res: Response) => {
    res.status(200).json({ message: 'pong' });
  });

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      version: '1.3.5'
    });
  });

  return app;
};

export const start = () => {
  if (!config.ready) {
    console.error('Invalid configuration');
    process.exit(1);
  }

  const app = createApp();

  app.listen(config.port, config.host, () => {
    console.error(`Server is running on http://${config.host}:${config.port}/mcp`);
    console.error(`Front-end available at http://${config.host}:${config.port}/`);
  });
};

export default { start, createApp };
