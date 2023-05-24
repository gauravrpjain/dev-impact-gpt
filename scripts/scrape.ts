import { PGChunk, PGEssay, PGJSON } from "@/types";
import axios from "axios";
import fs from "fs";
import { encode } from "gpt-3-encoder";
import csvParser from 'csv-parser';


const CSV_FILE_PATH = 'scripts/disclosure.csv';
const CHUNK_SIZE = 200;

const getEssaysFromCSV = async () => {
  return new Promise((resolve, reject) => {
    const essays = [];

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(csvParser())
      .on('data', (data) => {
        const essay = {
          title: data.title,
          url: data.url,
          date: data.date,
          thanks: data.thanks,
          content: data.content,
          length: data.content.length,
          tokens: encode(data.content).length,
          chunks: [],
        };

        essays.push(essay);
      })
      .on('end', () => {
        resolve(essays);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const chunkEssay = async (essay: PGEssay) => {
  const { title, url, date, thanks, content, ...chunklessSection } = essay;

  let essayTextChunks = [];

  if (encode(content).length > CHUNK_SIZE) {
    const split = content.split('. ');
    let chunkText = '';

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence);
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength.length > CHUNK_SIZE) {
        essayTextChunks.push(chunkText);
        chunkText = '';
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + '. ';
      } else {
        chunkText += sentence + ' ';
      }
    }

    essayTextChunks.push(chunkText.trim());
  } else {
    essayTextChunks.push(content.trim());
  }

  const essayChunks = essayTextChunks.map((text) => {
    const trimmedText = text.trim();

    const chunk = {
      essay_title: title,
      essay_url: url,
      essay_date: date,
      essay_thanks: thanks,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
      embedding: []
    };

    return chunk;
  });

  if (essayChunks.length > 1) {
    for (let i = 0; i < essayChunks.length; i++) {
      const chunk = essayChunks[i];
      const prevChunk = essayChunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += ' ' + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        essayChunks.splice(i, 1);
        i--;
      }
    }
  }

  const chunkedSection = {
    ...essay,
    chunks: essayChunks,
  };

  return chunkedSection;
};


(async () => {
  try {
    const essays = await getEssaysFromCSV();

    const chunkedEssays = await Promise.all(
      essays.map(async (essay) => {
        const chunkedEssay = await chunkEssay(essay);
        return chunkedEssay;
      })
    );

    const json = {
      current_date: '2023-25-24',
      author: 'IFC Disclosure',
      url: 'http://disclosures.ifc.org/',
      length: chunkedEssays.reduce((acc, essay) => acc + essay.length, 0),
      tokens: chunkedEssays.reduce((acc, essay) => acc + essay.tokens, 0),
      essays: chunkedEssays,
    };

    fs.writeFileSync('scripts/pg.json', JSON.stringify(json));
  } catch (error) {
    console.error(error);
  }
})();
