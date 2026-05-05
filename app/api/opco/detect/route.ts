import { NextResponse } from 'next/server'
import { detectOpco } from '@/lib/opco'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const codeNaf = searchParams.get('naf')
  const codeIdcc = searchParams.get('idcc')

  if (!codeNaf && !codeIdcc) {
    return NextResponse.json({ match: null }, { status: 200 })
  }

  const match = await detectOpco({ codeNaf, codeIdcc })
  return NextResponse.json({ match })
}
