// backend/server.js
const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const PORT = 5888;
const axios = require('axios');
const API_KEY = process.env.LOKALISE_API_KEY
const PROJECT_ID = process.env.LOKALISE_PROJECT_ID

app.use(cors());

async function downloadTranslations() {
  try {
    const options = {
      method: 'POST',
      url: `https://api.lokalise.com/api2/projects/${PROJECT_ID}/files/download`,
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'X-Api-Token': API_KEY
      },
      data: {
        plural_format: 'i18next',
        format: 'json',
        original_filenames: true,
        directory_prefix: '%LANG_ISO%'
      }
    };

    const response = await axios.request(options);
    console.log('Download response:', response.data);

    const translationsUrl = response.data.bundle_url;
    const i18nFolder = path.resolve(__dirname, 'translations');
    const archive = path.resolve(i18nFolder, 'archive.zip');

    const translationsResponse = await axios.get(translationsUrl, {
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(archive);
    translationsResponse.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading translations:', error);
    throw error;
  }
}

async function extractTranslations() {
  const i18nFolder = path.resolve(__dirname, 'translations');
  const archive = path.resolve(i18nFolder, 'archive.zip');

  try {
    const zip = new AdmZip(archive);
    zip.extractAllTo(i18nFolder, true);
    console.log('Extracted files:', fs.readdirSync(i18nFolder));
  } catch (error) {
    console.error('Error extracting translations:', error);
    throw error;
  }
}

app.get('/translations', async (req, res) => {
  try {
    await downloadTranslations();
    await extractTranslations();

    const i18nFolder = path.resolve(__dirname, 'translations');
    const translationFiles = fs.readdirSync(i18nFolder).filter(file => file.endsWith('.json'));
    const translations = {};

    translationFiles.forEach(file => {
      const languageCode = file.split('.')[0];
      const filePath = path.resolve(i18nFolder, file);
      const fileContent = fs.readFileSync(filePath, 'utf8');

      if (fileContent.trim() !== '') {
        try {
          translations[languageCode] = JSON.parse(fileContent);
        } catch (error) {
          console.error(`Error parsing translation file ${file}:`, error);
        }
      } else {
        console.warn(`Skipping empty translation file: ${file}`);
      }
    });

    res.json(translations);
  } catch (error) {
    console.error('Error fetching translations:', error);
    res.status(500).json({ error: 'Failed to fetch translations' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`); 
});