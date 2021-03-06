#!/usr/bin/env node
'use strict';
let program = require('commander');
let fs = require('fs');
let unflatten = require('flat').unflatten;
let flatten = require('flat');
let chalk = require('chalk');
let csvParser = require('csv-parser');
let mkdirp = require('node-mkdirp');
let prettyJSON = require('pretty-json-stringify');

const BINARY_ENCODING = 'binary';
const UTF_8_ENCODING = 'utf-8';
const CHARACTER_SPACING = 4;
const DEFAULT_TRANSLATION_KEY_COLUMN = 'SYSTEM_KEY';
const DEFAULT_OUTPUT_DIR = 'app/locales/';
const DEFAULT_OUTPUT_FILE = 'translations.js';

let translationKeyColumnName = DEFAULT_TRANSLATION_KEY_COLUMN;
let localeColumnNames = {};
let excludedLocales = [];
let outputDir = DEFAULT_OUTPUT_DIR;
let outputFile = DEFAULT_OUTPUT_FILE;

program
	.version('1.0.0')
	.option('--inputFile [inputFile]', 'The csv file containing the translations.')
	.option('--outputDir [outputDir]', 'The output directory to create the locale translation files. Defaults to app/locales')
	.option('--outputFile [ouptutFile]', 'The output file generate for each locale. Defaults to translations.js')
	.option('--translationKeyColumnName [translationKeyColumnName]',
		'The column name for the translation key. Defaults to SYSTEM_KEY')
	.option('--localeColumnNames [localeColumnNames]', 'The column names for each locales. Use the locale name as the key. ' +
		'Defaults to {\\\"en\\\:\\\"EN\\\",\\\"fr\\\": \\\"FR\\\"}')
	.option('--excludedLocales [excludedLocales]', 'Comma separated string of excluded locales')
	.parse(process.argv);

if (!program.inputFile) {
	throw new Error(chalk.red('The input file must be specified.'));
}

if (program.outputDir) {
	outputDir = program.outputDir;
}

if (program.outputFile) {
	outputFile = program.outputFile;
}

if (program.translationKeyColumnName) {
	translationKeyColumnName = program.translationKeyColumnName;
}

if (program.localeColumnNames) {
	localeColumnNames = JSON.parse(program.localeColumnNames);
}

if (program.excludedLocales) {
	excludedLocales = program.excludedLocales.split(',');
}

importTranslations(program.inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames, excludedLocales);

/**
 * Import translations
 * @param inputFile The input file
 * @param outputDir The output directory
 * @param outputFile The output file
 * @param translationKeyColumnName the translation key column name
 * @param localeColumnNames The column names for the locales
 * @param excludedLocales The locales excluded from importing.
 */
function importTranslations(inputFile, outputDir, outputFile, translationKeyColumnName, localeColumnNames, excludedLocales) {

	console.log(chalk.blue('Importing translations using the following options:'));
	console.log();
	console.log(chalk.blue(`inputFile: ${inputFile}`));
	console.log(chalk.blue(`outputDir: ${outputDir}`));
	console.log(chalk.blue(`outputFile: ${outputFile}`));
	console.log(chalk.blue(`translationKeyColumnName: ${translationKeyColumnName}`));
	console.log(chalk.blue(`localeColumnNames: ${JSON.stringify(localeColumnNames)}`));
	console.log();

	// get the existing translation map.
	let translationsMap = getTranslationMap(outputDir, outputFile);

	console.log(`Importing translations from: ${inputFile}`);

	fs.createReadStream(inputFile, {
		encoding: BINARY_ENCODING
	}).pipe(csvParser())
		.on('headers', (headers) => {
			let hasTranslationKey = false;
			for (let i = 0, len = headers.length; i < len; i++) {
				if (headers[i] !== translationKeyColumnName) {
					// if locale map not created it.
					if (!translationsMap[getLocaleFromColumnName(headers[i], localeColumnNames)]) {
						translationsMap[getLocaleFromColumnName(headers[i], localeColumnNames)] = {};
					}
				} else {
					hasTranslationKey = true;
				}
			}
			if (!hasTranslationKey) {
				throw new Error(chalk.red('There is no translation key column defined.'));
			}
		})
		.on('data', (data) => {
			for (let locale in translationsMap) {
				if (translationsMap.hasOwnProperty(locale)) {
					if (data[translationKeyColumnName]) {
						translationsMap[locale][data[translationKeyColumnName]] =
							data[getColumnNameFromLocale(locale, localeColumnNames)]
					}
				}
			}
		})
		.on('end', () => {
			generateTranslationFiles(translationsMap, outputDir, outputFile, excludedLocales);
			console.log();
			console.log(chalk.green('Successfully imported translations.'));
		});

}

/**
 * Returns the locale from the column name.
 * @param columnName The column name.
 * @param localeColumnNames The map of locale column names mapping.
 */
