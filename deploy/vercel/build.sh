#!/usr/bin/env bash
# Vercel build: pull the source from GitHub and emit a Build Output API v3 bundle.
set -euo pipefail
REPO="${SOURCE_REPO:-https://github.com/dynsrv/capital-flow-terminal-}"
REF="${SOURCE_REF:-main}"
rm -rf src_tmp && git clone --depth 1 --branch "$REF" "$REPO" src_tmp
OUT=.vercel/output
rm -rf "$OUT" && mkdir -p "$OUT/static" "$OUT/functions/api.func"
cp -r src_tmp/public/. "$OUT/static/"
npx --yes esbuild@0.24.2 src_tmp/api/index.js --bundle --format=esm --platform=browser --target=es2022 --outfile="$OUT/functions/api.func/index.js" --log-level=warning
cat > "$OUT/functions/api.func/.vc-config.json" <<'JSON'
{ "runtime": "edge", "entrypoint": "index.js" }
JSON
cat > "$OUT/config.json" <<'JSON'
{ "version": 3,
  "crons": [ { "path": "/api/cron/refresh", "schedule": "0 22 * * *" } ],
  "routes": [
    { "src": "^/api(?:/.*)?$", "dest": "/api" },
    { "handle": "filesystem" },
    { "src": "^/vendor/(.*)$", "headers": { "cache-control": "public, max-age=31536000, immutable" }, "continue": true },
    { "src": "^/(?!api).*$", "dest": "/index.html" }
  ]
}
JSON
echo "build output:"; find "$OUT" -maxdepth 3 -type f | head -20; du -sh "$OUT/functions/api.func/index.js"
