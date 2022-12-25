**Run locally**
`docker run --rm -it -p 5173:5173 -v "$(pwd)":/usr/src/app -w /usr/src/app node:18-buster yarn install`
`docker run --rm -it -p 5173:5173 -v "$(pwd)":/usr/src/app -w /usr/src/app node:18-buster yarn vite --host`
