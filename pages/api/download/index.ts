import { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';
import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';
import { chromium } from 'playwright';
import rimraf from 'rimraf';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const albumLink = req.query.album as string;

  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-default-browser-check',
      '--no-first-run',
      '--disable-default-apps',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
    ],
  });
  const page = await browser.newPage();

  try {
    // Go to the album page
    await page.goto(albumLink);

    const photoLinks = await page.$$eval('[aria-label="Photo album photo"]', (elements: HTMLLinkElement[]) =>
      elements.map((element) => element.href)
    );

    console.log(`Found a total of ${photoLinks.length} photos.`);

    const photosDir = './photos';
    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir);
    }

    const controller = new AbortController();

    for (let i = 0; i < photoLinks.length; i++) {
      try {
        await page.goto(photoLinks[i]);

        const imageSelector = '[data-visualcompletion="media-vc-image"]';
        await page.waitForSelector(imageSelector);

        const filename = path.join(
          photosDir,
          `${path.basename(await page.$eval(imageSelector, (img: HTMLImageElement) => img.src)).split('.jpg')[0]}.jpg`
        );

        const photoController = new AbortController();
        const photoSignal = photoController.signal;

        // Download the photo
        const fileUrl = await page.$eval(imageSelector, (img: HTMLImageElement) => img.src);
        const response = await axios.get(fileUrl as string, {
          responseType: 'stream',
          cancelToken: new axios.CancelToken(function executor(c) {
            // Cancel the request with this controller when requested
            photoSignal.addEventListener('abort', () => {
              c();
            });
          }),
        });

        response.data.pipe(fs.createWriteStream(filename));

        console.log(`Downloading photo ${i + 1}/${photoLinks.length}...`);

        await page.waitForTimeout(1000);

        // If the request is canceled by the user, break the loop
        if (req.socket.destroyed) {
          console.log('Request was canceled by the user.');
          controller.abort();
          break;
        }

        // Abort the photo controller when the operation is complete
        photoController.abort();
      } catch (e) {
        // If an AbortError is caught, break the loop
        if (axios.isCancel(e)) {
          console.log('Request was canceled by the user.');
          controller.abort();
          break;
        } else {
          console.error(e);
          console.log('An error occurred. Please try again later.');
        }
      }
    }

    // Compress the album into a zip file
    const zip = new JSZip();
    const photos = fs.readdirSync(photosDir);

    for (let i = 0; i < photos.length; i++) {
      const photoPath = path.join(photosDir, photos[i]);
      const photoData = fs.readFileSync(photoPath);
      zip.file(photos[i], photoData);
    }

    const zipData = await zip.generateAsync({ type: 'nodebuffer' });
    const zipFilename = 'photos.zip';
    fs.writeFileSync(zipFilename, zipData);

    // Send the zip file as the response
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);
    fs.createReadStream(zipFilename).pipe(res);

    // Delete the temp folder
    rimraf.sync(photosDir);
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred!');
  } finally {
    await browser.close();
  }
}
