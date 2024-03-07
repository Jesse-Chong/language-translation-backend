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

// The function essentially makes a POST request to the Lokalise API to initiate the translation download, retrieves the URL of the ZIP bundle from the response, downloads the ZIP bundle using a second request with a readable stream, and saves the bundle to the specified file path using a writable stream. The Promise-based approach allows for asynchronous handling of the download process.

// The options object is created with the necessary configuration for making a POST request to the Lokalise API using Axios. It includes the URL, headers, and data to be sent in the request body.
// The response variable is assigned the result of making the POST request using axios.request(options). This response contains the data returned by the Lokalise API.
// The translationsUrl variable is assigned the value of response.data.bundle_url, which represents the URL of the ZIP bundle containing the translation files.
// The i18nFolder variable is assigned the absolute path to the "translations" directory using path.resolve(__dirname, 'translations'). This ensures that the path is correctly resolved regardless of the current working directory.
// The archive variable is assigned the absolute path to the "archive.zip" file within the "translations" directory using path.resolve(i18nFolder, 'archive.zip'). This represents the location where the downloaded ZIP bundle will be saved.
// A second request is made using axios.get(translationsUrl, { responseType: 'stream' }) to download the ZIP bundle from the translationsUrl. By setting responseType to 'stream', the response is treated as a readable stream instead of being automatically parsed.
// The writer variable is created using fs.createWriteStream(archive), which creates a writable stream for the "archive.zip" file. This allows data to be written to the file continuously.
// The pipe method is used to connect the readable stream (translationsResponse.data) to the writable stream (writer). This automatically handles the data flow from the response to the file, saving the ZIP bundle to the specified file path.
// A new Promise is returned with a callback function that resolves when the writable stream finishes writing the data (using writer.on('finish', resolve)) and rejects if an error occurs during the writing process (using writer.on('error', reject)).
// If an error occurs during the download process, it is caught in the catch block, logged using console.error, and the error is thrown to be handled by the calling code.

async function downloadTranslations() {
  try {
    const options = {
      method: 'POST',
      url: `https://api.lokalise.com/api2/projects/${PROJECT_ID}/files/download`,
      headers: {
        // client expects json response from server
        accept: 'application/json',
        // Specify that request body is JSON format
        'content-type': 'application/json',
        // accept api token for authentification
        'X-Api-Token': API_KEY
      },
      // data is basically sending raw json data in the body in postman
      data: {
        // The plural_format option is used to specify the format of the plural keys in the translation files. 
        // Different libraries and frameworks have their own conventions for handling pluralization in translations, 
        // and the plural_format option allows you to specify the format that matches your project's requirements.
        plural_format: 'i18next',
        format: 'json',
        // keep the exact filename thats on lokalise account
        original_filenames: true,
        // %LANG_ISO% is a placeholder
        directory_prefix: '%LANG_ISO%'
      }
    };

    // 
    const response = await axios.request(options);
    console.log('Download response:', response.data);


    const translationsUrl = response.data.bundle_url;
    // find the absolute path to translations folder
    const i18nFolder = path.resolve(__dirname, 'translations');
    const archive = path.resolve(i18nFolder, 'archive.zip');
    // By setting responseType to 'stream', it indicates that the response should be treated as a readable stream instead of being automatically parsed as JSON or text.
    // This allows you to handle the response data as a stream and pipe it to a write stream.
    const translationsResponse = await axios.get(translationsUrl, {
      responseType: 'stream'
    });
    // fs.createWriteStream is a method from the Node.js fs (file system) module that creates a writable stream for a file.
    // It takes the file path (archive) as an argument and returns a write stream object.
    // The write stream allows you to write data to the file continuously.
    const writer = fs.createWriteStream(archive);
//     The pipe method is used to connect a readable stream (in this case, the response data from axios.get) to a writable stream (the write stream created with fs.createWriteStream).
// It automatically handles the data flow from the readable stream to the writable stream, so you don't have to manually read and write the data.
// In this case, it pipes the response data (the ZIP archive) to the write stream, effectively saving the ZIP archive to the specified file path.
    translationsResponse.data.pipe(writer);

    // return a new Promise that resolves when the write stream finishes writing the data and rejects if an error occurs.
    // The Promise constructor takes a callback function with two arguments: resolve and reject.
    // resolve is called when the write stream finishes successfully, indicating that the download is complete.
    // reject is called if an error occurs during the writing process.
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading translations:', error);
    throw error;
  }
}
// ************************************************************

