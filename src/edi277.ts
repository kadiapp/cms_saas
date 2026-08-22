/**
 * Phase 3: EDI 277CA Scaffolding Parser
 * A simple parser that extracts acceptance/rejection statuses from a raw EDI 277CA payload.
 */

export interface Edi277Result {
  claimId: string | null;
  status: 'Accepted' | 'Rejected' | 'Unknown';
  messages: string[];
}

export function parse277CA(ediData: string): Edi277Result {
  const result: Edi277Result = {
    claimId: null,
    status: 'Unknown',
    messages: []
  };

  // Replace newlines and split by standard segment terminator (~)
  const segments = ediData.replace(/\n|\r/g, '').split('~');

  for (const seg of segments) {
    const fields = seg.split('*');
    if (!fields[0]) continue;

    // TRN segment typically holds the Patient/Claim trace number in 277CA
    if (fields[0] === 'TRN' && fields[1] === '2') {
      result.claimId = fields[2];
    }

    // STC segment holds the status code
    if (fields[0] === 'STC') {
      const statusCategory = fields[1]?.split(':')[0]; // e.g. A3 (Rejected), A7 (Rejected), A1 (Accepted)

      if (statusCategory === 'A1' || statusCategory === 'A2') {
        result.status = 'Accepted';
        result.messages.push('Claim Accepted by Clearinghouse/Payer');
      } else {
        result.status = 'Rejected';
        // In a real parser, we would map the exact Claim Status Category Codes (CSCC) 
        // to human-readable strings. For now, we mock it based on the payload.
        result.messages.push(`Rejection Code: ${fields[1] || 'Unknown'} - ${fields[12] || 'Please review claim details.'}`);
      }
    }
  }

  // Fallback simulation for testing if the user drops a generic text file instead of real EDI
  if (result.status === 'Unknown' && ediData.toLowerCase().includes('reject')) {
    result.status = 'Rejected';
    result.messages.push('Simulated Rejection: Missing subscriber information.');
  }

  return result;
}
