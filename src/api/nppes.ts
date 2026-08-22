export interface NpiResult {
  number: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  type: 'individual' | 'organization';
  primaryTaxonomy?: string;
}

export async function verifyNpi(npi: string): Promise<NpiResult> {
  // Try direct fetch first
  const response = await fetch(`/api/nppes/?version=2.1&number=${npi}`);
  if (!response.ok) {
    throw new Error('Failed to reach NPPES registry');
  }

  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    throw new Error('NPI not found in registry');
  }

  const result = data.results[0];
  const isIndividual = result.enumeration_type === 'NPI-1';
  
  let primaryTaxonomy = '';
  if (result.taxonomies) {
    const primary = result.taxonomies.find((t: any) => t.primary === true);
    if (primary) primaryTaxonomy = primary.desc;
  }

  return {
    number: result.number,
    type: isIndividual ? 'individual' : 'organization',
    firstName: isIndividual ? result.basic.first_name : undefined,
    lastName: isIndividual ? result.basic.last_name : undefined,
    organizationName: !isIndividual ? result.basic.organization_name : undefined,
    primaryTaxonomy
  };
}
