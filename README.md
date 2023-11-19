<h3 align="center">
  <br />
   <a  href="https://github.com/yasinatesim/facebook-album-downloader"><img src="https://yasinates.com/facebook-album-downloader.png" alt="Facebook Album Downloader" width="200" /></a>
  <br />
Facebook Album Downloader
  <br />
</h3>

<hr />

<p  align="center">A simple web application that allows users to download Facebook albums in full resolution.</p>

<p align="center">
  · <a href="https://github.com/yasinatesim/facebook-album-downloader/issues">Report Bug</a>
  · <a href="https://github.com/yasinatesim/facebook-album-downloader/issues">Request Feature</a>
</p>

## 📖 About

Facebook Album Downloader is a web application that allows users to download Facebook photo albums in full resolution. Simply enter the link to the album you want to download, and the application will create a ZIP archive containing all photos from the album.

### 📚 Tech Stack

<table>
</tr>
  <tr>
  <td><a href="https://pptr.dev/">Puppeteer</a></td>
  <td>A Node library for controlling headless Chrome or Chromium browsers</td>
</tr>
<tr>
  <td><a href="https://axios-http.com/">Axios</a></td>
  <td>A promise-based HTTP client for the browser and Node.js</td>
</tr>
<tr>
  <td><a href="https://www.npmjs.com/package/jszip">JSZip</a></td>
  <td>A JavaScript library for creating, reading, and editing ZIP archives</td>
  <tr>
    <td><a href="https://nextjs.org/">Next.js</a></td>
    <td>The React Framework for SEO Friendly website and more...</td>
  </tr>
  <tr>
  <td><a href="https://reactjs.org/">React</a></td>
  <td>A JavaScript library for building user interfaces</td>
</tr>
 <tr>
    <td> <a href="https://github.com/skratchdot/react-github-corner">skratchdot/react-github-corner</a></td>
    <td>Add a Github banner to your project page for React</td>
  </tr>
  <tr>
    <td> <a href="https://github.com/conventional-changelog/commitlint">Commitlint</a></td>
    <td>Send commit messages to <a href="https://www.conventionalcommits.org/en/v1.0.0/">conventional commits</a> rules</td>
  </tr>
  <tr>
    <td><a href="https://www.typescriptlang.org/">TypeScript</a></td>
    <td>TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.</td>
  </tr>
  <tr>
    <td><a href="https://sass-lang.com/">SASS</a></td>
    <td>The most mature, stable, and powerful professional grade CSS extension language in the world</td>
  </tr>
  <tr>
    <td><a href="https://editorconfig.org/">Editorconfig</a></td>
    <td>Helps maintain consistent coding styles for my working on the same project across various editors and IDEs</td>
  </tr>
  <tr>
    <td><a href="https://eslint.org/">Eslint</a></td>
    <td>Find and fix problems in your JavaScript code</td>
  </tr>
  <tr>
    <td><a href="https://prettier.io/">Prettier</a></td>
    <td>An opinionated code formatter</td>
  </tr>
</table>

## 🧐 What's inside?

### Features

The main feature of this application is to allow users to download Facebook albums after entering the album link. When users enter a Facebook album link and click the "download" button, the application uses a tool called Puppeteer to scrape the HTML of the album and then presents these files as a downloadable ZIP file. Additionally, the application also includes a feature that warns the user if they are leaving the page while the download process may not have been completed yet.

## Structure

- `pages` - Contains top-level pages of the application.
  - `api` - Contains serverless API endpoints.
    - `download.ts` - Downloads a Facebook album using Puppeteer to scrape the HTML.
  - `index.tsx` - Renders the root component into the DOM.

The `src` directory contains the following:

- `styles` - Contains global styles.
  `global.scss` - Global SCSS stylesheet.
- `containers`
  - `Home` - Contains the main component of the application.
    - `Home.module.scss` - Local SCSS stylesheet for the Home component.
    - `Home.tsx` - Renders a form that allows users to input a Facebook album link and start downloading it.
- `Hooks`
  `index.ts` - Exports all custom hooks.
  `useBeforeUnload.ts` - Provides a hook that warns the user before leaving the page if a download is in progress.

## Getting Started

### 📦 Prerequisites

- Node (v17.0.0+)

- Npm (v8.1.0+)

### ⚙️ How To Use

1.  Clone this repository

```bash
git clone https://github.com/yasinatesim/facebook-album-downloader.git
```

2. Install the project dependencies

```bash
yarn install
```

**For Development**

```bash
yarn dev
```

### For Docker

2. Change the directory

```bash
cd facebook-album-downloader
```

3. Rename .env.example file to .env

4. Run this command **without `yarn` or `yarn install`**

```bash
yarn setup
```

or

```bash
yarn && docker-compose up --build

# or

# For Build
docker build -t facebook-album-downloader .

# For Run
docker run -p 3000:3000 facebook-album-downloader
```

App is running on [http://localhost:3000](http://localhost:3000)

**For Production Build &amp; Build Start**

```bash
yarn build
```

and

```bash
yarn start
```

**For Lint &amp; Format**

```bash
yarn lint
yarn format
```

## 🔑 License

- Copyright © 2023 - MIT License.

See [LICENSE](https://github.com/yasinatesim/facebook-album-downloader/blob/main/LICENSE) for more information.

---

_This README was generated with by [markdown-manager](https://github.com/yasinatesim/markdown-manager)_ 🥲
