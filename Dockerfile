FROM node:lts-alpine3.15

RUN apk update
RUN apk add git
RUN apk add docker

WORKDIR /app

COPY package.json .

RUN npm i

COPY . .

CMD ["npm", "start"]