#!/usr/bin/env bash
set -e
API=http://localhost:3000
echo "→ Health"; curl -s $API/health | jq .
echo "→ Practice"; curl -s $API/practice/categories | jq '.[0]'
echo "→ Users"; curl -s $API/users/profile | jq .
echo "→ Stats"; curl -s $API/stats/overview | jq '.level,.xp'
echo "✓ API smoke OK"
