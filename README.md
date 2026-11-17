# DAV_PRODUCT_GITHUB-RESPOSITORY
GITHUB PROJECT

## Run locally

Create a `.env` file with an optional GitHub personal access token:

```env
GITHUB_TOKEN=your_github_token
```

Then run `npm install` and `npm run dev`. The Vite frontend proxies `/api` requests to the local Express server.

## Deploy to Vercel

Import the repository into Vercel and deploy the Vite project. The handlers in `api/` provide the search, status, and repository analytics endpoints as Vercel Serverless Functions. Set `GITHUB_TOKEN` in the Vercel project's Environment Variables for higher GitHub API limits; the token is only used server-side.
