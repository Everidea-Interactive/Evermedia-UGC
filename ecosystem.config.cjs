module.exports = {
  apps: [
    {
      args: 'start',
      autorestart: true,
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
        PORT: '3001',
      },
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '500M',
      name: 'evermedia-studio',
      script: 'node_modules/next/dist/bin/next',
      time: true,
      watch: false,
    },
  ],
}
