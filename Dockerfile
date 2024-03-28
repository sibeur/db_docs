# Use an official Node.js runtime as a parent image
FROM node:16-alpine as build

# Set the working directory to /app
WORKDIR /app

# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app code to the container
COPY . .

# Build the app
RUN npm run build

# Use a smaller Node.js runtime as the final image
FROM node:16-alpine as production

# Set the working directory to /app
WORKDIR /app

# Copy the built app code from the build stage to the final image
COPY --from=build /app/dist ./dist

# Copy the package.json and package-lock.json files to the final image
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Expose the port that the app will run on
EXPOSE 3000

# Start the app
CMD [ "node", "./dist/app" ]
