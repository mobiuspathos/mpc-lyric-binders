# A ready-made box with Node.js and the Playwright browser, so the tests run the same on any computer.
# The version must match @playwright/test in package.json.
FROM mcr.microsoft.com/playwright:v1.65.1-noble
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
CMD ["npm", "test"]
