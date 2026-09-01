"use client";

import { useEffect } from 'react';

export default function CopyAttribution() {
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      
      // If no selection or it's a short string (like a single CPT code), 
      // let the default copy happen normally to not annoy legitimate users.
      if (!selection || selection.toString().length < 100) {
        return;
      }

      e.preventDefault();

      const originalText = selection.toString();
      const pageUrl = window.location.href;
      
      // 1. Plain text payload (for pasting into notepad, basic inputs)
      const textAttribution = `\n\n---\nSource: ClaimPilot - The Ultimate Medical Coding Assistant\nRead the full article at: ${pageUrl}`;
      e.clipboardData?.setData('text/plain', originalText + textAttribution);

      // 2. HTML payload (for pasting into WordPress, Word, Google Docs)
      // This preserves their formatting but sneaks in a real SEO backlink!
      try {
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const div = document.createElement('div');
          div.appendChild(range.cloneContents());
          
          const htmlAttribution = `<br><br><hr><p>Source: <strong>ClaimPilot - The Ultimate Medical Coding Assistant</strong><br>Read the full article at: <a href="${pageUrl}">${pageUrl}</a></p>`;
          e.clipboardData?.setData('text/html', div.innerHTML + htmlAttribution);
        }
      } catch (err) {
        console.error('Failed to append HTML attribution', err);
      }
    };

    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  return null; // Silent tracker, renders nothing to the DOM
}
