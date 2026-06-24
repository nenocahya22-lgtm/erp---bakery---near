import * as fs from 'fs';

const content = fs.readFileSync('src/components/WebStoreManagerTab.tsx', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('toast') || line.includes('Toast')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
