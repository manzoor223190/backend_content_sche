# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Install dependencies based on the lockfile
COPY package*.json ./
RUN npm install 
RUN npm ci --omit=dev

# Bundle the rest of the application source
COPY . .

# Set environment variables for production
ENV NODE_ENV=production

# Expose the port that the app listens on
EXPOSE 5000

# Start the server
CMD ["node", "index.js"]
