#!/bin/bash

# Progress Tracking System Test Script
# Tests all progress endpoints with real data

BASE_URL="http://localhost:3002/api"
TOKEN=""
COURSE_ID=1
LECTURE_ID=1

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Progress Tracking System Test"
echo "=================================="

# Step 1: Login to get JWT token
echo -e "\n${YELLOW}Step 1: Getting JWT Token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@example.com","password":"password123"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}✗ Failed to get token. Make sure a student user exists.${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Token obtained: ${TOKEN:0:20}...${NC}"

# Step 2: Get initial progress
echo -e "\n${YELLOW}Step 2: Get Initial Course Progress...${NC}"
PROGRESS_RESPONSE=$(curl -s -X GET "$BASE_URL/progress/$COURSE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROGRESS_RESPONSE"

# Step 3: Mark lecture as completed
echo -e "\n${YELLOW}Step 3: Mark Lecture as Complete...${NC}"
COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/progress/complete" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":$COURSE_ID,\"lectureId\":$LECTURE_ID}")

echo "Response: $COMPLETE_RESPONSE"

if echo $COMPLETE_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Lecture marked as complete${NC}"
else
  echo -e "${RED}✗ Failed to mark lecture as complete${NC}"
fi

# Step 4: Save watch time
echo -e "\n${YELLOW}Step 4: Save Watch Time...${NC}"
WATCH_RESPONSE=$(curl -s -X POST "$BASE_URL/progress/watch" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"courseId\":$COURSE_ID,\"lectureId\":$LECTURE_ID,\"watchedTime\":600}")

echo "Response: $WATCH_RESPONSE"

if echo $WATCH_RESPONSE | grep -q '"success":true'; then
  echo -e "${GREEN}✓ Watch time saved${NC}"
else
  echo -e "${RED}✗ Failed to save watch time${NC}"
fi

# Step 5: Get updated progress
echo -e "\n${YELLOW}Step 5: Get Updated Course Progress...${NC}"
PROGRESS_RESPONSE=$(curl -s -X GET "$BASE_URL/progress/$COURSE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $PROGRESS_RESPONSE"

# Extract progress percentage
PROGRESS=$(echo $PROGRESS_RESPONSE | grep -o '"progress":[0-9]*' | cut -d':' -f2)
echo -e "${GREEN}✓ Course Progress: $PROGRESS%${NC}"

# Step 6: Get detailed progress
echo -e "\n${YELLOW}Step 6: Get Detailed Progress Information...${NC}"
DETAILS_RESPONSE=$(curl -s -X GET "$BASE_URL/progress/$COURSE_ID/details" \
  -H "Authorization: Bearer $TOKEN")

echo "Response: $DETAILS_RESPONSE"

# Step 7: Test without token (should fail)
echo -e "\n${YELLOW}Step 7: Test JWT Protection (should fail)...${NC}"
NO_TOKEN_RESPONSE=$(curl -s -X GET "$BASE_URL/progress/$COURSE_ID")

echo "Response: $NO_TOKEN_RESPONSE"

if echo $NO_TOKEN_RESPONSE | grep -q '"success":false'; then
  echo -e "${GREEN}✓ JWT protection working (access denied without token)${NC}"
else
  echo -e "${RED}✗ JWT protection not working${NC}"
fi

echo -e "\n${GREEN}=================================="
echo "All tests completed!"
echo "==================================${NC}"
