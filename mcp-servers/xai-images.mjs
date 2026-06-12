#!/usr/bin/env node
/**
 * MCP Server - XAI Image Generation (Aurora model)
 * Generates images using the XAI API (compatible with OpenAI format)
 *
 * Required env vars:
 *   XAI_API_KEY - Your XAI API key from https://console.x.ai
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const XAI_API_KEY = process.env.XAI_API_KEY;
const XAI_BASE_URL = 'https://api.x.ai/v1';

if (!XAI_API_KEY) {
  console.error('Error: XAI_API_KEY environment variable is required');
  process.exit(1);
}

const server = new Server(
  { name: 'xai-images', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        "Generate an image using XAI's Aurora model. Returns a URL to the generated image.",
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Text description of the image to generate',
          },
          n: {
            type: 'number',
            description: 'Number of images to generate (1-4, default: 1)',
            minimum: 1,
            maximum: 4,
            default: 1,
          },
          response_format: {
            type: 'string',
            enum: ['url', 'b64_json'],
            description: 'Format of the response (default: url)',
            default: 'url',
          },
        },
        required: ['prompt'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'generate_image') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const { prompt, n = 1, response_format = 'url' } = request.params.arguments;

  const response = await fetch(`${XAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'grok-imagine-image-pro',
      prompt,
      n,
      response_format,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`XAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();

  const results = data.data.map((item, i) => {
    if (response_format === 'b64_json') {
      return `Image ${i + 1}: [base64 data, ${item.b64_json?.length ?? 0} chars]`;
    }
    return `Image ${i + 1}: ${item.url}`;
  });

  return {
    content: [
      {
        type: 'text',
        text: results.join('\n'),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);
