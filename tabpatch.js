
const fs = require('fs');
const file = 'src/app/(saas)/app/coding-assistant/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/onClick=\{.. => setActiveTab.'dictionary'..\}/g, \onClick={() => changeTab('dictionary')}\);
content = content.replace(/onClick=\{.. => setActiveTab.'ncci'..\}/g, \onClick={() => changeTab('ncci')}\);
content = content.replace(/onClick=\{.. => setActiveTab.'auto'..\}/g, \onClick={() => changeTab('auto')}\);
content = content.replace(/onClick=\{.. => setActiveTab.'mednec'..\}/g, \onClick={() => changeTab('mednec')}\);
content = content.replace(/onClick=\{.. => setActiveTab.'npi'..\}/g, \onClick={() => changeTab('npi')}\);

content = content.replace(/setActiveTab.'auto'.;/g, \changeTab('auto');\);

fs.writeFileSync(file, content);

