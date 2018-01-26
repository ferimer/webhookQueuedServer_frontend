FROM node:8

LABEL MAINTAINER="Ferimer, Servicios Informáticos <devteam@ferimer.es>"

WORKDIR /opt
COPY src/ .

RUN yarn
USER node

EXPOSE 3000

ENTRYPOINT [ "node", "index.js" ]