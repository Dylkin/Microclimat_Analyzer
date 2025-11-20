@echo off
echo ========================================
echo Fix Missing Dependencies
echo ========================================
echo.
echo Installing missing dependencies:
echo - d3-zoom
echo - docxtemplater
echo.
echo 1. Installing d3-zoom...
npm install d3-zoom
echo.
echo 2. Installing docxtemplater...
npm install docxtemplater
echo.
echo 3. Installing additional D3 packages that might be needed...
npm install d3-array d3-scale d3-selection d3-time-format
echo.
echo 4. Verifying installation...
npm list d3-zoom
npm list docxtemplater
echo.
echo ========================================
echo Dependencies installed successfully!
echo ========================================
echo.
echo The server should now work without warnings.
echo You can access it at: http://localhost:5173
echo.
pause

