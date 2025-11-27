#!/bin/bash

echo "🚀 Starting Frontend Deployment..."

echo "📦 Pulling latest changes from GitHub..."
git fetch origin
git reset --hard origin/main

echo "📥 Installing dependencies..."
npm install --production

echo "🏗 Building frontend (Vite)..."
npm run build

echo "🧹 Clearing old Nginx HTML files..."
rm -rf /var/www/html/*

echo "🚀 Deploying new build to Nginx root..."
cp -r dist/* /var/www/html/

echo "🔄 Restarting Nginx..."
systemctl restart nginx

echo "📁 Deployment completed!"
echo "🌐 Live at https://tickyapp.com"

