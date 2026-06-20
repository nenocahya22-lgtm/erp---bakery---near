import * as fs from 'fs';
import * as path from 'path';

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach((f) => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory && f !== 'node_modules' && f !== '.git' && f !== 'dist') {
      walkDir(dirPath, callback);
    } else if (!isDirectory) {
      callback(dirPath);
    }
  });
}

const searchStr = 'web store';
const searchResults: string[] = [];

walkDir('src', (filePath) => {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.toLowerCase().includes('data web store') || content.toLowerCase().includes('webstore_data') || content.toLowerCase().includes('webdata')) {
      searchResults.push(filePath);
    }
  }
});

console.log('Search results for "data web store" / "webdata" in src:');
searchResults.forEach((r) => console.log('-', r));
