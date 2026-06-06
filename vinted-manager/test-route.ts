import { GET } from './src/app/api/dressing/route'
import { NextRequest } from 'next/server'

async function main() {
  const req = new NextRequest('http://localhost:3000/api/dressing?botAccountName=lenabalvade')
  const res = await GET(req)
  
  console.log('Status:', res.status)
  
  const text = await res.text()
  console.log('Body:', text)
}

main()