// The extractTranslations function assumes that the ZIP archive has already been downloaded and is available at the specified archive path. 
// It focuses on extracting the contents of the ZIP archive to the desired directory.

// The i18nFolder variable is assigned the absolute path to the "translations" directory using path.resolve(__dirname, 'translations'). This ensures that the path is correctly resolved regardless of the current working directory.
// The archive variable is assigned the absolute path to the "archive.zip" file within the "translations" directory using path.resolve(i18nFolder, 'archive.zip'). This represents the location of the ZIP archive that needs to be extracted.
// An instance of AdmZip is created by passing the archive variable, which represents the path to the ZIP archive file. The AdmZip library provides functionality to work with ZIP archives.
// The extractAllTo method is called on the AdmZip instance, specifying the i18nFolder as the destination directory where the files should be extracted. The second argument true indicates that existing files in the destination directory should be overwritten if they already exist.
// The fs.readdirSync method is used to synchronously read the contents of the i18nFolder directory. It returns an array of file names in that directory. This is used to get the list of extracted translation files.
// The list of extracted files is logged to the console using console.log('Extracted files:', fs.readdirSync(i18nFolder)).
// After extracting the files from the ZIP archive, it uses fs.readdirSync(i18nFolder) to get the list of subdirectories in the i18nFolder.
// It filters the subdirectories using filter(dir => fs.statSync(path.join(i18nFolder, dir)).isDirectory()) to include only the language code subdirectories.
// It iterates over each language code subdirectory using languageDirs.forEach(languageDir => { ... }).
// For each language code subdirectory, it constructs the path to the subdirectory using path.join(i18nFolder, languageDir).
// It uses fs.readdirSync(languageDirPath) to get the list of JSON files in the language code subdirectory and filters them using filter(file => file.endsWith('.json')).
// It iterates over each JSON file using jsonFiles.forEach(jsonFile => { ... }).
// For each JSON file, it constructs the old path using path.join(languageDirPath, jsonFile) and the new path using path.join(languageDirPath, ${languageDir}.json).
// It renames the JSON file from the old path to the new path using fs.renameSync(oldPath, newPath), effectively changing the file name to the language code.
// After renaming all the JSON files, it logs a success message to the console.
// If an error occurs during the extraction process, it is caught in the catch block, logged using console.e

