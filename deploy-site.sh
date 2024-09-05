#!/bin/bash
# Exit immediately if a pipeline returns a non-zero status.
set -e

echo "🚀 Starting deployment action"

echo "🏋️ Building website..."
bundle exec jekyll build
echo "Jekyll build done"

# Now lets go to the generated folder by Jekyll
# and perform everything else from there
cd _site

echo "☁️ Publishing website"

# We don't need the README.md file on this branch
rm -f README.md

# Now we init a new git repository inside _site
# So we can perform a commit
rm -fr .git
git init
git add .
git config --global user.name "Dhruva Karkada"
git config --global user.email dkarkada@gmail.com
# git remote set-url --add origin https://github.com/dkarkada/dkarkada.github.io.git

git commit -m "site compile - $(date)"
echo "Build branch ready to go. Pushing to Github..."
# Force push this update to our gh-pages
git push --force https://github.com/dkarkada/dkarkada.github.io.git main:gh-pages
# Now everything is ready.
# Lets just be a good citizen and clean-up after ourselves
rm -fr .git
cd ..
echo "🎉 New version deployed 🎊"