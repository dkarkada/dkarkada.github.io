#!/bin/bash
set -e

echo "🚀 Starting Astro deployment"
# rm -rf node_modules && npm ci

echo "🏋️ Building website..."
npx astro build
touch dist/.nojekyll
echo "Astro build done"

cd dist

echo "☁️ Publishing website"

# Now we init a new git repository inside dist
rm -fr .git
git config init.defaultBranch main
git config user.name "Dhruva Karkada"
git config user.email "dkarkada@gmail.com"
git init
git add .
git commit -m "site compile - $(date)"

echo "Build branch ready to go. Pushing to Github..."
git push --force https://github.com/dkarkada/dkarkada.github.io.git main:gh-pages

rm -fr .git
cd ..
echo "🎉 New version deployed 🎊"