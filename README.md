# Uwase Jolie Portfolio

My portfolio is styled like a Windows XP desktop.

## Build and deploy

The site source lives in the locally ignored `src/` folder. Install the build dependencies and create the production output with:

```sh
npm install
npm run build
```

Vite processes the HTML, bundles the JavaScript, and minifies the CSS and JavaScript. The build then applies JavaScript obfuscation and writes the complete site to `dist/`. Static files are copied from `public/`.

Commit the generated `dist/` folder along with deployment configuration, then push to `master` or `main`. The GitHub Actions workflow uploads only `dist/` to GitHub Pages. The deployment artifact does not include `src/`.

For local preview, run `npm run preview` after building.

## Source visibility

The `src/` directory is excluded by `.gitignore`, so Git will not add it normally. Anyone who already has repository access to older commits can still retrieve files present in the repository history. Obfuscation also cannot make browser-delivered code secret; visitors can inspect the files sent to their browsers.

## Live site

[jolie2000.github.io/portfolio-xp](https://jolie2000.github.io/portfolio-xp/)

## Project files

- `src/` contains the local HTML, CSS, and JavaScript application source (ignored by Git).
- `public/assets/` contains public images, icons, documents, and media copied into the deployment.
- `dist/` contains the built Pages site and is the only directory uploaded by the workflow.
- `scripts/build.mjs` runs Vite and obfuscates the generated JavaScript.