async function extractTranslations() {
  const i18nFolder = path.resolve(__dirname, 'translations');
  const archive = path.resolve(i18nFolder, 'archive.zip');

//   AdmZip is a library that provides functionality to work with ZIP archives.
// An instance of AdmZip is created by passing the path to the ZIP archive file (archive).
// The extractAllTo method is used to extract all the files from the ZIP archive to a specified directory (i18nFolder).
// The second argument true indicates that the extraction should overwrite existing files if they already exist in the destination directory.
  try {
    const zip = new AdmZip(archive);
    zip.extractAllTo(i18nFolder, true);
//     fs.readdirSync is a method from the Node.js fs module that reads the contents of a directory synchronously.
// It takes the directory path (i18nFolder) as an argument and returns an array of file names in that directory.
// In this case, it is used to get the list of extracted translation files.
    console.log('Extracted files:', fs.readdirSync(i18nFolder));
    
    // fs.readdirSync(i18nFolder):
    // fs.readdirSync is a synchronous function from the Node.js fs (file system) module that reads the contents of a directory.
    // It takes the directory path (i18nFolder) as an argument and returns an array of file and directory names in that directory.
    // In this case, it reads the contents of the i18nFolder directory synchronously.

    // .filter(dir => ...):
    // The filter method is called on the array returned by fs.readdirSync(i18nFolder).
    // It takes a callback function as an argument, which is executed for each element in the array.
    // The callback function receives each element (directory or file name) as the dir parameter.
    // The filter method creates a new array with only the elements that pass the test implemented by the callback function.

    // fs.statSync(path.join(i18nFolder, dir)):
    // path.join(i18nFolder, dir) combines the i18nFolder path and the current dir name to create the full path to the directory or file.
    // fs.statSync is a synchronous function from the fs module that retrieves information about a file or directory.
    // It takes the file or directory path as an argument and returns an fs.Stats object containing information about the file or directory.
    // In this case, it retrieves the information about the directory or file specified by path.join(i18nFolder, dir).

    // .isDirectory():
    // The isDirectory method is called on the fs.Stats object returned by fs.statSync.
    // It returns true if the fs.Stats object represents a directory, and false otherwise.
    // In this case, it checks if the current dir is a directory.

    // So, putting it all together:
    // fs.readdirSync(i18nFolder) reads the contents of the i18nFolder directory and returns an array of file and directory names.
    // .filter(dir => ...) filters the array of file and directory names based on the provided callback function.
    // For each element (dir) in the array, the callback function is executed:
    // path.join(i18nFolder, dir) creates the full path to the directory or file.
    // fs.statSync(path.join(i18nFolder, dir)) retrieves the information about the directory or file.
    // .isDirectory() checks if the current dir is a directory.
    // If dir is a directory, it passes the test and is included in the resulting filtered array.
    // The filtered array, containing only the directory names, is assigned to the languageDirs variable.

    // In summary, this line of code reads the contents of the i18nFolder directory, filters out the non-directory entries, 
    // and assigns the resulting array of language code directory names to the languageDirs variable.

        // Iterate over the language code subdirectories
        const languageDirs = fs.readdirSync(i18nFolder).filter(dir => fs.statSync(path.join(i18nFolder, dir)).isDirectory());
        languageDirs.forEach(languageDir => {
          const languageDirPath = path.join(i18nFolder, languageDir);
          const jsonFiles = fs.readdirSync(languageDirPath).filter(file => file.endsWith('.json'));
      // Rename the JSON files to the language code
      jsonFiles.forEach(jsonFile => {
        const oldPath = path.join(languageDirPath, jsonFile);
        const newPath = path.join(languageDirPath, `${languageDir}.json`);
        fs.renameSync(oldPath, newPath);
      });
    });

    console.log('Translation files renamed successfully');
  } catch (error) {
    console.error('Error extracting translations:', error);
    throw error;
  }
}
// **********************************************************************

// this route reads each JSON file, extracts the language code from the file name, parses the JSON content, 
// and adds the parsed translations to the translations object using the language code as the key. 
// Empty translation files are skipped, and any parsing errors are logged. 
// Finally, the translations object is sent as the JSON response.

// create translationFiles variable to read i18nfolder and filters through all files that ends with .json
// An empty object called translations is created to store the parsed translations.
// The forEach loop iterates over each file in the translationFiles array.
// For each file, the following steps are performed:
// The languageCode is extracted from the file name by splitting the file name at the dot (.) and taking the first part. For example, if the file name is en.json, the languageCode will be en.
// The filePath is constructed by resolving the absolute path to the file using path.resolve(i18nFolder, file).
// The fileContent is read synchronously from the file using fs.readFileSync(filePath, 'utf8'), which returns the content of the file as a string.
// The code then checks if the fileContent is not empty by trimming any whitespace and comparing it to an empty string (fileContent.trim() !== '').
// If the fileContent is not empty, the code attempts to parse the JSON content using JSON.parse(fileContent). This converts the JSON string into a JavaScript object.
// If the parsing is successful, the parsed translations are assigned to the translations object using the languageCode as the key. For example, translations['en'] will contain the parsed translations for the English language.
// If an error occurs during the JSON parsing, it is caught using a try-catch block, and the error is logged to the console using console.error.
// If the fileContent is empty (i.e., the file is empty or contains only whitespace), a warning message is logged to the console using console.warn, indicating that the empty translation file is being skipped.
// After processing all the files, the translations object, which now contains the parsed translations for each language, is sent as the JSON response using res.json(translations).
// If any error occurs during the entire process (downloading translations, extracting files, or processing files), it is caught in the outer catch block, logged to the console using console.error, and a 500 status code with an error message is sent as the JSON response.

app.get('/translations', async (req, res) => {
  try {
    await downloadTranslations();
    await extractTranslations();

    const i18nFolder = path.resolve(__dirname, 'translations');
    const translationFiles = fs.readdirSync(i18nFolder).filter(file => file.endsWith('.json'));
    const translations = {};

//     fs.readFileSync is a method from the Node.js fs module that reads the contents of a file synchronously.
// It takes the file path (filePath) as an argument and returns the contents of the file as a string or a buffer.
// In this case, it is used to read the contents of each translation file.
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