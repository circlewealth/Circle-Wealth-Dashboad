# Deployment Guide

This document outlines the steps to deploy this application on Render and explains the benefits of using Nginx in production.

## Project Overview

This project consists of:
- A React frontend built with Vite
- An Express.js backend API
- SQLite databases for data storage

## Deploying to Render

### Option 1: Using render.yaml (Recommended)

1. **Push your code to a Git repository** (GitHub, GitLab, etc.)

2. **Connect your repository to Render**:
   - Create a Render account at https://render.com
   - Go to Dashboard and click "New" > "Blueprint"
   - Connect your Git repository
   - Render will automatically detect the `render.yaml` file and create the services

3. **Upload database files**:
   - After services are created, go to the backend service (index-comparison-api)
   - Navigate to the "Disks" tab
   - Upload your `database.db` and `final.db` files to the `/data` directory

4. **Verify deployment**:
   - Check that both services are running
   - Visit the frontend URL to ensure the application is working correctly

### Option 2: Manual Setup

If you prefer to set up services manually:

1. **Backend Service**:
   - Create a new Web Service on Render
   - Connect your repository
   - Set build command: `npm install`
   - Set start command: `node server.js`
   - Add environment variables:
     - `NODE_ENV`: `production`
     - `PORT`: `3001`
   - Create a disk and mount it at `/data`
   - Upload database files to the disk

2. **Frontend Service**:
   - Create a new Static Site on Render
   - Connect your repository
   - Set build command: `npm install && npm run build`
   - Set publish directory: `dist`
   - Add the following rewrites:
     - Source: `/api/*`, Destination: `https://your-backend-service.onrender.com/api/:splat`
     - Source: `/*`, Destination: `/index.html`

## Benefits of Using Nginx

Nginx can significantly improve the performance and security of your application in production:

### Performance Benefits

1. **Static File Serving**: Nginx excels at serving static files (HTML, CSS, JS, images) much faster than Node.js, reducing server load.

2. **Caching**: The provided `nginx.conf` includes caching configurations for static assets, improving load times for returning users.

3. **Compression**: Gzip compression is enabled to reduce bandwidth usage and improve page load speed.

4. **Load Balancing**: If you scale to multiple backend instances, Nginx can distribute traffic efficiently.

### Security Benefits

1. **Reverse Proxy**: Nginx acts as a buffer between clients and your application server, hiding server details.

2. **SSL/TLS Termination**: Nginx can handle HTTPS connections efficiently, reducing the load on your application server.

3. **Rate Limiting**: Can be configured to prevent abuse by limiting request rates.

4. **Security Headers**: The configuration adds important security headers to responses.

### Implementation Options

1. **On Render**: Render doesn't directly support custom Nginx configurations, but you can:
   - Use the provided `Dockerfile` which could be extended to include Nginx
   - Use Render's built-in CDN for static assets

2. **Self-hosted or other platforms**:
   - Use the provided `docker-compose.yml` and `nginx.conf` for a complete setup
   - Deploy to platforms that support custom Nginx configurations (AWS, DigitalOcean, etc.)

## Database Considerations

For production deployment:

1. **SQLite Limitations**:
   - SQLite works well for read-heavy applications with moderate traffic
   - Not suitable for applications with high write concurrency
   - Consider migrating to PostgreSQL for higher traffic applications

2. **Database Backups**:
   - Set up regular backups of your database files
   - Render's disk persistence is reliable but backups are still recommended

3. **Database Updates**:
   - To update database files, upload new versions to the disk in Render
   - Consider implementing a database migration strategy for future updates

## Monitoring and Scaling

1. **Monitoring**:
   - Use Render's built-in logs and metrics
   - Consider adding application monitoring (New Relic, Datadog, etc.)

2. **Scaling**:
   - Render allows easy scaling of web services
   - For higher traffic, consider separating the frontend and backend completely
   - Implement database caching for frequently accessed data

## Troubleshooting

Common issues and solutions:

1. **Database Connection Errors**:
   - Verify database files are uploaded to the correct location
   - Check file permissions

2. **API Connection Issues**:
   - Ensure the frontend is correctly configured to connect to the backend
   - Check CORS settings in the server.js file

3. **Performance Issues**:
   - Enable Render's automatic scaling
   - Optimize database queries
   - Implement caching for expensive operations