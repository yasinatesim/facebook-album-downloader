import { NextApiRequest, NextApiResponse } from 'next';

import axios from 'axios';
import fs, { mkdtempSync } from 'fs';
import JSZip from 'jszip';
import os from 'os';
import path from 'path';
import puppeteer from 'puppeteer';
import rimraf from 'rimraf';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '200mb',
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const albumLink = req.query.album as string;
  if (!albumLink) {
    return res.status(400).json({ error: 'Album URL is required' });
  }

  // Platform detection
  const platform = os.platform();
  const isMac = platform === 'darwin';
  // const isLinux = platform === 'linux';

  // Setup directories based on platform
  let tempDir: string;
  let browserConfig: any;

  if (isMac) {
    tempDir = mkdtempSync(path.join(os.tmpdir(), 'puppeteer-'));
    browserConfig = {
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-default-apps',
        '--no-sandbox',
        '--single-process',
        '--disable-setuid-sandbox',
        '--no-zygote',
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        `--user-data-dir=${tempDir}`,
      ],
    };
  } else {
    // Linux or other platforms
    const rootDir = process.cwd();
    tempDir = rootDir;
    browserConfig = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-default-browser-check',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--ignore-certificate-errors-spki-list',
        `--user-data-dir=${rootDir}`,
      ],
    };
  }

  const photosDir = path.join(process.cwd(), 'photos');

  const browser = await puppeteer.launch(browserConfig);
  const page = await browser.newPage();

  // Set user agent for Mac (second approach)
  if (isMac) {
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
  }

  try {
    console.log(`Navigating to: ${albumLink}`);
    await page.goto(albumLink, { waitUntil: 'networkidle2', timeout: 60000 });

    // Close any popups (if present)
    const closeButton = await page.$('[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
      console.log('Closed popup.');
    }

    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir);
    }

    // Find the list element and scroll through all content
    const list = await page.$('[role="list"]');
    if (list) {
      const scrollableParent = await list.evaluateHandle((el: Element) => el.parentElement?.parentElement);
      await page.evaluate(async (scrollable: any) => {
        // Function to determine if an element is scrollable
        function isScrollable(element: Element) {
          return element.scrollHeight > element.clientHeight;
        }
        if (isScrollable(scrollable)) {
          while (true) {
            const atBottom = await new Promise<boolean>((resolve) => {
              const lastScrollTop = scrollable.scrollTop;
              scrollable.scrollTo({ top: scrollable.scrollHeight });
              setTimeout(() => {
                resolve(lastScrollTop === scrollable.scrollTop);
              }, 1500); // Adjust delay as needed
            });
            if (atBottom) break;
          }
        }
      }, scrollableParent);
    }

    // Use Mac approach (individual photo links) or Linux approach (direct image extraction)
    if (isMac) {
      // Mac approach: Extract photo links and visit each one
      // @ts-ignore
      const photoLinks = await page.evaluate(() => {
        let links = [];
        let photos = document.querySelectorAll<HTMLLinkElement>('[aria-label="Photo album photo"]');
        for (let i = 0; i < photos.length; i++) {
          links.push(photos[i].href);
        }
        return links;
      });

      console.log(`Found a total of ${photoLinks.length} photos.`);

      const controller = new AbortController();

      for (let i = 0; i < photoLinks.length; i++) {
        try {
          await page.goto(photoLinks[i]);

          const imageSelector = '[data-visualcompletion="media-vc-image"]';
          await page.waitForSelector(imageSelector);

          const filename = path.join(
            photosDir,
            // @ts-ignore
            `${path.basename(await page.$eval(imageSelector, (img: any) => img.src)).split('.jpg')[0]}.jpg`
          );

          const photoController = new AbortController();
          const photoSignal = photoController.signal;

          // Download the photo
          // @ts-ignore
          const fileUrl = await page.$eval(imageSelector, (img: any) => img.src);

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
    } else {
      // Linux approach: Extract all visible images directly
      console.log('Extracting all visible images...');
      const visibleImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll<HTMLImageElement>('[role="list"] img[src*="fbcdn.net"]');
        return Array.from(imgs).map((img) => img.src);
      });

      console.log(`Found ${visibleImages.length} images. Downloading...`);
      await downloadImages(visibleImages, photosDir);
    }

    console.log('All images downloaded. Creating ZIP file...');
    const zipFilename = await createZip(photosDir);

    if (!fs.existsSync(zipFilename)) {
      throw new Error('ZIP file was not created. Check image downloads.');
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=photos.zip`);
    fs.createReadStream(zipFilename).pipe(res);

    console.log('Download complete. Waiting for response to finish...');

    res.on('finish', () => {
      console.log('Cleaning up downloaded images and ZIP file...');
      rimraf.sync(photosDir);
      fs.unlinkSync(zipFilename);

      // Clean up temp directory for Mac
      if (isMac && fs.existsSync(tempDir)) {
        rimraf.sync(tempDir);
      }
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'An error occurred while processing the request.' });
  } finally {
    await browser.close();
  }
}

/**
 * Downloads images from given URLs (Linux approach).
 */
async function downloadImages(imageUrls: string[], photosDir: string) {
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const fileUrl = imageUrls[i];
      const filename = path.join(photosDir, `photo_${Date.now()}_${i + 1}.jpg`);

      const response = await axios.get(fileUrl, { responseType: 'stream' });
      response.data.pipe(fs.createWriteStream(filename));

      console.log(`Downloaded ${i + 1}/${imageUrls.length}...`);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Prevent rate limiting
    } catch (error) {
      console.error(`Error downloading image ${i + 1}:`, error);
    }
  }
}

/**
 * Creates a ZIP file from the downloaded images.
 */
async function createZip(photosDir: string): Promise<string> {
  const zip = new JSZip();
  const photos = fs.readdirSync(photosDir);

  if (photos.length === 0) {
    throw new Error('No photos were downloaded. Cannot create ZIP.');
  }

  for (const photo of photos) {
    const photoPath = path.join(photosDir, photo);
    const photoData = fs.readFileSync(photoPath);
    zip.file(photo, photoData);
  }

  const zipFilename = path.join(process.cwd(), 'photos.zip');
  const zipData = await zip.generateAsync({ type: 'nodebuffer' });

  fs.writeFileSync(zipFilename, zipData);
  console.log(`ZIP file created at: ${zipFilename}`);

  return zipFilename;
}
