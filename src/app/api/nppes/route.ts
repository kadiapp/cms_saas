import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const number = searchParams.get('number');
  const version = searchParams.get('version') || '2.1';

  if (!number) {
    return NextResponse.json({ error: 'NPI number is required' }, { status: 400 });
  }

  try {
    // CMS NPPES API endpoint
    const url = `https://npiregistry.cms.hhs.gov/api/?version=${version}&number=${number}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Ensure we don't cache stale registry data for too long
      next: { revalidate: 3600 } 
    });

    if (!response.ok) {
      console.error(`NPPES API returned ${response.status}`);
      return NextResponse.json(
        { error: 'Failed to fetch from NPPES registry' }, 
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Add CORS headers so the client can read it
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      }
    });

  } catch (error) {
    console.error('NPPES proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error while reaching NPPES' },
      { status: 500 }
    );
  }
}
