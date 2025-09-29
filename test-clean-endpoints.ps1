# Test clean endpoints (without %20)
Write-Host "🧪 Testing Clean API Endpoints (without %20)..." -ForegroundColor Yellow
Write-Host ""

# Wait for server startup
Start-Sleep 4

try {
    Write-Host "1. Testing GET /api/lessons (clean URL)" -ForegroundColor Cyan
    $lessonsResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/lessons" -Method GET -UseBasicParsing
    $lessonsData = $lessonsResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Status: $($lessonsResponse.StatusCode)" -ForegroundColor Green
    Write-Host "   📖 Success: $($lessonsData.success)" -ForegroundColor Green
    Write-Host "   📊 Lessons Count: $($lessonsData.data.Count)" -ForegroundColor Green
    if ($lessonsData.data -and $lessonsData.data.Count -gt 0) {
        Write-Host "   📝 Sample: $($lessonsData.data[0].title)" -ForegroundColor Green
        Write-Host "   📚 Course: $($lessonsData.data[0].course_title)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

try {
    Write-Host "2. Testing GET /api/courses (clean URL)" -ForegroundColor Cyan
    $coursesResponse = Invoke-WebRequest -Uri "http://localhost:3002/api/courses" -Method GET -UseBasicParsing
    $coursesData = $coursesResponse.Content | ConvertFrom-Json
    Write-Host "   ✅ Status: $($coursesResponse.StatusCode)" -ForegroundColor Green
    if ($coursesData -is [Array]) {
        Write-Host "   📚 Courses Count: $($coursesData.Count)" -ForegroundColor Green
        if ($coursesData.Count -gt 0) {
            Write-Host "   📖 Sample: $($coursesData[0].title)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

try {
    Write-Host "3. Testing GET /api/admin/stats (clean URL)" -ForegroundColor Cyan
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
Write-Host "✅ Clean endpoint testing completed!" -ForegroundColor Yellow