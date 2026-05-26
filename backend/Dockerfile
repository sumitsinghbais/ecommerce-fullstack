# Use node:18-alpine for a lightweight image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Create uploads directory if it doesn't exist
RUN mkdir -p uploads

# Expose port 4000
EXPOSE 4000

# Use production command
CMD ["npm", "start"]
