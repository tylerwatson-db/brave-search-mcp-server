#!/usr/bin/env node
import { getOptions } from './config.js';
import { stdioServer, httpServer } from './protocols/index.js';

async function main() {
  console.log('Starting Brave Search MCP Server...');
  console.log('Environment variables:');
  console.log('- BRAVE_API_KEY:', process.env.BRAVE_API_KEY ? 'SET' : 'NOT SET');
  console.log('- BRAVE_MCP_TRANSPORT:', process.env.BRAVE_MCP_TRANSPORT || 'not set');
  console.log('- BRAVE_MCP_PORT:', process.env.BRAVE_MCP_PORT || 'not set');
  console.log('- BRAVE_MCP_HOST:', process.env.BRAVE_MCP_HOST || 'not set');
  console.log('- PORT:', process.env.PORT || 'not set');

  try {
    const options = getOptions();

    if (!options) {
      console.error('Invalid configuration');
      process.exit(1);
    }

    console.log('Configuration loaded successfully:', {
      transport: options.transport,
      port: options.port,
      host: options.host,
      braveApiKey: options.braveApiKey ? 'SET' : 'NOT SET',
      loggingLevel: options.loggingLevel
    });

    // stdio requires explicit request
    if (options.transport === 'stdio') {
      console.log('Starting stdio server...');
      await stdioServer.start();
      return;
    }

    // default to http server
    console.log('Starting HTTP server...');
    httpServer.start();
  } catch (error) {
    console.error('Error during startup:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
