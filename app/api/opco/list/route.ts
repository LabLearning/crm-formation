import { NextResponse } from 'next/server'
import { listOpcos } from '@/lib/opco'

export async function GET() {
  const opcos = await listOpcos()
  return NextResponse.json({ opcos })
}
