FROM alpine:3.20
RUN apk add --no-cache ca-certificates
ARG TARGETPLATFORM
COPY ${TARGETPLATFORM}/pgdesigner /usr/local/bin/pgdesigner
WORKDIR /work
EXPOSE 8080
ENTRYPOINT ["pgdesigner"]