function getLocaleFromColumnName(columnName, localeColumnNames) {
	if (localeColumnNames) {
		for (let locale in localeColumnNames) {
			if (localeColumnNames.hasOwnProperty(locale) && columnName === localeColumnNames[locale]) {
				return locale;
			}
		}
	}
	return columnName.toLowerCase();
}

/**
 * Returns the column name for a locale.
 * @param locale The locale
 * @param localeColumnNames The map of locale column names passed by the command line.
 * @returns {string}
 */
function getColumnNameFromLocale(locale, localeColumnNames) {
	let columnName = localeColumnNames[locale];
	if (!columnName) {
		columnName = locale;
	}
	return columnName.toUpperCase();
}

/**
 * Generate translation files from translation map.
 * @param translationsMap The translation map.
 * @param outputDir The output directory.
 * @param outputFile The output file.
 */
function generateTranslationFiles(translationsMap, outputDir, outputFile, excludedLocales) {

	// check if output directory exists, if not create it.
	if (!fs.existsSync(outputDir)) {
		mkdirp(outputDir);
	}

	// loop each locale in translation map
	for (let locale in translationsMap) {
		if (translationsMap.hasOwnProperty(locale)) {
			if (excludedLocales.indexOf(locale) < 0) {

				const localeDirectoryPath = `${outputDir}/${locale}`;

				// check if output directory exists, if not create it.
				if (!fs.existsSync(localeDirectoryPath)) {
					fs.mkdirSync(localeDirectoryPath);
				}

				const localeFilePath = `${outputDir}/${locale}/${outputFile}`;

				console.log(`Generating translations file: ${outputDir}${locale}/${outputFile}`);

				if (fs.existsSync(localeFilePath)) {
					fs.unlinkSync(localeFilePath);
				}

				fs.writeFileSync(localeFilePath, '/* eslint quotes: 0 */\n', UTF_8_ENCODING);
				fs.appendFileSync(localeFilePath, '/* eslint max-len: 0 */\n', UTF_8_ENCODING);
				fs.appendFileSync(localeFilePath, '/* eslint quote-props: 0 */\n', UTF_8_ENCODING);
				fs.appendFileSync(localeFilePath, '', UTF_8_ENCODING);

				let unflattenJSON = unflatten(translationsMap[locale]);

				fs.appendFileSync(localeFilePath,
					`export default ${prettyJSON(unflattenJSON, {
						spaceBeforeColon: '',
						shouldExpand: () => {
							return true;
						}
					})};`, UTF_8_ENCODING);


			} else {
				console.log(`Excluding locale: ${locale}`);
			}
		}
	}
}

/**
 * Reads all transitions files returns a nested JSON object where the
 * first level key is the locale and second level key is the translation key ex:
 * {
 * 	"en": {
 * 		"component1.label.field1": "value"
 * 	},
 * 	"fr": {
 * 		"component1.label.field1": "value [fr]"
 * 	}
 * }
 * @param inputDir The input directory
 * @param inputFile The input file.
 * @returns {Object}
 */
function getTranslationMap(inputDir, inputFile) {
	let locales = getLocales(inputDir);
	let translationsMap = {};
	// loop through each locale and retrieve the translations file.

	locales.forEach(function (locale) {
		let translationFilePath = `${inputDir}${locale}/${inputFile}`;

		console.log(`Getting existing translations from: ${translationFilePath}`);

		// if there no transition file but a locale leave  it blank.
		if (fs.existsSync(translationFilePath)) {
			let data = fs.readFileSync(translationFilePath, UTF_8_ENCODING);
			translationsMap[locale] = getFlattenTranslations(data);
		} else {
			translationsMap[locale] = {};
		}
	});
	return translationsMap;
}

/**
 * Returns the flat version of the translations from the translation data.
 * @param translationData The translations
 * @returns {object}
 */
function getFlattenTranslations(translationData) {
	// flatten JSON object.
	let flattenTranslations = flatten(getTranslations(translationData));
	if (!flattenTranslations) {
		throw new Error('Unable to flatten the translations.');
	}
	return flattenTranslations;
}

/**
 * Returns the translations from the translations data
 * @param translationsData The translations data.
 */
function getTranslations(translationsData) {
	// find where the translations JSON starts.
	let translationsStartIndex = translationsData.indexOf('{');
	// find where the translations JSON ends.
	let translationsEndIndex = translationsData.lastIndexOf('}');
	if (translationsStartIndex < 0 || translationsEndIndex < 0) {
		throw new Error('Unable to parse the translations.');
	}
	// Parse JSON string
	let translations = JSON.parse(translationsData.substring(translationsStartIndex, translationsEndIndex + 1));
	if (!translations) {
		throw new Error('Unable to parse the translations.');
	}
	return translations;
}

/**
 * Returns the list of locales based on the ember-i18n file directory.
 * @returns {Array}
 */
function getLocales(inputDir) {
	// loop throught the list of subdirectories in app/locales
	return fs.readdirSync(inputDir).filter(function (file) {
		return fs.statSync(inputDir + file).isDirectory();
	});
}
