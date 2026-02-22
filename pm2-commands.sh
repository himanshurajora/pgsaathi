pm2 start serve --name pgsaathi-frontend -- -s build -l 3000
pm2 start /home/app/pgsaathi/backend/env/bin/python --name pgsaathi-backend -- -m uvicorn \
  server:app --host 0.0.0.0 --port 8000