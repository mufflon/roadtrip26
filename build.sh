#!/usr/bin/env bash
# Compile the human-authored YAML in content/ into data/sites.js and
# data/trails.js, then validate. Run this after editing anything under content/.
# `npm run build` and the CI pipelines call the same two steps.
set -euo pipefail
cd "$(dirname "$0")"
node tools/build-data.mjs
node tools/check-data.mjs
