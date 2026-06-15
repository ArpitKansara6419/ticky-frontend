import fs from 'fs';

const frontendPagePath = 'c:/Users/AimBizit/Desktop/DestinationProject/ticky-frontend/src/pages/EngineerPayoutPage.jsx';
const content = fs.readFileSync(frontendPagePath, 'utf8');
const lines = content.split('\n');

console.log('Searching for calculateEngineerPayoutFrontend calls...');
lines.forEach((line, index) => {
  const lineNum = index + 1;
  if (line.includes('calculateEngineerPayoutFrontend')) {
    console.log(`Line ${lineNum}: ${line.trim()}`);
  }
});
