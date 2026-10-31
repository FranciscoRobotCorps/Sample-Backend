#!/bin/bash

# Start the application in the background
docker run -d -p 3000:3000 --name hermes-test -e DB_USER=test -e DB_PASSWORD=test -e DB_NAME=test hermes-api:latest

# Wait for the application to start
 sleep 5

# Test the health endpoint
echo "Testing health endpoint..."
curl -X GET http://localhost:3000/health

# Test the todo endpoints
echo -e "\nTesting todo endpoints..."
curl -X GET http://localhost:3000/api/todos

# Stop the application
docker stop hermes-test
docker rm hermes-test
