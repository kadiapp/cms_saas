import type { ClaimForm } from './types';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Convert MM/DD/YYYY to YYYYMMDD or YYYY-MM-DD to YYYYMMDD
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) return `${parts[2]}${parts[0].padStart(2, '0')}${parts[1].padStart(2, '0')}`;
  }
  return dateStr.replace(/-/g, '');
}

function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  // Convert HH:MM to HHMM
  return timeStr.replace(/:/g, '');
}

export function generate837P(claim: ClaimForm): string {
  const currentDate = new Date();
  const dateStr = currentDate.toISOString().split('T')[0].replace(/-/g, '');
  const timeStr = currentDate.toTimeString().split(' ')[0].replace(/:/g, '').substring(0, 4);

  // Use the user's EDI settings
  const submitterName = claim.submitterName || 'SUBMITTER';
  const submitterId = claim.submitterId || 'SUBMITTER123';
  const receiverId = claim.receiverId || 'RECEIVER456';
  const controlNumber = '000000001';

  let edi = '';
  
  // Envelope
  edi += `ISA*00*          *00*          *ZZ*${submitterId.padEnd(15, ' ')}*ZZ*${receiverId.padEnd(15, ' ')}*${dateStr.substring(2)}*${timeStr}*^*00501*${controlNumber}*0*T*:~\n`;
  edi += `GS*HC*${submitterId}*${receiverId}*${dateStr}*${timeStr}*1*X*005010X222A1~\n`;
  edi += `ST*837*0001*005010X222A1~\n`;
  edi += `BHT*0019*00*0123*${dateStr}*${timeStr}*CH~\n`;

  // Loop 1000A Submitter
  edi += `NM1*41*2*${submitterName}*****46*${submitterId}~\n`;
  edi += `PER*IC*${submitterName}*TE*5555555555~\n`;

  // Loop 1000B Receiver
  edi += `NM1*40*2*RECEIVER NAME*****46*${receiverId}~\n`;

  // Loop 2000A Billing Provider
  edi += `HL*1**20*1~\n`;
  
  // Loop 2010AA Billing Provider Name
  edi += `NM1*85*1*${claim.billingProviderName || ''}*****XX*${claim.billingNpi || ''}~\n`;
  if (claim.billingProviderAddress) {
    edi += `N3*${claim.billingProviderAddress}~\n`;
    edi += `N4*${claim.billingProviderCity || ''}*${claim.billingProviderState || ''}*${claim.billingProviderZip || ''}~\n`;
  }
  // Tax ID (Box 25)
  if (claim.federalTaxId) {
    const taxType = claim.taxIdType === 'SSN' ? 'SY' : 'EI';
    edi += `REF*${taxType}*${claim.federalTaxId.replace(/-/g, '')}~\n`;
  }
  
  // Loop 2000B Subscriber
  edi += `HL*2*1*22*0~\n`;
  
  // Loop 2010BA Subscriber Name
  const subLastName = claim.insuredLastName || claim.patientLastName || '';
  const subFirstName = claim.insuredFirstName || claim.patientFirstName || '';
  edi += `NM1*IL*1*${subLastName}*${subFirstName}****MI*${claim.insurerId || ''}~\n`;
  
  const subAddr = claim.insuredAddress || claim.patientAddress;
  if (subAddr) {
    edi += `N3*${subAddr}~\n`;
    edi += `N4*${claim.insuredCity || claim.patientCity || ''}*${claim.insuredState || claim.patientState || ''}*${claim.insuredZip || claim.patientZip || ''}~\n`;
  }
  
  const dobStr = claim.insuredDob || claim.patientDob;
  const sexStr = claim.insuredSex || claim.patientSex;
  if (dobStr || sexStr) {
    const dob = formatDate(dobStr);
    const sex = sexStr === 'M' ? 'M' : sexStr === 'F' ? 'F' : 'U';
    edi += `DMG*D8*${dob}*${sex}~\n`;
  }

  // Loop 2300 Claim Info
  const totalCharge = claim.totalCharge || '0.00';
  edi += `CLM*CLAIM001*${totalCharge}***11:B:1*Y*A*Y*Y~\n`;
  
  // Diagnoses (Box 21)
  const dxCodes = (claim.diagnosisCodes || []).filter(d => d.trim().length > 0);
  if (dxCodes.length > 0) {
    let hiSegment = 'HI';
    dxCodes.forEach((dx, idx) => {
      const cleanDx = dx.replace(/\./g, '');
      hiSegment += `*${idx === 0 ? 'BK' : 'BF'}:${cleanDx}`;
    });
    edi += hiSegment + '~\n';
  }

  // Loop 2400 Service Lines (Box 24)
  let lineCount = 0;
  if (claim.serviceLines) {
    claim.serviceLines.forEach((line) => {
      if (!line.cptCode) return;
      lineCount++;
      edi += `LX*${lineCount}~\n`;
      
      const charge = line.charges || '0.00';
      const units = line.daysUnits || '1';
      let sv1 = `SV1*HC:${line.cptCode}`;
      if (line.modifier1) sv1 += `:${line.modifier1}`;
      if (line.modifier2) sv1 += `:${line.modifier2}`;
      if (line.modifier3) sv1 += `:${line.modifier3}`;
      if (line.modifier4) sv1 += `:${line.modifier4}`;
      
      sv1 += `*${charge}*UN*${units}***`;
      
      // Diagnosis pointer (e.g. "A,B" -> "1:2")
      if (line.diagnosisPointer) {
        // map letters A-L to numbers 1-12
        const ptrs = line.diagnosisPointer.split(/[, ]+/).map(p => {
          const char = p.trim().toUpperCase();
          if (char >= 'A' && char <= 'L') return char.charCodeAt(0) - 64;
          return null;
        }).filter(p => p !== null).join(':');
        
        if (ptrs) sv1 += `${ptrs}`;
      }
      sv1 += '~\n';
      edi += sv1;

      // DTP Date of service
      if (line.dateFrom) {
        if (line.dateTo && line.dateFrom !== line.dateTo) {
          edi += `DTP*472*RD8*${formatDate(line.dateFrom)}-${formatDate(line.dateTo)}~\n`;
        } else {
          edi += `DTP*472*D8*${formatDate(line.dateFrom)}~\n`;
        }
      }
    });
  }

  // Calculate segments
  const segmentCount = edi.split('~').length - 1;
  edi += `SE*${segmentCount}*0001~\n`;
  edi += `GE*1*1~\n`;
  edi += `IEA*1*${controlNumber}~`;

  return edi;
}
