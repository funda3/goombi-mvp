# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Goombi\goombi-mvp\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# Wait for backend
Start-Sleep -Seconds 3

# Open Chrome first
Start-Process "chrome" "http://127.0.0.1:5173"

# Then start frontend in current window
cd "C:\Goombi\goombi-mvp\frontend"
npm run dev
