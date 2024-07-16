FROM node:lts-alpine
VOLUME /data
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
RUN npm rebuild classic-level --build-from-source
COPY . .
EXPOSE 3000
RUN mkdir /data && chown -R node /usr/src/app /data
USER node
CMD ["npm", "start"]
