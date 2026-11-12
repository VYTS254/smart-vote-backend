# Test if election is active and accessible

Write-Host "Testing Active Election Setup..." -ForegroundColor Cyan
Write-Host ""

# Login first
Write-Host "1. Logging in as CS/2021/001..." -ForegroundColor Yellow
$loginBody = '{"studentRegistrationNumber":"CS/2021/001","password":"password123"}'

$loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"

$token = $loginResponse.data.token
Write-Host "Login successful!" -ForegroundColor Green
Write-Host "User: $($loginResponse.data.user.fullName)" -ForegroundColor Gray
Write-Host ""

# Get all elections with status filter
Write-Host "2. Fetching OPEN elections..." -ForegroundColor Yellow

$electionsResponse = Invoke-RestMethod `
    -Uri "http://localhost:3000/api/elections?status=OPEN" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}

Write-Host "Found elections!" -ForegroundColor Green
Write-Host ""
Write-Host "Response:" -ForegroundColor Cyan
$electionsResponse | ConvertTo-Json -Depth 10
