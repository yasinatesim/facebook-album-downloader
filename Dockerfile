# base image
FROM node:18.0.0-alpine

# set working directory
WORKDIR /app

# copy package.json and yarn.lock files to the container
COPY package.json yarn.lock ./

# install dependencies
RUN yarn install

# copy application files to the container
COPY . .

# expose the port 3000
EXPOSE 3000

# start the application
CMD ["yarn", "dev"]