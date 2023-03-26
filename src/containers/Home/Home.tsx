import React, { useState } from 'react';

import axios from 'axios';

import { useBeforeUnload } from '@/hooks';

import styles from './Home.module.scss';

const Home = () => {
  const [albumLink, setAlbumLink] = useState('');
  const [downloading, setDownloading] = useState(false);

  useBeforeUnload(downloading);

  const handleDownload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // If an empty link is submitted, stop the process
    if (!albumLink) {
      alert('Please enter an album link.');
      return;
    }

    // Start the download process
    try {
      const source = axios.CancelToken.source();
      setDownloading(true);

      const response = await axios.get(`/api/download?album=${encodeURIComponent(albumLink)}`, {
        responseType: 'blob',
        cancelToken: source.token,
      });

      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'photos.zip';
      link.click();
    } catch (error) {
      console.error(error);
      alert('An error occurred. Please try again later.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <form onSubmit={handleDownload}>
          <input
            className={styles.input}
            type="text"
            placeholder="Facebook Album Link"
            value={albumLink}
            onChange={(e) => setAlbumLink(e.target.value)}
          />
          <button className={styles.button} type="submit" disabled={downloading}>
            {downloading ? 'Downloading...' : 'Download'}
          </button>
          {downloading && <div className={styles.loading}>Download in progress...</div>}
        </form>
      </div>
    </div>
  );
};

export default Home;
