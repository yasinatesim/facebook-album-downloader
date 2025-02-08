import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import fs from 'fs';
import JSZip from 'jszip';
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
    return res.status(400).json({ error: "Album URL is required" });
  }

  const rootDir = process.cwd();
  const photosDir = path.join(rootDir, 'photos');

  const browser = await puppeteer.launch({
    headless: true, // Change to false for debugging
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
  });

  const page = await browser.newPage();

  try {
    console.log(`Navigating to: ${albumLink}`);
    await page.goto(albumLink, { waitUntil: 'networkidle2', timeout: 60000 });

    // Close any popups (if present)
    const closeButton = await page.$('[aria-label="Close"]');
    if (closeButton) {
      await closeButton.click();
      console.log("Closed popup.");
    }

    if (!fs.existsSync(photosDir)) {
      fs.mkdirSync(photosDir);
    }

    let allDownloadedImages = new Set<string>();

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

    // Extract all visible images after scrolling
    console.log("Extracting all visible images...");
    const visibleImages = await page.evaluate(() => {
      const imgs = document.querySelectorAll<HTMLImageElement>('img[src*="fbcdn.net"]');
      return Array.from(imgs).map(img => img.src);
    });

    console.log(`Found ${visibleImages.length} images. Downloading...`);
    await downloadImages(visibleImages, photosDir);

    console.log("All images downloaded. Creating ZIP file...");
    const zipFilename = await createZip(photosDir);

    if (!fs.existsSync(zipFilename)) {
      throw new Error("ZIP file was not created. Check image downloads.");
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=photos.zip`);
    fs.createReadStream(zipFilename).pipe(res);

    console.log("Download complete. Waiting for response to finish...");

    res.on('finish', () => {
      console.log("Cleaning up downloaded images and ZIP file...");
      rimraf.sync(photosDir);
      fs.unlinkSync(zipFilename);
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "An error occurred while processing the request." });
  } finally {
    await browser.close();
  }
}

/**
 * Downloads images from given URLs.
 */
async function downloadImages(imageUrls: string[], photosDir: string) {
  for (let i = 0; i < imageUrls.length; i++) {
    try {
      const fileUrl = imageUrls[i];
      const filename = path.join(photosDir, `photo_${Date.now()}_${i + 1}.jpg`);

      const response = await axios.get(fileUrl, { responseType: 'stream' });
      response.data.pipe(fs.createWriteStream(filename));

      console.log(`Downloaded ${i + 1}/${imageUrls.length}...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Prevent rate limiting
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
    throw new Error("No photos were downloaded. Cannot create ZIP.");
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