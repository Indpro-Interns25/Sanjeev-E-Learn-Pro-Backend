# Test admin endpoints
Write-Host "🧪 Testing Admin Dashboard Endpoints..." -ForegroundColor Yellow

# Wait for server to be ready
Start-Sleep -Seconds 3

Write-Host "1. Testing GET /api/admin/stats" -ForegroundColor Cyan
try {
    $statsResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/admin/stats" -Method GET -UseBasicParsing
    $statsData = $statsResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Status: $($statsResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   📊 Success: $($statsData.success)" -ForegroundColor Green
    if ($statsData.data.stats) {
        Write-Host "   👥 Students: $($statsData.data.stats.total_students)" -ForegroundColor Green
        Write-Host "   📚 Courses: $($statsData.data.stats.total_courses)" -ForegroundColor Green
        Write-Host "   📖 Lessons: $($statsData.data.stats.total_lessons)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testing GET /api/admin/courses" -ForegroundColor Cyan
try {
    $coursesResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/admin/courses" -Method GET -UseBasicParsing
    $coursesData = $coursesResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Status: $($coursesResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   📚 Success: $($coursesData.success)" -ForegroundColor Green
    Write-Host "   📊 Course Count: $($coursesData.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Testing GET /api/admin/lessons" -ForegroundColor Cyan
try {
    $lessonsResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/admin/lessons" -Method GET -UseBasicParsing
    $lessonsData = $lessonsResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Status: $($lessonsResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   📖 Success: $($lessonsData.success)" -ForegroundColor Green
    Write-Host "   📊 Lesson Count: $($lessonsData.data.Count)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "✅ Admin endpoint testing completed!" -ForegroundColor Yellow