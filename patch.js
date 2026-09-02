
const fs = require('fs');
const file = 'src/app/(saas)/app/coding-assistant/page.tsx';
let content = fs.readFileSync(file, 'utf8');

const trackHelper = \  const trackEvent = (eventName: string) => {
    if (typeof window !== 'undefined' && (window as any).clarity) {
      (window as any).clarity('event', eventName);
    }
  };\;

content = content.replace(
  /export default function CodingAssistant\\(\\) \\{\\s*const \\[activeTab/,
  'export default function CodingAssistant() {\\n' + trackHelper + '\\n\\n  const [activeTab'
);

content = content.replace(/const handleNpiSearch = async \\(e\\?: React\\.FormEvent, directNpi\\?: string\\) => \\{/, 'const handleNpiSearch = async (e?: React.FormEvent, directNpi?: string) => {\\n    trackEvent(\\'npi_search_clicked\\');');
content = content.replace(/const handleDictSearch = async \\(e: React\\.FormEvent\\) => \\{/, 'const handleDictSearch = async (e: React.FormEvent) => {\\n    trackEvent(\\'dictionary_search_clicked\\');');
content = content.replace(/const handleNcciCheck = async \\(e: React\\.FormEvent\\) => \\{/, 'const handleNcciCheck = async (e: React.FormEvent) => {\\n    trackEvent(\\'ncci_search_clicked\\');');
content = content.replace(/const handleMedNecCheck = async \\(e: React\\.FormEvent\\) => \\{/, 'const handleMedNecCheck = async (e: React.FormEvent) => {\\n    trackEvent(\\'mednec_search_clicked\\');');

fs.writeFileSync(file, content);

