#!/usr/bin/env node
/**
 * MCP Server - OpenAI Image Generation (gpt-image-2)
 * Generates images using the OpenAI API
 *
 * Required env vars:
 *   OPENAI_API_KEY - Your OpenAI API key from https://platform.openai.com
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = 'https://api.openai.com/v1';

if (!OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY environment variable is required');
  process.exit(1);
}

const server = new Server(
  { name: 'openai-images', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'generate_image',
      description:
        "Generate an image using OpenAI's image models (gpt-image-2). Returns a URL or base64 data of the generated image.",
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Text description of the image to generate',
          },
          model: {
            type: 'string',
            enum: ['gpt-image-2'],
            description: 'Model to use for generation (default: gpt-image-2)',
            default: 'gpt-image-2',
          },
          n: {
            type: 'number',
            description: 'Number of images to generate (1-4, default: 1)',
            minimum: 1,
            maximum: 4,
            default: 1,
          },
          size: {
            type: 'string',
            enum: ['1024x1024', '1536x1024', '1024x1536', '1792x1024', '1024x1792', 'auto'],
            description: 'Image size (default: 1024x1024). gpt-image-2 supports auto/1024x1024/1536x1024/1024x1536. dall-e-3 supports 1024x1024/1792x1024/1024x1792.',
            default: '1024x1024',
          },
          quality: {
            type: 'string',
            enum: ['auto', 'low', 'medium', 'high', 'standard', 'hd'],
            description: 'Image quality. gpt-image-2: auto/low/medium/high. dall-e-3: standard/hd. (default: auto)',
            default: 'auto',
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

  const {
    prompt,
    model = 'gpt-image-2',
    n = 1,
    size = '1024x1024',
    quality = 'auto',
    response_format = 'url',
  } = request.params.arguments;

  const isGptImage = model.startsWith('gpt-image');
  const body = { model, prompt, size, quality };

  if (isGptImage) {
    // gpt-image models don't support response_format, n, or style.
    // They always return b64_json and use output_format (png/webp/jpeg).
    body.output_format = 'png';
  } else {
    // DALL-E models use response_format and support n
    body.n = n;
    body.response_format = response_format;
  }

  const response = await fetch(`${OPENAI_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${error}`);
  }

  const data = await response.json();

  const content = [];
  for (let i = 0; i < data.data.length; i++) {
    const item = data.data[i];
    if (item.b64_json) {
      // Save base64 image to file
      const filename = `generated_${Date.now()}_${i}.png`;
      const filepath = resolve(process.cwd(), filename);
      writeFileSync(filepath, Buffer.from(item.b64_json, 'base64'));
      content.push({ type: 'text', text: `Image ${i + 1} saved to: ${filepath}` });
    } else if (item.url) {
      content.push({ type: 'text', text: `Image ${i + 1}: ${item.url}` });
    }
  }

  return { content };
});

const transport = new StdioServerTransport();
await server.connect(transport);
