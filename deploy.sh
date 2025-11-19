#!/bin/bash
set -e

echo "Building Next.js app..."
npm run build

echo "Deploying to Firebase..."
firebase deploy

