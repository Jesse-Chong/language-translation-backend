// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const PORT = 5888;
const API_KEY = process.env.LOKALISE_API_KEY
const PROJECT_ID = process.env.LOKALISE_PROJECT_ID

app.use(cors());

async function download(translationsUrl, archive) {
  try {
    const { default: got } = await import('got');
    const response = await got.get(translationsUrl, {
      headers: {
        'X-Api-Token': API_KEY
      },
    }).buffer();
    fs.writeFileSync(archive, response);
  } catch (error) {
    console.log(error);
  }
}

app.get('/translations/:lng', async (req, res) => {
  const { lng } = req.params;

  try {
    const { LokaliseApi } = await import('@lokalise/node-api');
    const lokaliseApi = new LokaliseApi({ apiKey: API_KEY });
    const i18nFolder = path.resolve(__dirname, 'translations');
    const downloadResponse = await lokaliseApi.files().download(PROJECT_ID, {
      format: 'json',
      original_filenames: true,
      directory_prefix: '',
      filter_langs: [lng],
      indentation: '2sp',
    }, {
      headers: {
        'X-Api-Token': API_KEY
      },
    });

    const translationsUrl = downloadResponse.bundle_url;
    const archive = path.resolve(i18nFolder, 'archive.zip');

    await download(translationsUrl, archive);

    const zip = new AdmZip(archive);
    zip.extractAllTo(i18nFolder, true);

    fs.unlink(archive, (err) => {
      if (err) throw err;
    });

    const translationFile = path.resolve(i18nFolder, `${lng}.json`);
    const translations = JSON.parse(fs.readFileSync(translationFile, 'utf8'));

    res.json(translations);
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`); 
});