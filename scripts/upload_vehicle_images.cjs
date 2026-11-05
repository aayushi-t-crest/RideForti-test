const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://labmrcabiongzugvwghs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhYm1yY2FiaW9uZ3p1Z3Z3Z2hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MTQ2MjEsImV4cCI6MjEwOTE5MDYyMX0.x8qUWaJeEBucBrUGz9fBtOCqOIiH0H4tJfgNzKkO2Ek';

const supabase = createClient(supabaseUrl, supabaseKey);

const uploads = [
  { file: 'src/assets/suv-black-plus.png', dest: 'vehicles/suv-black-plus-1768945721972.png' },
  { file: 'src/assets/suv-black.png', dest: 'vehicles/sedan-black-1768945738589.png' },
  { file: 'src/assets/suv-black-plus.png', dest: 'vehicles/sedan-black-plus-1768945804830.png' },
  { file: 'src/assets/suv-black-x.png', dest: 'vehicles/sedan-black-x-1768946223510.png' },
];

async function run() {
  for (const item of uploads) {
    const fullPath = path.resolve(__dirname, '..', item.file);
    if (!fs.existsSync(fullPath)) {
      console.log('File not found:', fullPath);
      continue;
    }
    const fileBuffer = fs.readFileSync(fullPath);
    console.log(`Uploading ${item.file} -> ${item.dest}...`);
    const { data, error } = await supabase.storage
      .from('vehicle-images')
      .upload(item.dest, fileBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    if (error) {
      console.error(`Failed ${item.dest}:`, error.message);
    } else {
      console.log(`Success ${item.dest}!`);
    }
  }
}

run();

