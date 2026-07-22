import "dotenv/config";
import app from "./app.js";

// Vercel's Express framework preset auto-detects this file by name
// (src/server.js) and by the app.listen() call below; in production the
// port is only used for local dev, Vercel routes requests to this server
// directly without needing an api/ functions directory.
const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
