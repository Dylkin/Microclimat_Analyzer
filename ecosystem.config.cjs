module.exports = {
  apps: [{
    name: 'microclimat-api',
    script: 'npm',
    args: 'run server:prod',
    cwd: '/home/stas/Microclimat_Analyzer',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/home/stas/.pm2/logs/microclimat-api-error.log',
    out_file: '/home/stas/.pm2/logs/microclimat-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 3,
    restart_delay: 5000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};

