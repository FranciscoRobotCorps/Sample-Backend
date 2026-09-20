import { createApp } from './app';
import { config } from './config';
import { closePool } from './db/pool';

async function main(): Promise<void> {
  const app = createApp();

  const server = app.listen(config.port, () => {
    console.log(`hermes-api listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`${signal} received, shutting down...`);
    server.close(async () => {
      await closePool();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
